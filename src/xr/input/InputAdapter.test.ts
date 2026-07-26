import { describe, expect, it } from "vitest";
import {
  adaptXRInputAction,
  semanticTypeForXRInteraction,
  sourceLostAction,
} from "./InputAdapter";

describe("InputAdapter", () => {
  it("maps WebXR select and squeeze events to stable semantic actions", () => {
    expect(semanticTypeForXRInteraction("selectstart")).toBe("select-start");
    expect(semanticTypeForXRInteraction("selectend")).toBe("select-end");
    expect(semanticTypeForXRInteraction("squeezestart")).toBe("grab-start");
    expect(semanticTypeForXRInteraction("squeezeend")).toBe("grab-end");
  });

  it("keeps source identity without depending on array position", () => {
    const action = adaptXRInputAction("selectstart", "input-07", {
      handedness: "left",
      targetRayMode: "transient-pointer",
    });

    expect(action).toEqual({
      type: "select-start",
      sourceId: "input-07",
      handedness: "left",
      targetRayMode: "transient-pointer",
    });
  });

  it("creates an explicit source-lost action", () => {
    expect(
      sourceLostAction("input-02", {
        handedness: "right",
        targetRayMode: "tracked-pointer",
      }),
    ).toMatchObject({ type: "source-lost", sourceId: "input-02" });
  });
});

