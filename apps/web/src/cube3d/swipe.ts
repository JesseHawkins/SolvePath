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

export interface Point {
  x: number;
  y: number;
}

/** How far two fingers must twist (radians, about 20 degrees) to turn the cube like z. */
export const TWIST_RADIANS = 0.35;
/** How far two fingers must move together (pixels) to turn the cube like x or y. */
export const TWO_FINGER_DRAG_PX = 24;

/**
 * Two fingers turn the whole cube. Twisting (like a steering wheel) gives
 * z: clockwise on screen is z, the other way is z'. Dragging both fingers
 * gives x or y, the same as a one-finger swipe beside the cube.
 * Returns null until the fingers have moved far enough to tell.
 */
export function moveForTwoFingers(
  start: readonly [Point, Point],
  now: readonly [Point, Point],
  project: Project,
): Move | null {
  const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
  const raw = angle(now[0], now[1]) - angle(start[0], start[1]);
  // Keep the twist between -180 and 180 degrees.
  const twist = ((((raw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  if (Math.abs(twist) >= TWIST_RADIANS) {
    // Screen y grows downward, so a growing angle is clockwise on screen.
    // Clockwise as you look at F is z, which is clockwise about +z (3 quarter turns counterclockwise).
    return moveForLayerTurn(2, "all", twist > 0 ? 3 : 1);
  }
  const drag = {
    x: (now[0].x + now[1].x - start[0].x - start[1].x) / 2,
    y: (now[0].y + now[1].y - start[0].y - start[1].y) / 2,
  };
  if (Math.hypot(drag.x, drag.y) >= TWO_FINGER_DRAG_PX) return moveForSwipe(null, drag, project);
  return null;
}
