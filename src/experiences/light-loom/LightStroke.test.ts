import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { LightStroke } from "./LightStroke";

describe("LightStroke", () => {
  it("filters points that are too close together", () => {
    const stroke = new LightStroke(0x74cfff);

    expect(stroke.append(new Vector3(0, 0, 0))).toBe(true);
    expect(stroke.append(new Vector3(0.002, 0, 0))).toBe(false);
    expect(stroke.append(new Vector3(0.02, 0, 0))).toBe(true);
    expect(stroke.pointCount).toBe(2);
    stroke.dispose();
  });

  it("stops accepting points at its fixed capacity", () => {
    const stroke = new LightStroke(0xffad68);

    for (let index = 0; index < 192; index += 1) {
      expect(stroke.append(new Vector3(index * 0.02, 0, 0))).toBe(true);
    }
    expect(stroke.append(new Vector3(10, 0, 0))).toBe(false);
    expect(stroke.pointCount).toBe(192);
    stroke.dispose();
  });
});

