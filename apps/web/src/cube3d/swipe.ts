/**
 * Turning a swipe on the screen into a move.
 *
 * Swipe on a sticker: the layer under your finger turns the way you swiped.
 * Swipe off the cube: the whole cube turns (x or y).
 *
 * The math is plain 3D: the swipe picks the direction on the sticker's face
 * that best matches it on screen; the turn axis is (face normal) x (that
 * direction), which is the axis that moves the sticker that way.
 */
import {
  moveForLayerTurn,
  STICKERS,
  unitVector,
  type Axis,
  type Move,
  type Vec3,
} from "@solvepath/cube-core";

export type Project = (point: Vec3) => { x: number; y: number };

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * @param sticker Sticker index under the start of the swipe, or null for empty space.
 * @param drag Screen movement in pixels (y grows downward).
 * @param project World point to screen pixels.
 */
export function moveForSwipe(
  sticker: number | null,
  drag: { x: number; y: number },
  project: Project,
): Move {
  const info = sticker === null ? null : STICKERS[sticker];
  const normal: Vec3 = info ? info.normal : [0, 0, 1];
  const point: Vec3 = info
    ? [
        info.cubie[0] + normal[0] * 0.5,
        info.cubie[1] + normal[1] * 0.5,
        info.cubie[2] + normal[2] * 0.5,
      ]
    : [0, 0, 1.5];

  const normalAxis = normal.findIndex((n) => n !== 0);
  const length = Math.hypot(drag.x, drag.y) || 1;
  const from = project(point);
  let best: { dir: Vec3; score: number } | null = null;
  for (const axis of [0, 1, 2] as const) {
    if (axis === normalAxis) continue;
    for (const sign of [1, -1] as const) {
      const dir = unitVector(axis, sign);
      const to = project([
        point[0] + dir[0] * 0.5,
        point[1] + dir[1] * 0.5,
        point[2] + dir[2] * 0.5,
      ]);
      const sx = to.x - from.x;
      const sy = to.y - from.y;
      const score = (sx * drag.x + sy * drag.y) / ((Math.hypot(sx, sy) || 1) * length);
      if (!best || score > best.score) best = { dir, score };
    }
  }

  const turnAxis = cross(normal, best!.dir);
  const axis = turnAxis.findIndex((n) => n !== 0) as Axis;
  const quarterTurnsCcw = turnAxis[axis] > 0 ? 1 : 3;
  const layer = info ? (info.cubie[axis] as -1 | 0 | 1) : "all";
  return moveForLayerTurn(axis, layer, quarterTurnsCcw);
}
