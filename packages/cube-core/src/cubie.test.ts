import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CORNER_STICKERS,
  cubieFromStickers,
  EDGE_STICKERS,
  permutationParity,
  solvedCubie,
  stickersFromCubie,
} from "./cubie";
import { applyMoves } from "./moves";
import { parseAlg } from "./notation";
import { normalizeOrientation } from "./orientation";
import { solvedState, statesEqual } from "./state";
import { anyMoves } from "./test/arbitraries";

describe("cubie model", () => {
  it("matches the Kociemba sticker lists", () => {
    // From Kociemba's two-phase solver (cornerFacelet / edgeFacelet), 0-based.
    expect(CORNER_STICKERS).toEqual([
      [8, 9, 20],
      [6, 18, 38],
      [0, 36, 47],
      [2, 45, 11],
      [29, 26, 15],
      [27, 44, 24],
      [33, 53, 42],
      [35, 17, 51],
    ]);
    expect(EDGE_STICKERS).toEqual([
      [5, 10],
      [7, 19],
      [3, 37],
      [1, 46],
      [32, 16],
      [28, 25],
      [30, 43],
      [34, 52],
      [23, 12],
      [21, 41],
      [50, 39],
      [48, 14],
    ]);
  });

  it("is solved on a solved cube", () => {
    expect(cubieFromStickers(solvedState())).toEqual(solvedCubie());
  });

  it("converts to stickers and back without losing anything", () => {
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        const s = applyMoves(solvedState(), moves);
        expect(statesEqual(stickersFromCubie(cubieFromStickers(s)), s)).toBe(true);
      }),
    );
  });

  it("always has legal twists, flips, and parity once centers are home", () => {
    // Slices move centers too (M cycles four edges and four centers), so the
    // rules hold only after turning the whole cube back to the standard hold.
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        const c = cubieFromStickers(normalizeOrientation(applyMoves(solvedState(), moves)).state);
        expect(c.co.reduce((a, b) => a + b, 0) % 3).toBe(0);
        expect(c.eo.reduce((a, b) => a + b, 0) % 2).toBe(0);
        expect(permutationParity(c.cp)).toBe(permutationParity(c.ep));
      }),
    );
  });

  it("uses Kociemba's twist rule: R twists corners, U does not", () => {
    expect(cubieFromStickers(applyMoves(solvedState(), parseAlg("U"))).co).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    // Kociemba's R move: co = [2, 0, 0, 1, 1, 0, 0, 2].
    expect(cubieFromStickers(applyMoves(solvedState(), parseAlg("R"))).co).toEqual([
      2, 0, 0, 1, 1, 0, 0, 2,
    ]);
    // F flips four edges; R does not.
    expect(cubieFromStickers(applyMoves(solvedState(), parseAlg("F"))).eo).toEqual([
      0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    ]);
    expect(
      cubieFromStickers(applyMoves(solvedState(), parseAlg("R"))).eo.every((f) => f === 0),
    ).toBe(true);
  });

  it("finds parity of permutations", () => {
    expect(permutationParity([0, 1, 2])).toBe(0);
    expect(permutationParity([1, 0, 2])).toBe(1);
    expect(permutationParity([1, 2, 0])).toBe(0);
  });
});
