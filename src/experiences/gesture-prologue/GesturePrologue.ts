import * as THREE from "three";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";
import { GestureSequence } from "./GestureSequence";

const experienceId = "gesture-prologue";
const targetPositions = [
  new THREE.Vector3(0, 1.38, -1.55),
  new THREE.Vector3(-0.46, 1.2, -1.5),
  new THREE.Vector3(0.46, 1.58, -1.5),
] as const;
const targetColors = [0x8dffdb, 0x74cfff, 0xffad68] as const;

export class GesturePrologue implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  #sequence = new GestureSequence(targetPositions.length);
  #target: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  #targetHalo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  #instruction = new SpatialTextPanel({
    widthMeters: 1.32,
    heightMeters: 0.32,
    renderOrder: 31,
  });
  #returnControl = new SpatialTextPanel({
    widthMeters: 0.56,
    heightMeters: 0.17,
    widthPixels: 768,
    heightPixels: 232,
    renderOrder: 32,
  });
  #pulse = 0;

  constructor() {
    this.#target = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 2),
      new THREE.MeshStandardMaterial({
        color: targetColors[0],
        emissive: targetColors[0],
        emissiveIntensity: 0.55,
        roughness: 0.24,
        metalness: 0.18,
      }),
    );
    this.#targetHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.006, 6, 64),
      new THREE.MeshBasicMaterial({
        color: targetColors[0],
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.#targetHalo.position.z = 0.01;

    this.#instruction.mesh.position.set(0, 1.92, -1.62);
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });

    this.root.add(
      this.#target,
      this.#targetHalo,
      this.#instruction.mesh,
      this.#returnControl.mesh,
    );
    this.root.visible = false;
    this.#syncStep();
  }

  enter(): void {
    this.#sequence.reset();
    this.#pulse = 0;
    this.root.visible = true;
    this.#syncStep();
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    this.#target.rotation.set(timeSeconds * 0.38, timeSeconds * 0.52, 0);
    this.#targetHalo.rotation.z = timeSeconds * 0.7;
    const breathe = 1 + Math.sin(timeSeconds * 2.4) * 0.06 + this.#pulse * 0.24;
    this.#target.scale.setScalar(breathe);
    this.#targetHalo.scale.setScalar(1 + Math.sin(timeSeconds * 1.8) * 0.04);
    this.#pulse = Math.max(0, this.#pulse - 0.045);
  }

  select(raycaster: THREE.Raycaster): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }

    if (raycaster.intersectObject(this.#returnControl.mesh, false).length > 0) {
      return {
        type: "hub-returned",
        experienceId,
        detail: `Returned to Hub from gesture step ${this.#sequence.step}/${this.#sequence.totalSteps}.`,
      };
    }

    if (
      !this.#sequence.completed &&
      raycaster.intersectObject(this.#target, false).length > 0
    ) {
      const progress = this.#sequence.advance();
      this.#pulse = 1;
      this.#syncStep();
      if (progress.justCompleted) {
        return {
          type: "experience-completed",
          experienceId,
          detail: `Completed ${progress.totalSteps} gaze-and-pinch targets.`,
        };
      }
      return {
        type: "experience-progress",
        experienceId,
        detail: `Gesture target ${progress.step}/${progress.totalSteps} completed.`,
      };
    }

    return null;
  }

  exit(): void {
    this.root.visible = false;
  }

  dispose(): void {
    this.#target.geometry.dispose();
    this.#target.material.dispose();
    this.#targetHalo.geometry.dispose();
    this.#targetHalo.material.dispose();
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  #syncStep(): void {
    if (this.#sequence.completed) {
      this.#target.visible = false;
      this.#targetHalo.visible = false;
      this.#instruction.draw({
        title: "校准完成",
        subtitle: "三个凝视捏合目标全部命中 · 可返回 Hub",
        accent: "#ffad68",
      });
      return;
    }

    const stepIndex = this.#sequence.step;
    const color = targetColors[stepIndex];
    const accent = `#${color.toString(16).padStart(6, "0")}`;
    this.#target.visible = true;
    this.#targetHalo.visible = true;
    this.#target.position.copy(targetPositions[stepIndex]);
    this.#targetHalo.position.copy(targetPositions[stepIndex]);
    this.#target.material.color.setHex(color);
    this.#target.material.emissive.setHex(color);
    this.#targetHalo.material.color.setHex(color);
    this.#instruction.draw({
      title: `手势序章 · ${stepIndex + 1}/${this.#sequence.totalSteps}`,
      subtitle: "注视发光目标，然后用拇指与食指捏合",
      accent,
    });
  }
}

