import * as THREE from "three";
import type { ExperienceRuntimeAction } from "../runtime";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import { BoundedPlacementStore } from "./BoundedPlacementStore";

const experienceId = "mr-lab";
const maximumPlacements = 18;

export class MRLab {
  readonly root = new THREE.Group();

  readonly #placements = new BoundedPlacementStore<XRAnchor>(maximumPlacements);
  readonly #reticle: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  readonly #panel = new SpatialTextPanel({
    widthMeters: 0.78,
    heightMeters: 0.2,
    widthPixels: 1024,
    heightPixels: 256,
    renderOrder: 34,
  });
  readonly #instances: THREE.InstancedMesh[] = [];
  readonly #hitMatrix = new THREE.Matrix4();
  readonly #surfaceMatrix = new THREE.Matrix4();
  readonly #objectMatrix = new THREE.Matrix4();
  readonly #localTransform = new THREE.Matrix4();
  readonly #rotation = new THREE.Quaternion();
  readonly #scale = new THREE.Vector3();
  readonly #position = new THREE.Vector3();
  #hasSurface = false;
  #nextShape = 0;

  constructor() {
    this.root.name = "quest-mr-lab";
    this.root.visible = false;
    this.root.add(
      new THREE.HemisphereLight(0xe9fff7, 0x30453d, 2.2),
      new THREE.DirectionalLight(0xffffff, 2.4),
    );

    this.#reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.1, 40),
      new THREE.MeshBasicMaterial({
        color: 0x64ffca,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        side: THREE.DoubleSide,
      }),
    );
    this.#reticle.matrixAutoUpdate = false;
    this.#reticle.renderOrder = 32;
    this.#reticle.visible = false;
    this.root.add(this.#reticle);

    const geometries: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(0.085, 1),
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.ConeGeometry(0.09, 0.18, 12),
    ];
    const colors = [0x63ffd0, 0xffa257, 0x7ecbff];
    for (let index = 0; index < geometries.length; index += 1) {
      const instances = new THREE.InstancedMesh(
        geometries[index],
        new THREE.MeshStandardMaterial({
          color: colors[index],
          emissive: colors[index],
          emissiveIntensity: 0.22,
          metalness: 0.2,
          roughness: 0.32,
        }),
        maximumPlacements,
      );
      instances.count = 0;
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instances.frustumCulled = false;
      this.#instances.push(instances);
      this.root.add(instances);
    }

    this.#panel.mesh.position.set(0, 1.25, -1.15);
    this.root.add(this.#panel.mesh);
    this.#drawPanel("正在等待 Quest MR 会话", "进入透视 AR 后扫描真实表面");
  }

  setActive(active: boolean): void {
    this.root.visible = active;
    if (!active) {
      this.#reticle.visible = false;
      this.#hasSurface = false;
      this.#clearPlacements();
    } else {
      this.#drawPanel("MR 实验场已启动", "缓慢看向桌面或地面，等待薄荷色圆环");
    }
  }

  updateHitPose(matrix: Float32Array | null): void {
    this.#hasSurface = Boolean(matrix);
    this.#reticle.visible = this.root.visible && Boolean(matrix);
    if (!matrix) {
      return;
    }
    this.#hitMatrix.fromArray(matrix);
    this.#reticle.matrix.fromArray(matrix);
    this.#reticle.matrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    this.#reticle.matrixWorldNeedsUpdate = true;
  }

  place(anchor: XRAnchor | null): ExperienceRuntimeAction {
    if (!this.#hasSurface) {
      this.#drawPanel("还没有找到真实表面", "移动视线，让圆环稳定后再捏合");
      return {
        type: "experience-input",
        experienceId,
        detail: "placement-skipped; no-hit-test-result",
      };
    }

    const evicted = this.#placements.add(
      this.#nextShape,
      this.#hitMatrix.elements,
      anchor,
    );
    evicted?.anchor?.delete();
    this.#nextShape = (this.#nextShape + 1) % this.#instances.length;
    this.#refreshInstances();
    this.#drawPanel(
      `已放置 ${this.#placements.size} / ${maximumPlacements}`,
      anchor ? "对象已绑定空间锚点；继续捏合组合装置" : "当前浏览器未提供锚点；对象保持在本次参考空间",
    );

    return {
      type: "experience-progress",
      experienceId,
      detail: `placed=${this.#placements.size}; anchored=${Boolean(anchor)}`,
    };
  }

  updateAnchors(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    let changed = false;
    for (const record of this.#placements.records) {
      if (!record.anchor) {
        continue;
      }
      const pose = frame.getPose(record.anchor.anchorSpace, referenceSpace);
      if (!pose) {
        continue;
      }
      record.surfaceMatrix.set(pose.transform.matrix);
      changed = true;
    }
    if (changed) {
      this.#refreshInstances();
    }
  }

  dispose(): void {
    this.#clearPlacements();
    this.#reticle.geometry.dispose();
    this.#reticle.material.dispose();
    this.#panel.dispose();
    for (const instances of this.#instances) {
      instances.geometry.dispose();
      if (Array.isArray(instances.material)) {
        instances.material.forEach((material) => material.dispose());
      } else {
        instances.material.dispose();
      }
    }
  }

  #refreshInstances(): void {
    const counts = new Array(this.#instances.length).fill(0) as number[];
    for (const record of this.#placements.records) {
      const instanceIndex = counts[record.shapeIndex];
      this.#surfaceMatrix.fromArray(record.surfaceMatrix);
      const height = record.shapeIndex === 2 ? 0.09 : 0.075;
      this.#position.set(0, height, 0);
      this.#rotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (record.id * 1.618) % (Math.PI * 2),
      );
      this.#scale.setScalar(1);
      this.#localTransform.compose(this.#position, this.#rotation, this.#scale);
      this.#objectMatrix.multiplyMatrices(this.#surfaceMatrix, this.#localTransform);
      this.#instances[record.shapeIndex].setMatrixAt(instanceIndex, this.#objectMatrix);
      counts[record.shapeIndex] += 1;
    }

    for (let index = 0; index < this.#instances.length; index += 1) {
      this.#instances[index].count = counts[index];
      this.#instances[index].instanceMatrix.needsUpdate = true;
    }
  }

  #clearPlacements(): void {
    for (const record of this.#placements.clear()) {
      record.anchor?.delete();
    }
    for (const instances of this.#instances) {
      instances.count = 0;
      instances.instanceMatrix.needsUpdate = true;
    }
    this.#nextShape = 0;
  }

  #drawPanel(title: string, subtitle: string): void {
    this.#panel.draw({
      title,
      subtitle,
      accent: "#64ffca",
      background: "#06100de8",
    });
  }
}
