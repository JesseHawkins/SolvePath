/**
 * Where to draw the "turn this way" arrow for a move.
 *
 * The arrow lies on a face the user can see (F, or U for moves that turn
 * around the front-to-back axis), along the strip of stickers that moves,
 * pointing the way those stickers go.
 */
import { moveTurn, unitVector, type Move, type Vec3 } from "@solvepath/cube-core";

export interface ArrowPlacement {
  /** Center of the arrow, just above the face. */
  center: Vec3;
  /** Which way the arrow points (a unit axis vector). */
  direction: Vec3;
  /** The face's outward normal. */
  normal: Vec3;
  /** Half turns get two heads. */
  double: boolean;
  /** Whole-cube rotations get a wider arrow. */
  wide: boolean;
}

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function arrowFor(move: Move): ArrowPlacement {
  const turn = moveTurn(move);
  const normal: Vec3 = turn.axis === 2 ? [0, 1, 0] : [0, 0, 1];
  const axisVector = unitVector(turn.axis);
  // A counterclockwise turn about +axis moves points on the face along axis x normal.
  const ccw = cross(axisVector, normal);
  const sign = turn.quarterTurnsCcw === 3 ? -1 : 1;
  // "+ 0" turns -0 into 0.
  const direction: Vec3 = [ccw[0] * sign + 0, ccw[1] * sign + 0, ccw[2] * sign + 0];
  // The outer layer of the move (wide moves show on their face layer).
  const layer = turn.layers.length === 3 ? 0 : turn.layers[0]!;
  const lift = 1.53;
  const center: Vec3 = [
    normal[0] * lift + axisVector[0] * layer + 0,
    normal[1] * lift + axisVector[1] * layer + 0,
    normal[2] * lift + axisVector[2] * layer + 0,
  ];
  return {
    center,
    direction,
    normal,
    double: turn.quarterTurnsCcw === 2,
    wide: turn.kind === "rotation",
  };
}
