import type { FrameMetrics } from "./types";

export function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const clamped = Math.min(1, Math.max(0, fraction));
  const index = Math.min(sorted.length - 1, Math.ceil(clamped * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function summarizeFrameTimes(values: readonly number[]): FrameMetrics {
  return {
    sampleCount: values.length,
    medianMs: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maximumMs: values.length > 0 ? Math.max(...values) : null,
  };
}
