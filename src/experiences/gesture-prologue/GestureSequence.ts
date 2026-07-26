export interface GestureProgress {
  step: number;
  totalSteps: number;
  completed: boolean;
  justCompleted: boolean;
}

export class GestureSequence {
  readonly totalSteps: number;
  #step = 0;

  constructor(totalSteps = 3) {
    if (!Number.isInteger(totalSteps) || totalSteps < 1) {
      throw new Error("GestureSequence requires at least one step.");
    }
    this.totalSteps = totalSteps;
  }

  get step(): number {
    return this.#step;
  }

  get completed(): boolean {
    return this.#step >= this.totalSteps;
  }

  advance(): GestureProgress {
    if (this.completed) {
      return {
        step: this.#step,
        totalSteps: this.totalSteps,
        completed: true,
        justCompleted: false,
      };
    }

    this.#step += 1;
    return {
      step: this.#step,
      totalSteps: this.totalSteps,
      completed: this.completed,
      justCompleted: this.completed,
    };
  }

  reset(): void {
    this.#step = 0;
  }
}

