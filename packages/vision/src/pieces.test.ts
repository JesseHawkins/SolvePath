import fc from "fast-check";
import {
  applyMoves,
  CORNER_STICKERS,
  EDGE_STICKERS,
  colorAt,
  cubieFromStickers,
  FACES,
  solvedState,
  stickersFromCubie,
  statesEqual,
} from "@solvepath/cube-core";
import { faceMoves } from "../../cube-core/src/test/arbitraries";
import { describe, expect, it } from "vitest";
import { bestValidCube } from "./pieces";

/** Perfect readings: 0 for the right face, 1 for the others. */
function costsFor(
  state: Uint8Array,
  hidden: number[] = [],
  wrong: Map<number, number> = new Map(),
) {
  return Array.from({ length: 54 }, (_, pos) => {
    if (hidden.includes(pos)) return FACES.map(() => 0);
    const right = wrong.get(pos) ?? FACES.indexOf(colorAt(state, pos));
    return FACES.map((_, f) => (f === right ? 0 : 1));
  });
}

describe("bestValidCube", () => {
  it("reads back any real cube from perfect readings", () => {
    fc.assert(
      fc.property(faceMoves(), (moves) => {
        const state = applyMoves(solvedState(), moves);
        const fit = bestValidCube(costsFor(state));
        expect(fit.cost).toBe(0);
        expect(statesEqual(stickersFromCubie(fit.cubie), state)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it(
    "fills in hidden stickers with a real cube that agrees with everything seen",
    { timeout: 300_000 },
    () => {
      // Up to 3 hidden stickers, at most one per piece (a finger can't cover more).
      // (A real grip hides two at most: the edge next to each finger.)
      // The answer must agree with every sticker we saw. It may differ from the
      // truth only where that's truly impossible to tell: for example, three
      // edges that each show the same visible color can be cycled.
      const oneStickerOfEachPiece = fc
        .uniqueArray(fc.integer({ min: 0, max: 19 }), { maxLength: 3 })
        .chain((pieces) =>
          fc.tuple(
            ...pieces.map((p) =>
              fc
                .integer({ min: 0, max: 2 })
                .map((slot) =>
                  p < 8 ? CORNER_STICKERS[p]![slot]! : EDGE_STICKERS[p - 8]![slot % 2]!,
                ),
            ),
          ),
        );
      fc.assert(
        fc.property(faceMoves(), oneStickerOfEachPiece, (moves, hidden) => {
          const state = applyMoves(solvedState(), moves);
          const fit = bestValidCube(costsFor(state, [...hidden, 4, 31]));
          expect(fit.cost).toBe(0);
        }),
        { numRuns: 300 },
      );
    },
  );

  it("reads back the exact cube with the grip's fingers in the way", () => {
    // Fingers cover the U and D centers and the edge sticker next to each.
    const hidden = [4, 7, 31, 28];
    fc.assert(
      fc.property(faceMoves(), (moves) => {
        const state = applyMoves(solvedState(), moves);
        const fit = bestValidCube(costsFor(state, hidden));
        expect(statesEqual(stickersFromCubie(fit.cubie), state)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("fixes one misread sticker", () => {
    const state = applyMoves(solvedState(), []);
    const wrong = new Map([[0, 2]]); // a U sticker read as F
    const fit = bestValidCube(costsFor(state, [], wrong));
    expect(statesEqual(stickersFromCubie(fit.cubie), state)).toBe(true);
    expect(cubieFromStickers(stickersFromCubie(fit.cubie)).cp).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
