import { describe, expect, it } from "vitest";
import type { CapabilityReport } from "../probe/types";
import { experienceAvailability, experienceRegistry } from "./registry";

function reportWithCapabilities({
  vr = true,
  ar = false,
  spatialWeb = false,
}: {
  vr?: boolean;
  ar?: boolean;
  spatialWeb?: boolean;
} = {}): CapabilityReport {
  return {
    schemaVersion: 1,
    generatedAt: "2026-07-26T00:00:00.000Z",
    buildId: "test",
    page: {
      url: "https://webxr-lab.test",
      secureContext: true,
      crossOriginIsolated: false,
    },
    browser: {
      userAgent: "test",
      language: "zh-CN",
      platform: "test",
      hardwareConcurrency: 8,
      viewport: { width: 1024, height: 768, devicePixelRatio: 1 },
    },
    webgl: { available: true, extensions: [] },
    webxr: {
      apiAvailable: true,
      immersiveVR: { state: vr ? "supported" : "unsupported" },
      immersiveAR: { state: ar ? "supported" : "unsupported" },
    },
    spatialWeb: {
      modelElement: spatialWeb,
      requestImmersive: spatialWeb,
      immersiveElement: spatialWeb,
      exitImmersive: spatialWeb,
    },
    session: null,
    inputSources: [],
    frameMetrics: {
      sampleCount: 0,
      medianMs: null,
      p95Ms: null,
      maximumMs: null,
    },
    events: [],
  };
}

describe("experience registry", () => {
  it("exposes the gesture prototype when immersive VR is available", () => {
    const gesture = experienceRegistry.find((experience) => experience.id === "gesture-prologue");
    expect(gesture).toBeDefined();
    expect(experienceAvailability(gesture!, reportWithCapabilities())).toBe("available");
  });

  it("exposes the light loom prototype when immersive VR is available", () => {
    const loom = experienceRegistry.find((experience) => experience.id === "light-loom");
    expect(experienceAvailability(loom!, reportWithCapabilities())).toBe("available");
  });

  it("exposes the pocket universe prototype when immersive VR is available", () => {
    const pocketUniverse = experienceRegistry.find(
      (experience) => experience.id === "pocket-universe",
    );
    expect(experienceAvailability(pocketUniverse!, reportWithCapabilities())).toBe("available");
  });

  it("exposes the sound garden as a shared VR prototype", () => {
    const soundGarden = experienceRegistry.find(
      (experience) => experience.id === "sound-garden",
    );
    expect(experienceAvailability(soundGarden!, reportWithCapabilities())).toBe("available");
  });

  it("exposes the resonance room as a shared VR prototype", () => {
    const resonanceRoom = experienceRegistry.find(
      (experience) => experience.id === "resonance-room",
    );
    expect(experienceAvailability(resonanceRoom!, reportWithCapabilities())).toBe("available");
  });

  it("does not expose a device enhancement without its runtime capability", () => {
    const spatialSet = experienceRegistry.find((experience) => experience.id === "spatial-set");
    expect(experienceAvailability(spatialSet!, reportWithCapabilities())).toBe("unsupported");
    expect(
      experienceAvailability(spatialSet!, reportWithCapabilities({ spatialWeb: true })),
    ).toBe("available");
  });

  it("exposes the MR lab only when immersive AR is available", () => {
    const mrLab = experienceRegistry.find((experience) => experience.id === "mr-lab");
    expect(experienceAvailability(mrLab!, reportWithCapabilities())).toBe("unsupported");
    expect(experienceAvailability(mrLab!, reportWithCapabilities({ ar: true }))).toBe("available");
  });
});
