import { describe, expect, it } from "vitest";
import { canUseSpatialImmersive } from "./SpatialSetController";

describe("spatial immersive capability gate", () => {
  it("accepts the request API when immersive presentation is not explicitly disabled", () => {
    const model = { requestImmersive: async () => undefined };
    expect(canUseSpatialImmersive(model, { immersiveEnabled: true })).toBe(true);
    expect(canUseSpatialImmersive(model, {})).toBe(true);
  });

  it("rejects missing API and a browser that explicitly disables immersion", () => {
    expect(canUseSpatialImmersive({}, { immersiveEnabled: true })).toBe(false);
    expect(
      canUseSpatialImmersive(
        { requestImmersive: async () => undefined },
        { immersiveEnabled: false },
      ),
    ).toBe(false);
  });
});
