import * as THREE from "three";
import { SpatialTextPanel } from "../../xr/SpatialTextPanel";
import type { SpatialInputAction, SpatialInputPose } from "../../xr/input/types";
import type { ExperienceRuntimeAction, SpatialExperience } from "../runtime";
import { SimpleBody } from "./SimpleBody";

const experienceId = "kinetic-workshop";
const maximumThrowSpeed = 4.5;

interface WorkshopObject {
  mesh: THREE.Mesh;
  body: SimpleBody;
}

interface GrabState {
  object: WorkshopObject;
  distance: number;
  lastPosition: THREE.Vector3;
  lastTimestamp: number;
}

export class KineticWorkshop implements SpatialExperience {
  readonly id = experienceId;
  readonly root = new THREE.Group();

  #instruction = new SpatialTextPanel({
    widthMeters: 1.5,
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
  #objects: WorkshopObject[] = [];
  #latestPoses = new Map<string, SpatialInputPose>();
  #grabs = new Map<string, GrabState>();
  #raycaster = new THREE.Raycaster();
  #matrix = new THREE.Matrix4();
  #origin = new THREE.Vector3();
  #direction = new THREE.Vector3();
  #target = new THREE.Vector3();
  #lastUpdateTime: number | null = null;

  constructor() {
    this.#instruction.mesh.position.set(0, 1.96, -1.75);
    this.#instruction.draw({
      title: "动力工坊",
      subtitle: "注视物体并捏合抓取 · 移动手来拖动 · 松开抛掷",
      accent: "#ff8278",
    });
    this.#returnControl.mesh.position.set(0.5, 0.76, -1.34);
    this.#returnControl.draw({
      title: "返回 Hub",
      subtitle: "注视并捏合",
      accent: "#74cfff",
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.62, 0.08, 48),
      new THREE.MeshStandardMaterial({
        color: 0x101a18,
        roughness: 0.72,
        metalness: 0.32,
      }),
    );
    platform.position.set(0, 0.04, -2.2);
    this.root.add(platform, this.#instruction.mesh, this.#returnControl.mesh);

    this.#objects = [
      this.#createObject(
        new THREE.SphereGeometry(0.13, 18, 12),
        0x74cfff,
        new THREE.Vector3(-0.48, 1.1, -2.1),
        0.13,
        0.72,
      ),
      this.#createObject(
        new THREE.BoxGeometry(0.24, 0.24, 0.24, 2, 2, 2),
        0xff8278,
        new THREE.Vector3(0, 1.34, -2.25),
        0.16,
        0.48,
      ),
      this.#createObject(
        new THREE.OctahedronGeometry(0.15, 1),
        0xffad68,
        new THREE.Vector3(0.5, 1.02, -2.05),
        0.15,
        0.6,
      ),
      this.#createObject(
        new THREE.IcosahedronGeometry(0.12, 1),
        0x8dffdb,
        new THREE.Vector3(0.2, 1.62, -2.5),
        0.12,
        0.82,
      ),
    ];
    for (const object of this.#objects) {
      this.root.add(object.mesh);
    }
    this.root.visible = false;
  }

  enter(): void {
    this.#latestPoses.clear();
    this.#grabs.clear();
    this.#lastUpdateTime = null;
    for (const object of this.#objects) {
      object.body.reset();
      object.mesh.position.copy(object.body.position);
    }
    this.root.visible = true;
  }

  update(timeSeconds: number): void {
    if (!this.root.visible) {
      return;
    }
    const delta = this.#lastUpdateTime === null ? 0 : timeSeconds - this.#lastUpdateTime;
    this.#lastUpdateTime = timeSeconds;
    const grabbedObjects = new Set(
      [...this.#grabs.values()].map((grab) => grab.object),
    );
    for (const object of this.#objects) {
      if (!grabbedObjects.has(object)) {
        object.body.step(delta);
        object.mesh.position.copy(object.body.position);
        object.mesh.rotation.x += object.body.velocity.z * delta * 0.7;
        object.mesh.rotation.z -= object.body.velocity.x * delta * 0.7;
      }
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
        detail: "Returned to Hub from the kinetic workshop.",
      };
    }
    return null;
  }

  input(action: SpatialInputAction): ExperienceRuntimeAction | null {
    if (!this.root.visible) {
      return null;
    }
    if (action.type === "select-start" || action.type === "grab-start") {
      const grabbed = this.#beginGrab(action);
      return grabbed
        ? {
            type: "experience-input",
            experienceId,
            detail: `Grabbed workshop object with ${action.sourceId}.`,
          }
        : null;
    }
    if (
      action.type === "select-end" ||
      action.type === "grab-end" ||
      action.type === "source-lost"
    ) {
      const grab = this.#grabs.get(action.sourceId);
      if (!grab) {
        return null;
      }
      this.#grabs.delete(action.sourceId);
      return {
        type: "experience-input",
        experienceId,
        detail: `Released workshop object from ${action.sourceId}; speed=${grab.object.body.velocity.length().toFixed(2)}m/s.`,
      };
    }
    return null;
  }

  updateInputPose(pose: SpatialInputPose): void {
    this.#latestPoses.set(pose.sourceId, pose);
    const grab = this.#grabs.get(pose.sourceId);
    if (!this.root.visible || !grab) {
      return;
    }
    if (!this.#pointFromPose(pose, grab.distance, this.#target)) {
      return;
    }
    const delta = pose.timestampSeconds - grab.lastTimestamp;
    if (delta > 0.001 && delta < 0.2) {
      grab.object.body.velocity
        .copy(this.#target)
        .sub(grab.lastPosition)
        .multiplyScalar(1 / delta)
        .clampLength(0, maximumThrowSpeed);
    }
    grab.object.body.position.copy(this.#target);
    grab.object.mesh.position.copy(this.#target);
    grab.lastPosition.copy(this.#target);
    grab.lastTimestamp = pose.timestampSeconds;
  }

  exit(): void {
    this.#latestPoses.clear();
    this.#grabs.clear();
    this.root.visible = false;
  }

  dispose(): void {
    for (const object of this.#objects) {
      object.mesh.geometry.dispose();
      if (Array.isArray(object.mesh.material)) {
        for (const material of object.mesh.material) {
          material.dispose();
        }
      } else {
        object.mesh.material.dispose();
      }
    }
    this.root.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object !== this.#instruction.mesh &&
        object !== this.#returnControl.mesh &&
        !this.#objects.some((workshopObject) => workshopObject.mesh === object)
      ) {
        object.geometry.dispose();
        if (!Array.isArray(object.material)) {
          object.material.dispose();
        }
      }
    });
    this.#instruction.dispose();
    this.#returnControl.dispose();
  }

  #beginGrab(action: SpatialInputAction): boolean {
    if (this.#grabs.has(action.sourceId)) {
      return false;
    }
    const pose = this.#latestPoses.get(action.sourceId);
    if (!pose?.targetRayMatrix) {
      return false;
    }
    this.#setRay(pose.targetRayMatrix);
    const alreadyGrabbed = new Set(
      [...this.#grabs.values()].map((grab) => grab.object),
    );
    const hit = this.#raycaster
      .intersectObjects(
        this.#objects
          .filter((object) => !alreadyGrabbed.has(object))
          .map((object) => object.mesh),
        false,
      )
      .at(0);
    const object = this.#objects.find((candidate) => candidate.mesh === hit?.object);
    if (!hit || !object) {
      return false;
    }
    object.body.velocity.set(0, 0, 0);
    this.#grabs.set(action.sourceId, {
      object,
      distance: hit.distance,
      lastPosition: object.body.position.clone(),
      lastTimestamp: pose.timestampSeconds,
    });
    return true;
  }

  #setRay(matrix: Float32Array): void {
    this.#matrix.fromArray(matrix);
    this.#origin.setFromMatrixPosition(this.#matrix);
    this.#direction.set(0, 0, -1).transformDirection(this.#matrix);
    this.#raycaster.ray.set(this.#origin, this.#direction);
  }

  #pointFromPose(
    pose: SpatialInputPose,
    distance: number,
    target: THREE.Vector3,
  ): boolean {
    if (pose.targetRayMatrix) {
      this.#matrix.fromArray(pose.targetRayMatrix);
      target.setFromMatrixPosition(this.#matrix);
      this.#direction.set(0, 0, -1).transformDirection(this.#matrix);
      target.addScaledVector(this.#direction, distance);
      return true;
    }
    if (pose.gripMatrix) {
      this.#matrix.fromArray(pose.gripMatrix);
      target.setFromMatrixPosition(this.#matrix);
      return true;
    }
    return false;
  }

  #createObject(
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    home: THREE.Vector3,
    radius: number,
    restitution: number,
  ): WorkshopObject {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.12,
        roughness: 0.28,
        metalness: 0.32,
      }),
    );
    mesh.position.copy(home);
    return {
      mesh,
      body: new SimpleBody({ home, radius, restitution }),
    };
  }
}

