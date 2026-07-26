import type * as THREE from "three";
import type { SpatialInputAction, SpatialInputPose } from "../xr/input/types";

export type ExperienceRuntimeAction =
  | {
      type: "experience-entered";
      experienceId: string;
      detail: string;
    }
  | {
      type: "experience-progress";
      experienceId: string;
      detail: string;
    }
  | {
      type: "experience-completed";
      experienceId: string;
      detail: string;
    }
  | {
      type: "hub-returned";
      experienceId: string;
      detail: string;
    }
  | {
      type: "experience-unavailable";
      experienceId: string;
      detail: string;
    }
  | {
      type: "experience-input";
      experienceId: string;
      detail: string;
    };

export interface SpatialExperience {
  readonly id: string;
  readonly root: THREE.Group;
  enter(): void;
  update(timeSeconds: number): void;
  select(raycaster: THREE.Raycaster): ExperienceRuntimeAction | null;
  input?(action: SpatialInputAction): ExperienceRuntimeAction | null;
  updateInputPose?(pose: SpatialInputPose): void;
  exit(): void;
  dispose(): void;
}
