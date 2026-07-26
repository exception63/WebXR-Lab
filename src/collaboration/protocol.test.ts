import { describe, expect, it } from "vitest";
import {
  applyResonance,
  initialResonanceState,
  isResonanceMessage,
  parseResonanceState,
} from "./protocol";

describe("collaboration protocol", () => {
  it("validates bounded resonance messages", () => {
    expect(isResonanceMessage({ type: "resonate", actor: "guest-01" })).toBe(true);
    expect(isResonanceMessage({ type: "resonate", actor: "" })).toBe(false);
    expect(isResonanceMessage({ type: "resonate", actor: "x".repeat(33) })).toBe(false);
  });

  it("advances the authoritative state within energy and palette bounds", () => {
    let state = initialResonanceState;
    for (let index = 0; index < 9; index += 1) {
      state = applyResonance(state, { type: "resonate", actor: "guest" }, 1000 + index);
    }
    expect(state.revision).toBe(9);
    expect(state.colorIndex).toBe(3);
    expect(state.energy).toBe(1);
  });

  it("rejects malformed server snapshots", () => {
    expect(parseResonanceState({ type: "state", revision: "1" })).toBeNull();
    expect(
      parseResonanceState({
        type: "state",
        revision: 2,
        colorIndex: 7,
        energy: 2,
        lastActor: "guest",
        updatedAt: 100,
      }),
    ).toMatchObject({ revision: 2, colorIndex: 1, energy: 1 });
  });
});
