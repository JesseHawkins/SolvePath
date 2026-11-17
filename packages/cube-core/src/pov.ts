/**
 * Point of view: turning what the camera sees into what the user sees.
 *
 * The user holds the cube between themselves and the camera. In the user's
 * frame (the one cube-core always uses), F points at the user's eyes, so
 * the face pointing at the camera is the user's B face, upside right (U is
 * still up).
 *
 * The camera looks at B from outside the cube, the same way facelet
 * numbering reads B (geometry.ts). So in a raw camera frame, reading the
 * 3x3 grid left to right, top to bottom, gives B's stickers in facelet
 * order. Many apps show the front camera mirrored like a mirror (a
 * "selfie" preview); a mirrored grid has its columns swapped.
 *
 * This is the one place this rule lives. Vision code (M2) calls it and
 * never reasons about left and right by itself.
 */

export interface CameraGridOptions {
  /** True if the grid was read from a mirrored (selfie-style) image. */
  mirrored: boolean;
}

/**
 * Takes the 9 sticker readings of the face the camera sees, in image order
 * (row by row from the top, each row left to right), and returns them in
 * the facelet order of the user's B face (positions 45..53).
 */
export function cameraGridToBackFace<T>(grid: readonly T[], options: CameraGridOptions): T[] {
  if (grid.length !== 9) throw new Error(`Expected 9 stickers, got ${grid.length}`);
  if (!options.mirrored) return [...grid];
  return [0, 1, 2].flatMap((row) => [2, 1, 0].map((col) => grid[row * 3 + col]!));
}
