import * as THREE from "three";
import type {
  ExperienceRuntimeAction,
  SpatialExperience,
} from "../experiences/runtime";
import { SpatialHub } from "../hub/SpatialHub";
import type { SpatialInputAction, SpatialInputPose } from "./input/types";

type ExperienceLoader = (camera: THREE.Camera) => Promise<SpatialExperience>;

const loadGesturePrologueModule = () =>
  import("../experiences/gesture-prologue/GesturePrologue");

const experienceLoaders: Record<string, ExperienceLoader> = {
  "gesture-prologue": async () => {
    const module = await loadGesturePrologueModule();
    return new module.GesturePrologue();
  },
  "light-loom": async () => {
    const module = await import("../experiences/light-loom/LightLoom");
    return new module.LightLoom();
  },
  "kinetic-workshop": async () => {
    const module = await import("../experiences/kinetic-workshop/KineticWorkshop");
    return new module.KineticWorkshop();
  },
  "pocket-universe": async () => {
    const module = await import("../experiences/pocket-universe/PocketUniverse");
    return new module.PocketUniverse();
  },
  "sound-garden": async (camera) => {
    const module = await import("../experiences/sound-garden/SoundGarden");
    return new module.SoundGarden(camera);
  },
  "resonance-room": async () => {
    const module = await import("../experiences/resonance-room/ResonanceRoom");
    return new module.ResonanceRoom();
  },
};

export async function prewarmIntroExperience(): Promise<void> {
  await loadGesturePrologueModule();
}

export class ExperienceRuntime {
  #scene: THREE.Scene;
  #camera: THREE.Camera;
  #hub = new SpatialHub();
  #experiences = new Map<string, SpatialExperience>();
  #activeExperience: SpatialExperience | null = null;
  #loadingExperienceId: string | null = null;
  #immersiveActive = false;
  #raycaster = new THREE.Raycaster();
  #rayMatrix = new THREE.Matrix4();
  #rayDirection = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.#scene = scene;
    this.#camera = camera;
    scene.add(this.#hub.root);
  }

  setImmersiveActive(active: boolean): void {
    this.#immersiveActive = active;
    if (active) {
      this.#activeExperience?.exit();
      this.#activeExperience = null;
      this.#hub.enter();
      return;
    }
    this.#hub.exit();
    this.#loadingExperienceId = null;
    this.#activeExperience?.exit();
    this.#activeExperience = null;
  }

  update(timeSeconds: number): void {
    if (this.#activeExperience) {
      this.#activeExperience.update(timeSeconds);
    } else {
      this.#hub.update(timeSeconds);
    }
  }

  async select(
    targetRayMatrix: Float32Array,
  ): Promise<ExperienceRuntimeAction | null> {
    this.#setRay(targetRayMatrix);
    if (this.#activeExperience) {
      const action = this.#activeExperience.select(this.#raycaster);
      if (action?.type === "hub-returned") {
        this.#activeExperience.exit();
        this.#activeExperience = null;
        this.#hub.enter();
      }
      return action;
    }

    const action = this.#hub.select(this.#raycaster);
    if (action?.type !== "experience-entered") {
      return action;
    }

    if (this.#loadingExperienceId) {
      return {
        type: "experience-unavailable",
        experienceId: action.experienceId,
        detail: `Another experience is loading: ${this.#loadingExperienceId}.`,
      };
    }

    this.#loadingExperienceId = action.experienceId;
    this.#hub.exit();
    try {
      const experience = await this.#loadExperience(action.experienceId);
      if (!this.#immersiveActive || this.#loadingExperienceId !== action.experienceId) {
        return null;
      }
      this.#activeExperience = experience;
      experience.enter();
      return action;
    } catch (error) {
      if (this.#immersiveActive) {
        this.#hub.enter();
      }
      return {
        type: "experience-unavailable",
        experienceId: action.experienceId,
        detail: `Failed to load experience: ${error instanceof Error ? error.message : String(error)}.`,
      };
    } finally {
      if (this.#loadingExperienceId === action.experienceId) {
        this.#loadingExperienceId = null;
      }
    }
  }

  input(action: SpatialInputAction): ExperienceRuntimeAction | null {
    return this.#activeExperience?.input?.(action) ?? null;
  }

  updateInputPose(pose: SpatialInputPose): void {
    this.#activeExperience?.updateInputPose?.(pose);
  }

  dispose(): void {
    this.#hub.dispose();
    for (const experience of this.#experiences.values()) {
      experience.dispose();
    }
    this.#experiences.clear();
  }

  #setRay(targetRayMatrix: Float32Array): void {
    this.#rayMatrix.fromArray(targetRayMatrix);
    this.#raycaster.ray.origin.setFromMatrixPosition(this.#rayMatrix);
    this.#rayDirection.set(0, 0, -1).transformDirection(this.#rayMatrix);
    this.#raycaster.ray.direction.copy(this.#rayDirection);
  }

  async #loadExperience(experienceId: string): Promise<SpatialExperience> {
    const existing = this.#experiences.get(experienceId);
    if (existing) {
      return existing;
    }
    const loader = experienceLoaders[experienceId];
    if (!loader) {
      throw new Error(`No runtime module is registered for ${experienceId}.`);
    }
    const experience = await loader(this.#camera);
    this.#experiences.set(experienceId, experience);
    this.#scene.add(experience.root);
    return experience;
  }
}
