import * as THREE from "three";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { SpatialInputAction, SpatialInputPose } from "../../xr/input/types";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";
import { LightStroke } from "./LightStroke";

const experienceId = "light-loom";
const maximumStrokes = 10;

export class LightLoom implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  #instruction = new SpatialTextPanel({
    widthMeters: 1.42,
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
  #activeStrokes = new Map<string, LightStroke>();
  #strokes: LightStroke[] = [];
  #poseMatrix = new THREE.Matrix4();
  #point = new THREE.Vector3();
  #direction = new THREE.Vector3();
  #weavingFrame = new THREE.Group();

  constructor() {
    this.#instruction.mesh.position.set(0, 1.95, -1.68);
    this.#instruction.draw({
      title: "光之织机",
      subtitle: "捏合并移动手来编织光轨 · 松开完成一笔",
      accent: "#74cfff",
    });
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });

    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.72 + index * 0.24, 0.004, 5, 96),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xffad68 : 0x74cfff,
          transparent: true,
          opacity: 0.2 - index * 0.035,
        }),
      );
      ring.position.set(0, 1.38, -2.08);
      ring.rotation.set(0.28 + index * 0.38, index * 0.7, 0.12);
      ring.userData.speed = index % 2 === 0 ? 0.08 : -0.11;
      this.#weavingFrame.add(ring);
    }

    this.root.add(this.#instruction.mesh, this.#returnControl.mesh, this.#weavingFrame);
    this.root.visible = false;
  }

  enter(): void {
    this.#clearStrokes();
    this.root.visible = true;
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    for (const stroke of this.#strokes) {
      stroke.update(timeSeconds);
    }
    for (const ring of this.#weavingFrame.children) {
      ring.rotation.z += Number(ring.userData.speed) * 0.004;
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
        detail: `Returned to Hub with ${this.#strokes.length} light strokes.`,
      };
    }
    return null;
  }

  input(action: SpatialInputAction): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }
    if (action.type === "select-start") {
      this.#startStroke(action);
      return {
        type: "experience-input",
        experienceId,
        detail: `Light stroke started by ${action.sourceId}; hand=${action.handedness}; ray=${action.targetRayMode}.`,
      };
    }
    if (action.type === "select-end" || action.type === "source-lost") {
      const stroke = this.#activeStrokes.get(action.sourceId);
      if (!stroke) {
        return null;
      }
      this.#activeStrokes.delete(action.sourceId);
      return {
        type: "experience-input",
        experienceId,
        detail: `Light stroke ended by ${action.sourceId}; points=${stroke.pointCount}.`,
      };
    }
    return null;
  }

  updateInputPose(pose: SpatialInputPose): void {
    const stroke = this.#activeStrokes.get(pose.sourceId);
    if (!this.root.visible || !stroke) {
      return;
    }
    if (pose.gripMatrix) {
      this.#poseMatrix.fromArray(pose.gripMatrix);
      this.#point.setFromMatrixPosition(this.#poseMatrix);
      stroke.append(this.#point);
      return;
    }
    if (pose.targetRayMatrix) {
      this.#poseMatrix.fromArray(pose.targetRayMatrix);
      this.#point.setFromMatrixPosition(this.#poseMatrix);
      this.#direction.set(0, 0, -1).transformDirection(this.#poseMatrix);
      this.#point.addScaledVector(this.#direction, 1.25);
      stroke.append(this.#point);
    }
  }

  exit(): void {
    this.#activeStrokes.clear();
    this.root.visible = false;
  }

  dispose(): void {
    this.#clearStrokes();
    for (const ring of this.#weavingFrame.children) {
      if (ring instanceof THREE.Mesh) {
        ring.geometry.dispose();
        if (Array.isArray(ring.material)) {
          for (const material of ring.material) {
            material.dispose();
          }
        } else {
          ring.material.dispose();
        }
      }
    }
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  #startStroke(action: SpatialInputAction): void {
    if (this.#activeStrokes.has(action.sourceId)) {
      return;
    }
    while (this.#strokes.length >= maximumStrokes) {
      const oldest = this.#strokes.shift();
      if (!oldest) {
        break;
      }
      this.root.remove(oldest.points);
      oldest.dispose();
    }
    const color =
      action.handedness === "left"
        ? 0x74cfff
        : action.handedness === "right"
          ? 0xffad68
          : 0x8dffdb;
    const stroke = new LightStroke(color);
    this.#strokes.push(stroke);
    this.#activeStrokes.set(action.sourceId, stroke);
    this.root.add(stroke.points);
  }

  #clearStrokes(): void {
    this.#activeStrokes.clear();
    for (const stroke of this.#strokes) {
      this.root.remove(stroke.points);
      stroke.dispose();
    }
    this.#strokes = [];
  }
}

