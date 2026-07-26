import { describe, expect, it } from "vitest";
import { GestureSequence } from "./GestureSequence";

describe("GestureSequence", () => {
  it("completes after the configured number of selections", () => {
    const sequence = new GestureSequence(3);

    expect(sequence.advance()).toMatchObject({ step: 1, completed: false });
    expect(sequence.advance()).toMatchObject({ step: 2, completed: false });
    expect(sequence.advance()).toMatchObject({
      step: 3,
      completed: true,
      justCompleted: true,
    });
  });

  it("does not advance beyond completion", () => {
    const sequence = new GestureSequence(1);
    sequence.advance();

    expect(sequence.advance()).toEqual({
      step: 1,
      totalSteps: 1,
      completed: true,
      justCompleted: false,
    });
  });

  it("can be reset for a repeated visit", () => {
    const sequence = new GestureSequence(2);
    sequence.advance();
    sequence.advance();
    sequence.reset();

    expect(sequence.step).toBe(0);
    expect(sequence.completed).toBe(false);
  });
});

