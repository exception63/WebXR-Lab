import * as THREE from "three";
import type { ExperienceRuntimeAction } from "../experiences/runtime";
import { MRLab } from "../experiences/mr-lab/MRLab";
import { ExperienceRuntime } from "./ExperienceRuntime";
import type { SpatialInputAction, SpatialInputPose } from "./input/types";

type FrameObserver = (frame: XRFrame | null, time: number) => void;
export type ProbeSceneAction =
  | {
      type: "exit-save";
      detail: string;
    }
  | ExperienceRuntimeAction;

export class ProbeScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.05, 100);
  readonly renderer: THREE.WebGLRenderer;
  readonly inputRoot = new THREE.Group();

  readonly #environmentRoot = new THREE.Group();
  readonly #vrBackground = new THREE.Color(0x040807);
  readonly #vrFog = new THREE.FogExp2(0x040807, 0.085);
  #core = new THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshPhysicalMaterial>();
  #halo = new THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>();
  #exitControl = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>();
  #experienceRuntime: ExperienceRuntime;
  #mrLab = new MRLab();
  #sessionMode: XRSessionMode | null = null;
  #frameObserver: FrameObserver | null = null;
  #raycaster = new THREE.Raycaster();
  #rayMatrix = new THREE.Matrix4();
  #rayDirection = new THREE.Vector3();
  #pointerX = 0;
  #pointerY = 0;
  #pulse = 0;
  #motionScale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType("local-floor");
    this.renderer.xr.setFramebufferScaleFactor(0.85);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.background = this.#vrBackground;
    this.scene.fog = this.#vrFog;
    this.camera.position.set(0, 1.65, 3.2);
    this.camera.lookAt(0, 1.35, -1.8);

    this.#buildEnvironment();
    this.#buildExitControl();
    this.#experienceRuntime = new ExperienceRuntime(this.scene, this.camera);
    this.scene.add(this.#environmentRoot, this.#mrLab.root, this.inputRoot);

    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.#onPointerMove, { passive: true });
    this.resize();

    this.renderer.setAnimationLoop((time, frame) => {
      this.#animate(time);
      this.#frameObserver?.(frame ?? null, time);
      this.renderer.render(this.scene, this.camera);
    });
  }

  setFrameObserver(observer: FrameObserver | null): void {
    this.#frameObserver = observer;
  }

  pulseCore(): void {
    this.#pulse = 1;
  }

  setExperiencePreferences(framebufferScale: number, reducedMotion: boolean): void {
    if (!this.renderer.xr.isPresenting) {
      this.renderer.xr.setFramebufferScaleFactor(
        THREE.MathUtils.clamp(framebufferScale, 0.6, 1),
      );
    }
    this.#motionScale = reducedMotion ? 0.25 : 1;
  }

  setSessionMode(mode: XRSessionMode | null): void {
    this.#sessionMode = mode;
    const isAR = mode === "immersive-ar";
    this.scene.background = isAR ? null : this.#vrBackground;
    this.scene.fog = isAR ? null : this.#vrFog;
    this.#environmentRoot.visible = !isAR;
    this.renderer.setClearColor(0x000000, isAR ? 0 : 1);
    if (!mode) {
      this.#mrLab.setActive(false);
    }
  }

  setExitControlVisible(visible: boolean): void {
    this.#exitControl.visible = visible;
    const isAR = this.#sessionMode === "immersive-ar";
    this.#experienceRuntime.setImmersiveActive(visible && !isAR);
    this.#mrLab.setActive(visible && isAR);
  }

  async handleSelect(
    targetRayMatrix: Float32Array | null,
    anchor: XRAnchor | null = null,
  ): Promise<ProbeSceneAction | null> {
    if (targetRayMatrix) {
      const exitAction = this.handleExitSelect(targetRayMatrix);
      if (exitAction) {
        return exitAction;
      }
    }
    if (this.#sessionMode === "immersive-ar") {
      return this.#mrLab.place(anchor);
    }
    if (!targetRayMatrix) {
      return null;
    }
    return this.#experienceRuntime.select(targetRayMatrix);
  }

  handleExitSelect(targetRayMatrix: Float32Array): ProbeSceneAction | null {
    return this.#isExitControlHit(targetRayMatrix)
      ? {
          type: "exit-save",
          detail: "Immersive exit control selected; ending session before local save.",
        }
      : null;
  }

  handleInput(action: SpatialInputAction): ExperienceRuntimeAction | null {
    return this.#experienceRuntime.input(action);
  }

  updateInputPose(pose: SpatialInputPose): void {
    this.#experienceRuntime.updateInputPose(pose);
  }

  updateMRHitPose(matrix: Float32Array | null): void {
    this.#mrLab.updateHitPose(matrix);
  }

  updateMRAnchors(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    this.#mrLab.updateAnchors(frame, referenceSpace);
  }

  #isExitControlHit(targetRayMatrix: Float32Array): boolean {
    if (!this.#exitControl.visible) {
      return false;
    }
    this.#rayMatrix.fromArray(targetRayMatrix);
    this.#raycaster.ray.origin.setFromMatrixPosition(this.#rayMatrix);
    this.#rayDirection.set(0, 0, -1).transformDirection(this.#rayMatrix);
    this.#raycaster.ray.direction.copy(this.#rayDirection);
    return this.#raycaster.intersectObject(this.#exitControl, false).length > 0;
  }

  readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.#onPointerMove);
    this.renderer.setAnimationLoop(null);
    this.#exitControl.geometry.dispose();
    this.#exitControl.material.map?.dispose();
    this.#exitControl.material.dispose();
    this.#experienceRuntime.dispose();
    this.#mrLab.dispose();
    this.renderer.dispose();
  }

  #buildEnvironment(): void {
    const hemisphere = new THREE.HemisphereLight(0xc8fff1, 0x102019, 1.3);
    this.#environmentRoot.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xf0fff7, 4.2);
    keyLight.position.set(-2.5, 5, 2);
    this.#environmentRoot.add(keyLight);

    const warmLight = new THREE.PointLight(0xff9f5a, 20, 7, 2);
    warmLight.position.set(2.2, 1.8, -1.4);
    this.#environmentRoot.add(warmLight);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x07100d,
      roughness: 0.86,
      metalness: 0.12,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 96), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.012;
    this.#environmentRoot.add(floor);

    const grid = new THREE.GridHelper(16, 32, 0x4dffca, 0x18342c);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    this.#environmentRoot.add(grid);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8fffd7,
      emissive: 0x126448,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.32,
      transmission: 0.35,
      thickness: 0.9,
      clearcoat: 1,
    });
    this.#core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 4), coreMaterial);
    this.#core.position.set(0, 1.38, -2.05);
    this.#environmentRoot.add(this.#core);

    this.#halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.008, 8, 128),
      new THREE.MeshBasicMaterial({
        color: 0x96ffe0,
        transparent: true,
        opacity: 0.66,
      }),
    );
    this.#halo.position.copy(this.#core.position);
    this.#halo.rotation.x = Math.PI / 2.8;
    this.#environmentRoot.add(this.#halo);

    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.95 + index * 0.23, 0.004, 6, 160),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xff9f5a : 0x3ae7b2,
          transparent: true,
          opacity: 0.28 - index * 0.04,
        }),
      );
      ring.position.copy(this.#core.position);
      ring.rotation.set(0.45 + index * 0.48, index * 0.7, 0.2);
      ring.userData.speed = index % 2 === 0 ? 0.08 + index * 0.03 : -0.11;
      ring.userData.orbitRing = true;
      this.#environmentRoot.add(ring);
    }

    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.8 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.random() * 4.5;
      positions[index * 3 + 2] = -2 + Math.sin(angle) * radius;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xa3ffe4,
        size: 0.014,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      }),
    );
    this.#environmentRoot.add(particles);
  }

  #buildExitControl(): void {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 1024;
    textureCanvas.height = 256;
    const context = textureCanvas.getContext("2d");

    if (context) {
      context.fillStyle = "#12251f";
      context.strokeStyle = "#7affe0";
      context.lineWidth = 10;
      context.beginPath();
      context.roundRect(10, 10, 1004, 236, 56);
      context.fill();
      context.stroke();
      context.fillStyle = "#effff9";
      context.font = '700 62px -apple-system, "PingFang SC", sans-serif';
      context.textAlign = "center";
      context.fillText("退出并保存至 Mac", 512, 116);
      context.fillStyle = "#9bd9c6";
      context.font = '400 34px -apple-system, "PingFang SC", sans-serif';
      context.fillText("注视此按钮并捏合", 512, 178);
    }

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    this.#exitControl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.18),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      }),
    );
    this.#exitControl.position.set(-0.5, 0.76, -1.34);
    this.#exitControl.renderOrder = 30;
    this.#exitControl.visible = false;
    this.scene.add(this.#exitControl);
  }

  #animate(time: number): void {
    const seconds = time / 1000;
    this.#experienceRuntime.update(seconds);
    this.#core.rotation.set(
      seconds * 0.12 * this.#motionScale,
      seconds * 0.2 * this.#motionScale,
      Math.sin(seconds * 0.3 * this.#motionScale) * 0.16,
    );
    this.#halo.rotation.z = seconds * 0.16 * this.#motionScale;
    this.#halo.scale.setScalar(
      1 + Math.sin(seconds * 1.4 * this.#motionScale) * 0.025 * this.#motionScale,
    );

    if (this.#pulse > 0) {
      this.#pulse = Math.max(0, this.#pulse - 0.035);
    }
    const pulseScale = 1 + Math.sin(this.#pulse * Math.PI) * 0.24;
    this.#core.scale.setScalar(pulseScale);
    this.#core.material.emissiveIntensity = 1.35 + this.#pulse * 3.2;

    for (const object of this.#environmentRoot.children) {
      if (object.userData.orbitRing) {
        object.rotation.y += object.userData.speed * 0.01 * this.#motionScale;
      }
    }

    if (!this.renderer.xr.isPresenting) {
      this.camera.position.x += (this.#pointerX * 0.18 - this.camera.position.x) * 0.018;
      this.camera.position.y += (1.65 + this.#pointerY * 0.1 - this.camera.position.y) * 0.018;
      this.camera.lookAt(0, 1.35, -1.8);
    }
  }

  #onPointerMove = (event: PointerEvent): void => {
    this.#pointerX = event.clientX / Math.max(1, window.innerWidth) - 0.5;
    this.#pointerY = 0.5 - event.clientY / Math.max(1, window.innerHeight);
  };
}
