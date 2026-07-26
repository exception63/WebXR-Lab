import * as THREE from "three";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { SpatialInputAction, SpatialInputPose } from "../../xr/input/types";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";
import { TwoHandTransform } from "./TwoHandTransform";

const experienceId = "pocket-universe";

interface PlanetRecord {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  phase: number;
}

export class PocketUniverse implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  #instruction = new SpatialTextPanel({
    widthMeters: 1.52,
    heightMeters: 0.34,
    renderOrder: 31,
  });
  #returnControl = new SpatialTextPanel({
    widthMeters: 0.56,
    heightMeters: 0.17,
    widthPixels: 768,
    heightPixels: 232,
    renderOrder: 32,
  });
  #universe = new THREE.Group();
  #planets: PlanetRecord[] = [];
  #activeSources = new Set<string>();
  #poses = new Map<string, SpatialInputPose>();
  #singlePoint = new THREE.Vector3();
  #previousSinglePoint: THREE.Vector3 | null = null;
  #firstPoint = new THREE.Vector3();
  #secondPoint = new THREE.Vector3();
  #matrix = new THREE.Matrix4();
  #direction = new THREE.Vector3();
  #twoHandTransform = new TwoHandTransform();
  #twoHandBaselineReady = false;

  constructor() {
    this.#instruction.mesh.position.set(0, 1.98, -1.72);
    this.#instruction.draw({
      title: "口袋宇宙",
      subtitle: "单手捏合移动以旋转 · 双手捏合并张合以缩放",
      accent: "#8dffdb",
    });
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });

    this.#universe.position.set(0, 1.34, -2.02);
    const sun = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 3),
      new THREE.MeshStandardMaterial({
        color: 0xffe3a1,
        emissive: 0xffa340,
        emissiveIntensity: 2.4,
        roughness: 0.3,
      }),
    );
    this.#universe.add(sun);

    const planetSpecs = [
      { radius: 0.34, size: 0.035, color: 0x74cfff, speed: 0.72, phase: 0.2 },
      { radius: 0.52, size: 0.052, color: 0xff8278, speed: 0.46, phase: 1.6 },
      { radius: 0.72, size: 0.068, color: 0x8dffdb, speed: 0.28, phase: 3.2 },
      { radius: 0.94, size: 0.048, color: 0xffad68, speed: 0.19, phase: 5.1 },
    ];
    for (const spec of planetSpecs) {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius, 0.0025, 4, 96),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.28,
        }),
      );
      orbit.rotation.x = Math.PI / 2;
      this.#universe.add(orbit);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(spec.size, 12, 8),
        new THREE.MeshStandardMaterial({
          color: spec.color,
          emissive: spec.color,
          emissiveIntensity: 0.3,
          roughness: 0.46,
        }),
      );
      this.#universe.add(mesh);
      this.#planets.push({
        mesh,
        radius: spec.radius,
        speed: spec.speed,
        phase: spec.phase,
      });
    }

    this.root.add(this.#instruction.mesh, this.#returnControl.mesh, this.#universe);
    this.root.visible = false;
  }

  enter(): void {
    this.#activeSources.clear();
    this.#poses.clear();
    this.#resetInteractionBaselines();
    this.#universe.scale.setScalar(1);
    this.#universe.rotation.set(0, 0, 0);
    this.root.visible = true;
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    for (const planet of this.#planets) {
      const angle = planet.phase + timeSeconds * planet.speed;
      planet.mesh.position.set(
        Math.cos(angle) * planet.radius,
        Math.sin(angle * 1.7) * 0.045,
        Math.sin(angle) * planet.radius,
      );
      planet.mesh.rotation.y = timeSeconds * 0.8;
    }
  }

  select(raycaster: THREE.Raycaster): ExperienceRuntimeAction | null {
    if (
      this.root.visible &&
      raycaster.intersectObject(this.#returnControl.mesh, false).length > 0
    ) {
      return {
        type: "hub-returned",
        experienceId,
        detail: `Returned to Hub at universe scale ${this.#universe.scale.x.toFixed(2)}.`,
      };
    }
    return null;
  }

  input(action: SpatialInputAction): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }
    if (action.type === "select-start") {
      this.#activeSources.add(action.sourceId);
      this.#resetInteractionBaselines();
      return {
        type: "experience-input",
        experienceId,
        detail: `Universe manipulation started by ${action.sourceId}; active=${this.#activeSources.size}.`,
      };
    }
    if (action.type === "select-end" || action.type === "source-lost") {
      if (!this.#activeSources.delete(action.sourceId)) {
        return null;
      }
      this.#poses.delete(action.sourceId);
      this.#resetInteractionBaselines();
      return {
        type: "experience-input",
        experienceId,
        detail: `Universe manipulation ended by ${action.sourceId}; active=${this.#activeSources.size}.`,
      };
    }
    return null;
  }

  updateInputPose(pose: SpatialInputPose): void {
    this.#poses.set(pose.sourceId, pose);
    if (!this.root.visible || !this.#activeSources.has(pose.sourceId)) {
      return;
    }
    const activeIds = [...this.#activeSources];
    if (activeIds.length >= 2) {
      const first = this.#poses.get(activeIds[0]);
      const second = this.#poses.get(activeIds[1]);
      if (
        !first ||
        !second ||
        !this.#pointFromPose(first, this.#firstPoint) ||
        !this.#pointFromPose(second, this.#secondPoint)
      ) {
        return;
      }
      if (!this.#twoHandBaselineReady) {
        this.#twoHandBaselineReady = this.#twoHandTransform.begin(
          this.#firstPoint,
          this.#secondPoint,
          this.#universe.scale.x,
          this.#universe.rotation.z,
        );
        return;
      }
      const value = this.#twoHandTransform.update(this.#firstPoint, this.#secondPoint);
      if (value) {
        this.#universe.scale.setScalar(value.scale);
        this.#universe.rotation.z = value.rotationZ;
      }
      return;
    }

    if (!this.#pointFromPose(pose, this.#singlePoint)) {
      return;
    }
    if (this.#previousSinglePoint) {
      const deltaX = this.#singlePoint.x - this.#previousSinglePoint.x;
      const deltaY = this.#singlePoint.y - this.#previousSinglePoint.y;
      this.#universe.rotation.y += deltaX * 3.2;
      this.#universe.rotation.x = THREE.MathUtils.clamp(
        this.#universe.rotation.x - deltaY * 2.4,
        -0.75,
        0.75,
      );
    }
    this.#previousSinglePoint = this.#singlePoint.clone();
  }

  exit(): void {
    this.#activeSources.clear();
    this.#poses.clear();
    this.#resetInteractionBaselines();
    this.root.visible = false;
  }

  dispose(): void {
    this.#universe.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            material.dispose();
          }
        } else {
          object.material.dispose();
        }
      }
    });
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  #pointFromPose(pose: SpatialInputPose, target: THREE.Vector3): boolean {
    if (pose.gripMatrix) {
      this.#matrix.fromArray(pose.gripMatrix);
      target.setFromMatrixPosition(this.#matrix);
      return true;
    }
    if (pose.targetRayMatrix) {
      this.#matrix.fromArray(pose.targetRayMatrix);
      target.setFromMatrixPosition(this.#matrix);
      this.#direction.set(0, 0, -1).transformDirection(this.#matrix);
      target.addScaledVector(this.#direction, 1.25);
      return true;
    }
    return false;
  }

  #resetInteractionBaselines(): void {
    this.#twoHandTransform.reset();
    this.#twoHandBaselineReady = false;
    this.#previousSinglePoint = null;
  }
}

