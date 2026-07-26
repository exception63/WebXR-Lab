import type { SpatialInputAction, SpatialInputActionType } from "./types";

const eventMap = {
  selectstart: "select-start",
  select: "select",
  selectend: "select-end",
  squeezestart: "grab-start",
  squeeze: "grab",
  squeezeend: "grab-end",
} as const satisfies Record<string, SpatialInputActionType>;

export type XRInteractionEventType = keyof typeof eventMap;

export function semanticTypeForXRInteraction(
  eventType: XRInteractionEventType,
): SpatialInputActionType {
  return eventMap[eventType];
}

export function adaptXRInputAction(
  eventType: XRInteractionEventType,
  sourceId: string,
  source: Pick<XRInputSource, "handedness" | "targetRayMode">,
): SpatialInputAction {
  return {
    type: semanticTypeForXRInteraction(eventType),
    sourceId,
    handedness: source.handedness,
    targetRayMode: source.targetRayMode,
  };
}

export function sourceLostAction(
  sourceId: string,
  source: Pick<XRInputSource, "handedness" | "targetRayMode">,
): SpatialInputAction {
  return {
    type: "source-lost",
    sourceId,
    handedness: source.handedness,
    targetRayMode: source.targetRayMode,
  };
}

