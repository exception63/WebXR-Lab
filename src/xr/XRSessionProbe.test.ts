import { describe, expect, it } from "vitest";
import { optionalFeaturesForMode } from "./XRSessionProbe";

describe("XR session feature profiles", () => {
  it("keeps VR features focused on hands, bounds and rendering", () => {
    const features = optionalFeaturesForMode("immersive-vr");
    expect(features).toContain("hand-tracking");
    expect(features).not.toContain("hit-test");
  });

  it("requests MR capabilities only for immersive AR", () => {
    const features = optionalFeaturesForMode("immersive-ar");
    expect(features).toContain("hit-test");
    expect(features).toContain("anchors");
    expect(features).toContain("plane-detection");
    expect(features).toContain("mesh-detection");
  });
});
