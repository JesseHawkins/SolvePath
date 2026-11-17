/**
 * The six logical faces of a 3x3 cube, and the 3D directions they point.
 *
 * Coordinates (used everywhere in cube-core):
 *   x points right (toward R), y points up (toward U), z points at the user (toward F).
 * This is the user's frame: F is always the face pointing at the user's eyes.
 *
 * Faces are logical, not colors. Which physical color belongs to which
 * face is a cube profile's job (see colors.ts).
 */

/** Face order matches the Kociemba facelet string used by most cube software. */
export const FACES = ["U", "R", "F", "D", "L", "B"] as const;
export type Face = (typeof FACES)[number];

export type Vec3 = readonly [number, number, number];

export const FACE_INDEX: Readonly<Record<Face, number>> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

export const OPPOSITE_FACE: Readonly<Record<Face, Face>> = {
  U: "D",
  D: "U",
  R: "L",
  L: "R",
  F: "B",
  B: "F",
};

export const FACE_NORMAL: Readonly<Record<Face, Vec3>> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

export function isFace(value: unknown): value is Face {
  return typeof value === "string" && (FACES as readonly string[]).includes(value);
}

/** The face whose outward direction is `normal` (which must be a unit axis vector). */
export function faceForNormal(normal: Vec3): Face {
  for (const face of FACES) {
    const n = FACE_NORMAL[face];
    if (n[0] === normal[0] && n[1] === normal[1] && n[2] === normal[2]) return face;
  }
  throw new Error(`Not a face direction: ${normal.join(",")}`);
}

/** The unit vector along axis 0 (x), 1 (y), or 2 (z), pointing the + or - way. */
export function unitVector(axis: 0 | 1 | 2, sign: 1 | -1 = 1): Vec3 {
  return [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
}
