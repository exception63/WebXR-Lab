import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { SimpleBody } from "./SimpleBody";

describe("SimpleBody", () => {
  it("applies gravity and remains above the floor", () => {
    const body = new SimpleBody({
      home: new Vector3(0, 1, -2),
      radius: 0.1,
    });

    for (let index = 0; index < 180; index += 1) {
      body.step(1 / 90);
    }

    expect(body.position.y).toBeGreaterThanOrEqual(0.18);
    expect(Number.isFinite(body.velocity.y)).toBe(true);
  });

  it("bounces from horizontal bounds", () => {
    const body = new SimpleBody({
      home: new Vector3(2.19, 1, -2),
      radius: 0.1,
    });
    body.velocity.set(3, 0, 0);
    body.step(1 / 30);

    expect(body.position.x).toBeLessThanOrEqual(2.2);
    expect(body.velocity.x).toBeLessThan(0);
  });

  it("resets invalid state to its home position", () => {
    const home = new Vector3(0.4, 1.2, -2.2);
    const body = new SimpleBody({ home, radius: 0.12 });
    body.position.set(Number.NaN, 0, 0);
    body.step(1 / 60);

    expect(body.position.toArray()).toEqual(home.toArray());
    expect(body.velocity.length()).toBe(0);
  });
});

