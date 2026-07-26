import * as THREE from "three";
import {
  CollaborationClient,
  type CollaborationStatus,
} from "../../collaboration/CollaborationClient";
import type { ResonanceState } from "../../collaboration/protocol";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";

const experienceId = "resonance-room";
const colors = [0x64ffca, 0x74cfff, 0xa58cff, 0xff85be, 0xffa257, 0xffdf75];

function sessionActorId(): string {
  const key = "webxr-lab:collaboration-actor";
  const existing = sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const actor = `guest-${crypto.randomUUID().slice(0, 6)}`;
  sessionStorage.setItem(key, actor);
  return actor;
}

export class ResonanceRoom implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  readonly #client = new CollaborationClient(
    `wss://${window.location.hostname}:8444/room`,
    sessionActorId(),
  );
  readonly #instruction = new SpatialTextPanel({
    widthMeters: 1.5,
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
  readonly #core: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  readonly #rings = new THREE.Group();
  #state: ResonanceState = this.#client.state;
  #pulse = 0;

  constructor() {
    this.#core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 3),
      new THREE.MeshStandardMaterial({
        color: colors[0],
        emissive: colors[0],
        emissiveIntensity: 1.4,
        metalness: 0.28,
        roughness: 0.18,
      }),
    );
    this.#core.position.set(0, 1.38, -1.95);

    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.52 + index * 0.18, 0.008 - index * 0.0015, 6, 72),
        new THREE.MeshBasicMaterial({
          color: colors[index],
          transparent: true,
          opacity: 0.5 - index * 0.1,
        }),
      );
      ring.rotation.set(0.45 + index * 0.55, index * 0.72, 0.2);
      ring.userData.speed = index % 2 === 0 ? 1 : -1;
      this.#rings.add(ring);
    }
    this.#rings.position.copy(this.#core.position);

    this.#instruction.mesh.position.set(0, 1.98, -1.72);
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });
    this.#drawPanel();

    this.#client.addEventListener("statechange", this.#handleState);
    this.#client.addEventListener("statuschange", this.#handleStatus);
    this.root.add(
      this.#core,
      this.#rings,
      this.#instruction.mesh,
      this.#returnControl.mesh,
    );
    this.root.visible = false;
  }

  enter(): void {
    this.#pulse = 0;
    this.root.visible = true;
    this.#client.connect();
    this.#drawPanel();
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    const ageSeconds = Math.max(0, (Date.now() - this.#state.updatedAt) / 1000);
    const networkEnergy =
      this.#state.updatedAt === 0 ? 0 : this.#state.energy * Math.exp(-ageSeconds * 1.15);
    this.#pulse = Math.max(0, this.#pulse - 0.035);
    const scale = 1 + networkEnergy * 0.28 + Math.sin(this.#pulse * Math.PI) * 0.18;
    this.#core.scale.setScalar(scale);
    this.#core.rotation.set(timeSeconds * 0.18, timeSeconds * 0.29, 0);
    this.#core.material.emissiveIntensity = 1.1 + networkEnergy * 3.4;
    for (const ring of this.#rings.children) {
      ring.rotation.z += ring.userData.speed * (0.002 + networkEnergy * 0.012);
      ring.scale.setScalar(1 + networkEnergy * 0.12);
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
        detail: `Returned from revision ${this.#state.revision}; network=${this.#client.status}.`,
      };
    }
    if (raycaster.intersectObject(this.#core, false).length === 0) {
      return null;
    }

    this.#pulse = 1;
    this.#client.resonate();
    return {
      type: "experience-input",
      experienceId,
      detail: `Resonance sent; network=${this.#client.status}; revision=${this.#state.revision}.`,
    };
  }

  exit(): void {
    this.root.visible = false;
    this.#client.disconnect();
  }

  dispose(): void {
    this.exit();
    this.#client.removeEventListener("statechange", this.#handleState);
    this.#client.removeEventListener("statuschange", this.#handleStatus);
    this.#core.geometry.dispose();
    this.#core.material.dispose();
    this.#rings.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  readonly #handleState = (): void => {
    this.#state = this.#client.state;
    const color = colors[this.#state.colorIndex % colors.length];
    this.#core.material.color.setHex(color);
    this.#core.material.emissive.setHex(color);
    for (const ring of this.#rings.children) {
      if (ring instanceof THREE.Mesh && ring.material instanceof THREE.MeshBasicMaterial) {
        ring.material.color.setHex(color);
      }
    }
    this.#pulse = 1;
    this.#drawPanel();
  };

  readonly #handleStatus = (): void => {
    this.#drawPanel();
  };

  #drawPanel(): void {
    const labels: Record<CollaborationStatus, string> = {
      connected: "局域网已连接",
      connecting: "正在连接 Mac 房间",
      offline: "单机降级",
    };
    this.#instruction.draw({
      title: `共振室 · ${labels[this.#client.status]}`,
      subtitle:
        this.#client.status === "connected"
          ? `注视核心并捏合 · 所有设备同步 · REV ${this.#state.revision}`
          : "仍可单机触发；Mac WSS 恢复后会自动重连",
      accent:
        this.#client.status === "connected"
          ? "#64ffca"
          : this.#client.status === "connecting"
            ? "#ffad68"
            : "#74cfff",
    });
  }
}
