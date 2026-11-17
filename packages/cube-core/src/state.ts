/**
 * A cube state is a list of 54 numbers: for each sticker position (0..53,
 * see geometry.ts), which sticker is there now. A sticker's number is the
 * position it has on a solved cube. So a solved cube is [0, 1, 2, ..., 53].
 *
 * This tracks every sticker, including centers, so whole-cube rotations
 * and slice moves are exact.
 *
 * Composition convention (used everywhere):
 *   compose(a, b) means "do a, then do b".
 *   A state is what you get by applying a move sequence to a solved cube,
 *   so states and move sequences compose the same way.
 *   In array terms: compose(a, b)[i] = a[b[i]].
 *
 * Treat states as read-only. Every function here returns a new array.
 */
import { FACES, type Face } from "./faces";

export type CubeState = Uint8Array;

export const STICKER_COUNT = 54;

export function solvedState(): CubeState {
  return Uint8Array.from({ length: STICKER_COUNT }, (_, i) => i);
}

/** "Do a, then do b." */
export function compose(a: CubeState, b: CubeState): CubeState {
  const out = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) out[i] = a[b[i]!]!;
  return out;
}

/** The state that undoes `a`: compose(a, invert(a)) is solved. */
export function invert(a: CubeState): CubeState {
  const out = new Uint8Array(STICKER_COUNT);
  for (let i = 0; i < STICKER_COUNT; i++) out[a[i]!] = i;
  return out;
}

export function statesEqual(a: CubeState, b: CubeState): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** True only for the solved cube held in the standard way (centers home). */
export function isIdentity(a: CubeState): boolean {
  for (let i = 0; i < STICKER_COUNT; i++) if (a[i] !== i) return false;
  return true;
}

/** Which face's color the sticker at position `pos` has. */
export function colorAt(state: CubeState, pos: number): Face {
  return FACES[Math.floor(state[pos]! / 9)]!;
}

/** The 54 sticker colors (as faces), in facelet order. */
export function facelets(state: CubeState): Face[] {
  return Array.from(state, (sticker) => FACES[Math.floor(sticker / 9)]!);
}

/** The Kociemba facelet string, like "UUUUUUUUURRRRRRRRR...". */
export function faceletString(state: CubeState): string {
  return facelets(state).join("");
}

/** Solved, held in any orientation: every face is one color. */
export function looksSolved(state: CubeState): boolean {
  for (let face = 0; face < 6; face++) {
    const color = colorAt(state, face * 9 + 4);
    for (let i = 0; i < 9; i++) if (colorAt(state, face * 9 + i) !== color) return false;
  }
  return true;
}
