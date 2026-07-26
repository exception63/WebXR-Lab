import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { TwoHandTransform } from "./TwoHandTransform";

describe("TwoHandTransform", () => {
  it("scales from the ratio between two pinch points", () => {
    const transform = new TwoHandTransform();
    expect(
      transform.begin(new Vector3(-0.1, 0, 0), new Vector3(0.1, 0, 0), 1, 0),
    ).toBe(true);

    expect(
      transform.update(new Vector3(-0.2, 0, 0), new Vector3(0.2, 0, 0))?.scale,
    ).toBeCloseTo(1.85);
  });

  it("clamps scale to a comfortable range", () => {
    const transform = new TwoHandTransform();
    transform.begin(new Vector3(0, 0, 0), new Vector3(1, 0, 0), 1, 0);

    expect(
      transform.update(new Vector3(0, 0, 0), new Vector3(0.01, 0, 0))?.scale,
    ).toBe(0.42);
    expect(
      transform.update(new Vector3(0, 0, 0), new Vector3(4, 0, 0))?.scale,
    ).toBe(1.85);
  });

  it("rejects an unstable near-zero baseline", () => {
    const transform = new TwoHandTransform();
    expect(
      transform.begin(new Vector3(0, 0, 0), new Vector3(0.01, 0, 0), 1, 0),
    ).toBe(false);
    expect(transform.update(new Vector3(), new Vector3(1, 0, 0))).toBeNull();
  });
});

