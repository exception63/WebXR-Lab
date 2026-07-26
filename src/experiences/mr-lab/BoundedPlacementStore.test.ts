import { describe, expect, it } from "vitest";
import { BoundedPlacementStore } from "./BoundedPlacementStore";

function matrix(x: number): Float32Array {
  const value = new Float32Array(16);
  value[0] = 1;
  value[5] = 1;
  value[10] = 1;
  value[15] = 1;
  value[12] = x;
  return value;
}

describe("BoundedPlacementStore", () => {
  it("copies placement matrices so frame-owned data cannot mutate records", () => {
    const store = new BoundedPlacementStore(2);
    const source = matrix(1);
    store.add(0, source, null);
    source[12] = 9;
    expect(store.records[0].surfaceMatrix[12]).toBe(1);
  });

  it("evicts the oldest placement at a fixed capacity", () => {
    const store = new BoundedPlacementStore<string>(2);
    store.add(0, matrix(1), "first");
    store.add(1, matrix(2), "second");
    const evicted = store.add(2, matrix(3), "third");

    expect(evicted?.anchor).toBe("first");
    expect(store.records.map((record) => record.anchor)).toEqual(["second", "third"]);
  });

  it("returns all records for resource cleanup", () => {
    const store = new BoundedPlacementStore<string>(2);
    store.add(0, matrix(1), "one");
    store.add(1, matrix(2), "two");
    expect(store.clear().map((record) => record.anchor)).toEqual(["one", "two"]);
    expect(store.size).toBe(0);
  });
});
