export interface PlacementRecord<TAnchor = unknown> {
  id: number;
  shapeIndex: number;
  surfaceMatrix: Float32Array;
  anchor: TAnchor | null;
}

export class BoundedPlacementStore<TAnchor = unknown> {
  readonly #capacity: number;
  #records: PlacementRecord<TAnchor>[] = [];
  #nextId = 1;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Placement capacity must be a positive integer.");
    }
    this.#capacity = capacity;
  }

  get size(): number {
    return this.#records.length;
  }

  get records(): readonly PlacementRecord<TAnchor>[] {
    return this.#records;
  }

  add(
    shapeIndex: number,
    surfaceMatrix: ArrayLike<number>,
    anchor: TAnchor | null,
  ): PlacementRecord<TAnchor> | null {
    const evicted = this.#records.length === this.#capacity ? this.#records.shift()! : null;
    this.#records.push({
      id: this.#nextId,
      shapeIndex,
      surfaceMatrix: new Float32Array(surfaceMatrix),
      anchor,
    });
    this.#nextId += 1;
    return evicted;
  }

  clear(): PlacementRecord<TAnchor>[] {
    const removed = this.#records;
    this.#records = [];
    return removed;
  }
}
