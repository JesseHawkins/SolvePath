/**
 * Where every sticker sits in 3D, and how to turn a point a quarter turn.
 *
 * Sticker numbering follows the Kociemba facelet layout, so our facelet
 * strings match other cube software (including the two-phase solver in M3):
 *
 *               U0 U1 U2
 *               U3 U4 U5
 *               U6 U7 U8
 *    L36 L37 L38  F18 F19 F20  R9  R10 R11  B45 B46 B47
 *    L39 L40 L41  F21 F22 F23  R12 R13 R14  B48 B49 B50
 *    L42 L43 L44  F24 F25 F26  R15 R16 R17  B51 B52 B53
 *               D27 D28 D29
 *               D30 D31 D32
 *               D33 D34 D35
 *
 * Each face is numbered row by row as you look straight at it from outside
 * the cube, with U's top row against B, and D's top row against F.
 *
 * Moves are not typed in as tables. They are computed (moves.ts) by
 * rotating these 3D positions, which leaves far less room for typos.
 */
import { FACE_INDEX, FACE_NORMAL, FACES, type Face, type Vec3 } from "./faces";

export interface StickerInfo {
  /** 0..53, the Kociemba facelet index. */
  readonly index: number;
  readonly face: Face;
  readonly row: number;
  readonly col: number;
  /** Center of the cubie this sticker is on; each coordinate is -1, 0, or 1. */
  readonly cubie: Vec3;
  /** Outward direction of the sticker (the face's normal). */
  readonly normal: Vec3;
}

/** Cubie coordinate for row `r`, column `c` of a face, viewed from outside. */
function cubieFor(face: Face, r: number, c: number): Vec3 {
  switch (face) {
    case "U":
      return [c - 1, 1, r - 1];
    case "R":
      return [1, 1 - r, 1 - c];
    case "F":
      return [c - 1, 1 - r, 1];
    case "D":
      return [c - 1, -1, 1 - r];
    case "L":
      return [-1, 1 - r, c - 1];
    case "B":
      return [1 - c, 1 - r, -1];
  }
}

export const STICKERS: readonly StickerInfo[] = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return {
      index: FACE_INDEX[face] * 9 + i,
      face,
      row,
      col,
      cubie: cubieFor(face, row, col),
      normal: FACE_NORMAL[face],
    };
  }),
);

/** Sticker index of each face's center (4, 13, 22, 31, 40, 49). */
export const CENTER_STICKERS: Readonly<Record<Face, number>> = {
  U: 4,
  R: 13,
  F: 22,
  D: 31,
  L: 40,
  B: 49,
};

function key(cubie: Vec3, normal: Vec3): string {
  // `${-0}` prints "0", so rotated coordinates match.
  return `${cubie[0]},${cubie[1]},${cubie[2]}|${normal[0]},${normal[1]},${normal[2]}`;
}

const INDEX_BY_KEY = new Map(STICKERS.map((s) => [key(s.cubie, s.normal), s.index]));

/** The sticker on cubie `cubie` facing direction `normal`. */
export function stickerIndexAt(cubie: Vec3, normal: Vec3): number {
  const index = INDEX_BY_KEY.get(key(cubie, normal));
  if (index === undefined) {
    throw new Error(`No sticker at cubie ${cubie.join(",")} facing ${normal.join(",")}`);
  }
  return index;
}

/** 0 = x, 1 = y, 2 = z. */
export type Axis = 0 | 1 | 2;

/**
 * Rotates `v` by `quarterTurns` quarter turns about the +axis direction,
 * counterclockwise as seen from the tip of the axis (the right-hand rule).
 * Negative or large values are fine (taken mod 4).
 */
export function rotateQuarter(v: Vec3, axis: Axis, quarterTurns: number): Vec3 {
  let [x, y, z] = v;
  const turns = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    if (axis === 0) [y, z] = [-z, y];
    else if (axis === 1) [x, z] = [z, -x];
    else [x, y] = [-y, x];
  }
  return [x + 0, y + 0, z + 0]; // "+ 0" turns -0 into 0
}
