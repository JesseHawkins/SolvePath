import fc from "fast-check";
import { ALL_MOVES, FACE_MOVES, type Move } from "../moves";

/** Any sequence of moves, including slices, wide moves, and rotations. */
export const anyMoves = (maxLength = 40): fc.Arbitrary<Move[]> =>
  fc.array(fc.constantFrom(...ALL_MOVES), { maxLength });

/** Outer face turns only (centers stay home). */
export const faceMoves = (maxLength = 40): fc.Arbitrary<Move[]> =>
  fc.array(fc.constantFrom(...FACE_MOVES), { maxLength });
