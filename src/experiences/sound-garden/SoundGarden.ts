import * as THREE from "three";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";

const experienceId = "sound-garden";
const maximumVoices = 8;

interface SoundSeed {
  root: THREE.Group;
  orb: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  frequency: number;
  pulseUntil: number;
}

interface ActiveVoice {
  audio: THREE.PositionalAudio;
  oscillator: OscillatorNode;
  envelope: GainNode;
  seed: SoundSeed;
}

export class SoundGarden implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  readonly #camera: THREE.Camera;
  readonly #listener = new THREE.AudioListener();
  readonly #instruction = new SpatialTextPanel({
    widthMeters: 1.48,
    heightMeters: 0.34,
    renderOrder: 31,
  });
  readonly #returnControl = new SpatialTextPanel({
    widthMeters: 0.56,
    heightMeters: 0.17,
    widthPixels: 768,
    heightPixels: 232,
    renderOrder: 32,
  });
  readonly #seeds: SoundSeed[] = [];
  readonly #voices: ActiveVoice[] = [];
  #lastTimeSeconds = 0;

  constructor(camera: THREE.Camera) {
    this.#camera = camera;
    this.#camera.add(this.#listener);
    this.#listener.setMasterVolume(0);

    this.#instruction.mesh.position.set(0, 1.98, -1.72);
    this.#instruction.draw({
      title: "声音花园",
      subtitle: "注视不同颜色的音种并捏合 · 转头辨别声音方向与距离",
      accent: "#74cfff",
    });
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });

    const seedSpecs = [
      { position: [-1.18, 1.12, -2.0], frequency: 196, color: 0x5fffd1 },
      { position: [-0.72, 1.58, -2.3], frequency: 246.94, color: 0x74cfff },
      { position: [-0.24, 1.06, -1.76], frequency: 293.66, color: 0xa58cff },
      { position: [0.3, 1.68, -2.08], frequency: 392, color: 0xff85be },
      { position: [0.82, 1.25, -2.35], frequency: 493.88, color: 0xffa257 },
      { position: [1.22, 1.52, -1.88], frequency: 587.33, color: 0xffdf75 },
    ] as const;

    for (const spec of seedSpecs) {
      const seedRoot = new THREE.Group();
      seedRoot.position.set(spec.position[0], spec.position[1], spec.position[2]);
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.105, 2),
        new THREE.MeshStandardMaterial({
          color: spec.color,
          emissive: spec.color,
          emissiveIntensity: 0.62,
          metalness: 0.18,
          roughness: 0.24,
        }),
      );
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.005, 5, 48),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.56,
        }),
      );
      halo.userData.halo = true;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.012, 0.34, 7),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.28,
        }),
      );
      stem.position.y = -0.24;
      seedRoot.add(orb, halo, stem);
      const seed = {
        root: seedRoot,
        orb,
        frequency: spec.frequency,
        pulseUntil: 0,
      };
      orb.userData.soundSeed = seed;
      this.#seeds.push(seed);
      this.root.add(seedRoot);
    }

    this.root.add(this.#instruction.mesh, this.#returnControl.mesh);
    this.root.visible = false;
  }

  enter(): void {
    this.#stopAllVoices();
    this.#listener.setMasterVolume(0.76);
    this.root.visible = true;
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    this.#lastTimeSeconds = timeSeconds;
    for (const [index, seed] of this.#seeds.entries()) {
      const activePulse = timeSeconds < seed.pulseUntil;
      const pulse = activePulse
        ? 1 + Math.sin((seed.pulseUntil - timeSeconds) * 28) * 0.13
        : 1 + Math.sin(timeSeconds * 1.25 + index) * 0.035;
      seed.orb.scale.setScalar(pulse);
      seed.orb.rotation.set(timeSeconds * 0.23, timeSeconds * (0.31 + index * 0.02), 0);
      const halo = seed.root.children.find((child) => child.userData.halo);
      if (halo) {
        halo.rotation.z = timeSeconds * (index % 2 === 0 ? 0.32 : -0.27);
      }
    }
  }

  select(raycaster: THREE.Raycaster): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }
    if (raycaster.intersectObject(this.#returnControl.mesh, false).length > 0) {
      return {
        type: "hub-returned",
        experienceId,
        detail: `Returned to Hub after ${this.#voices.length} active spatial voices.`,
      };
    }

    const hits = raycaster.intersectObjects(
      this.#seeds.map((seed) => seed.orb),
      false,
    );
    const seed = hits[0]?.object.userData.soundSeed as SoundSeed | undefined;
    if (!seed) {
      return null;
    }

    seed.pulseUntil = this.#lastTimeSeconds + 0.9;
    this.#requestTone(seed);
    return {
      type: "experience-input",
      experienceId,
      detail: `Spatial tone requested; frequency=${seed.frequency.toFixed(2)}Hz.`,
    };
  }

  exit(): void {
    this.root.visible = false;
    this.#listener.setMasterVolume(0);
    this.#stopAllVoices();
  }

  dispose(): void {
    this.exit();
    this.#camera.remove(this.#listener);
    this.#listener.gain.disconnect();
    for (const seed of this.#seeds) {
      seed.root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  #requestTone(seed: SoundSeed): void {
    const context = this.#listener.context;
    if (context.state === "suspended") {
      void context.resume().then(() => {
        if (this.root.visible) {
          this.#startTone(seed);
        }
      });
      return;
    }
    this.#startTone(seed);
  }

  #startTone(seed: SoundSeed): void {
    while (this.#voices.length >= maximumVoices) {
      this.#stopVoice(this.#voices[0]);
    }

    const context = this.#listener.context;
    const oscillator = context.createOscillator();
    oscillator.type = seed.frequency < 300 ? "sine" : "triangle";
    oscillator.frequency.value = seed.frequency;
    oscillator.detune.value = ((seed.frequency * 10) % 19) - 9;

    const envelope = context.createGain();
    const now = context.currentTime;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    oscillator.connect(envelope);

    const audio = new THREE.PositionalAudio(this.#listener);
    audio.setNodeSource(envelope);
    audio.setRefDistance(0.42);
    audio.setRolloffFactor(1.15);
    audio.panner.panningModel = "HRTF";
    seed.root.add(audio);

    const voice = { audio, oscillator, envelope, seed };
    this.#voices.push(voice);
    oscillator.addEventListener("ended", () => this.#releaseVoice(voice), { once: true });
    oscillator.start(now);
    oscillator.stop(now + 1.2);
  }

  #stopVoice(voice: ActiveVoice): void {
    try {
      voice.oscillator.stop();
    } catch {
      // The oscillator may already have reached its scheduled stop time.
    }
    this.#releaseVoice(voice);
  }

  #releaseVoice(voice: ActiveVoice): void {
    const index = this.#voices.indexOf(voice);
    if (index < 0) {
      return;
    }
    this.#voices.splice(index, 1);
    voice.audio.disconnect();
    voice.seed.root.remove(voice.audio);
    voice.oscillator.disconnect();
    voice.envelope.disconnect();
  }

  #stopAllVoices(): void {
    for (const voice of [...this.#voices]) {
      this.#stopVoice(voice);
    }
  }
}
