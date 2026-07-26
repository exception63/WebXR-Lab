import { describe, expect, it } from "vitest";
import { parsePreferences, renderProfileScale } from "./ExperiencePreferences";

describe("experience preferences", () => {
  it("respects the operating system reduced-motion preference by default", () => {
    expect(parsePreferences(null, true).reducedMotion).toBe(true);
    expect(parsePreferences(null, false).renderProfile).toBe("balanced");
  });

  it("recovers safely from invalid stored JSON and profile values", () => {
    expect(parsePreferences("{broken", false).renderProfile).toBe("balanced");
    expect(
      parsePreferences(JSON.stringify({ renderProfile: "ultra", guidedMode: false }), false),
    ).toMatchObject({ renderProfile: "balanced", guidedMode: false });
  });

  it("keeps framebuffer scale within the declared comfort profiles", () => {
    expect(renderProfileScale.performance).toBeLessThan(renderProfileScale.balanced);
    expect(renderProfileScale.balanced).toBeLessThan(renderProfileScale.fidelity);
    expect(renderProfileScale.fidelity).toBe(1);
  });
});
