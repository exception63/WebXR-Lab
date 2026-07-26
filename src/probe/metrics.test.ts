import { describe, expect, it } from "vitest";
import { percentile, summarizeFrameTimes } from "./metrics";

describe("frame metrics", () => {
  it("returns null percentiles for an empty sample", () => {
    expect(percentile([], 0.95)).toBeNull();
  });

  it("uses nearest-rank percentiles without mutating input", () => {
    const samples = [20, 10, 40, 30];
    expect(percentile(samples, 0.5)).toBe(20);
    expect(percentile(samples, 0.95)).toBe(40);
    expect(samples).toEqual([20, 10, 40, 30]);
  });

  it("summarizes frame samples", () => {
    expect(summarizeFrameTimes([10, 12, 14])).toEqual({
      sampleCount: 3,
      medianMs: 12,
      p95Ms: 14,
      maximumMs: 14,
    });
  });
});
