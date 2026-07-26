import { describe, expect, it, vi } from "vitest";
import { ReportStore } from "./ReportStore";
import type { CapabilityReport } from "./types";

function baseReport(): CapabilityReport {
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
      viewport: {
        width: 1024,
        height: 768,
        devicePixelRatio: 1,
      },
    },
    webgl: {
      available: true,
      extensions: [],
    },
    webxr: {
      apiAvailable: true,
      immersiveVR: { state: "supported" },
      immersiveAR: { state: "unsupported" },
    },
    spatialWeb: {
      modelElement: false,
      requestImmersive: false,
      immersiveElement: false,
      exitImmersive: false,
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

describe("ReportStore frame collection", () => {
  it("notifies the UI at a low frequency while collecting every frame", () => {
    const store = new ReportStore(baseReport());
    const listener = vi.fn();
    store.addEventListener("change", listener);

    for (let frame = 0; frame < 179; frame += 1) {
      store.recordFrame(frame * 11.1);
    }
    expect(listener).not.toHaveBeenCalled();

    store.recordFrame(179 * 11.1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.snapshot.frameMetrics.sampleCount).toBe(179);
  });

  it("keeps a fixed-capacity frame sample buffer", () => {
    const store = new ReportStore(baseReport());

    for (let frame = 0; frame < 2_161; frame += 1) {
      store.recordFrame(frame * 11.1);
    }

    expect(store.snapshot.frameMetrics.sampleCount).toBe(1_800);
  });
});

