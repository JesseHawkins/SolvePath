import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { OPPOSITE_FACE } from "./faces";
import { applyMoves } from "./moves";
import {
  normalizeOrientation,
  orientationOf,
  ORIENTATIONS,
  rotationToOrientation,
} from "./orientation";
import { solvedState, isIdentity } from "./state";
import { anyMoves, faceMoves } from "./test/arbitraries";

describe("orientation", () => {
  it("finds exactly 24 ways to hold a cube", () => {
    expect(ORIENTATIONS).toHaveLength(24);
    expect(new Set(ORIENTATIONS.map((o) => o.up + o.front)).size).toBe(24);
    for (const o of ORIENTATIONS) {
      expect(o.front).not.toBe(o.up);
      expect(o.front).not.toBe(OPPOSITE_FACE[o.up]);
    }
  });

  it("uses at most two rotations to reach any of them", () => {
    for (const o of ORIENTATIONS) expect(o.rotation.length).toBeLessThanOrEqual(2);
  });

  it("detects each of the 24 from the centers", () => {
    for (const o of ORIENTATIONS) {
      const held = applyMoves(solvedState(), o.rotation);
      expect(orientationOf(held)).toEqual({ up: o.up, front: o.front });
      expect(rotationToOrientation(o)).toEqual(o.rotation);
    }
  });

  it("detects orientation after any moves, and can turn the cube back", () => {
    fc.assert(
      fc.property(faceMoves(20), fc.constantFrom(...ORIENTATIONS), (moves, o) => {
        const scrambled = applyMoves(solvedState(), moves);
        const held = applyMoves(scrambled, o.rotation);
        expect(orientationOf(held)).toEqual({ up: o.up, front: o.front });
        const { state } = normalizeOrientation(held);
        expect(orientationOf(state)).toEqual({ up: "U", front: "F" });
      }),
    );
  });

  it("brings a solved cube held any way back to the standard hold", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ORIENTATIONS), (o) => {
        expect(isIdentity(normalizeOrientation(applyMoves(solvedState(), o.rotation)).state)).toBe(
          true,
        );
      }),
    );
  });

  it("leaves the centers home after normalizing any sequence", () => {
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        const { state } = normalizeOrientation(applyMoves(solvedState(), moves));
        expect(orientationOf(state)).toEqual({ up: "U", front: "F" });
      }),
    );
  });
});
