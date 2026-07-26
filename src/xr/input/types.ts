export type SpatialInputActionType =
  | "select-start"
  | "select"
  | "select-end"
  | "grab-start"
  | "grab"
  | "grab-end"
  | "source-lost";

export interface SpatialInputAction {
  type: SpatialInputActionType;
  sourceId: string;
  handedness: XRHandedness;
  targetRayMode: XRTargetRayMode;
}

export interface SpatialInputPose {
  timestampSeconds: number;
  sourceId: string;
  handedness: XRHandedness;
  targetRayMode: XRTargetRayMode;
  targetRayMatrix: Float32Array | null;
  gripMatrix: Float32Array | null;
}
