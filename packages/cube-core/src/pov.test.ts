import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Vec3 } from "./faces";
import { STICKERS } from "./geometry";
import { applyMoves } from "./moves";
import { cameraGridToBackFace } from "./pov";
import { colorAt, solvedState, type CubeState } from "./state";
import { anyMoves } from "./test/arbitraries";

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * A pretend camera: it sits in front of the user, looking back at them, so
 * it looks along +z. We project every sticker it can see to the image and
 * read the 3x3 grid row by row, the way vision code will.
 */
function cameraGrid(state: CubeState, mirrored: boolean): string[] {
  const position: Vec3 = [0, 0, -10];
  const forward: Vec3 = [0, 0, 1];
  const up: Vec3 = [0, 1, 0];
  const right = cross(forward, up); // a viewer's right hand
  const seen = STICKERS.filter((s) => dot(s.normal, forward) < 0).map((s) => {
    const center: Vec3 = [
      s.cubie[0] + s.normal[0] * 0.5,
      s.cubie[1] + s.normal[1] * 0.5,
      s.cubie[2] + s.normal[2] * 0.5,
    ];
    const rel = sub(center, position);
    const depth = dot(rel, forward);
    let imageX = dot(rel, right) / depth;
    if (mirrored) imageX = -imageX;
    const imageY = -dot(rel, up) / depth; // image rows go down
    return { imageX, imageY, color: colorAt(state, s.index) };
  });
  expect(seen).toHaveLength(9);
  seen.sort((a, b) =>
    Math.abs(a.imageY - b.imageY) > 1e-9 ? a.imageY - b.imageY : a.imageX - b.imageX,
  );
  return seen.map((s) => s.color);
}

describe("cameraGridToBackFace", () => {
  it("gives the user's B face from a real or a mirrored camera image", () => {
    fc.assert(
      fc.property(anyMoves(), fc.boolean(), (moves, mirrored) => {
        const state = applyMoves(solvedState(), moves);
        const back = [45, 46, 47, 48, 49, 50, 51, 52, 53].map((p) => colorAt(state, p));
        expect(cameraGridToBackFace(cameraGrid(state, mirrored), { mirrored })).toEqual(back);
      }),
    );
  });

  it("puts the user's right side on the camera's left in a raw image", () => {
    // After R, the right column (as the user sees F) changes. The camera sees B,
    // and B's left column in a raw image is the user's right side.
    const grid = cameraGrid(applyMoves(solvedState(), [{ family: "R", amount: 1 }]), false);
    expect([grid[0], grid[3], grid[6]]).toEqual(["U", "U", "U"]);
    expect([grid[2], grid[5], grid[8]]).toEqual(["B", "B", "B"]);
  });

  it("needs exactly 9 stickers", () => {
    expect(() => cameraGridToBackFace([1, 2, 3], { mirrored: false })).toThrow();
  });
});
