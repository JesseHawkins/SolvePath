import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { assign, assignmentCost } from "./hungarian";

/** Tries every pairing. Only for small tables. */
function bruteForce(cost: number[][]): number {
  const n = cost.length;
  let best = Infinity;
  const used = new Array<boolean>(n).fill(false);
  const go = (row: number, sum: number) => {
    if (row === n) {
      best = Math.min(best, sum);
      return;
    }
    for (let col = 0; col < n; col++) {
      if (used[col]) continue;
      used[col] = true;
      go(row + 1, sum + cost[row]![col]!);
      used[col] = false;
    }
  };
  go(0, 0);
  return best;
}

describe("assign (Hungarian algorithm)", () => {
  it("solves a small known table", () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ];
    const pairing = assign(cost);
    expect(assignmentCost(cost, pairing)).toBe(5);
    expect(new Set(pairing).size).toBe(3);
  });

  it("matches brute force on random tables", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }).chain((n) =>
          fc.array(fc.array(fc.integer({ min: -50, max: 100 }), { minLength: n, maxLength: n }), {
            minLength: n,
            maxLength: n,
          }),
        ),
        (cost) => {
          const pairing = assign(cost);
          expect([...pairing].sort((a, b) => a - b)).toEqual(cost.map((_, i) => i));
          expect(assignmentCost(cost, pairing)).toBe(bruteForce(cost));
        },
      ),
      { numRuns: 300 },
    );
  });

  it("handles an empty table", () => {
    expect(assign([])).toEqual([]);
  });
});
