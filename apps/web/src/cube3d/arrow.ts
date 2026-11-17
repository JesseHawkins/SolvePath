/**
 * Where to draw the "turn this way" arrow for a move.
 *
 * Moves that turn part of the cube get a straight arrow lying on a face
 * the user can see (F, or U for moves around the front-to-back axis), along
 * the strip of stickers that moves, pointing the way those stickers go.
 *
 * With the "face" arrow style, outer face turns (U R F D L B) instead get
 * a circular arrow on the face that turns, going the way that face turns
 * as seen from outside it. Faces the viewer can't see (L, D, B) get the
 * circle floating just beyond the face, drawn see-through. Two-layer moves
 * and middle slices keep the straight arrow in both styles.
 *
 * Whole-cube rotations (x, y, z) get a big curved arrow that wraps around
 * the cube on the side facing the viewer, so it's clear everything turns.
 */
import {
  FACE_NORMAL,
  moveTurn,
  unitVector,
  type Face,
  type Move,
  type Vec3,
} from "@solvepath/cube-core";

export const ARROW_STYLES = ["section", "face"] as const;
export type ArrowStyle = (typeof ARROW_STYLES)[number];

/** Where the camera sits (looking at the middle of the cube). */
export const CAMERA_POSITION: Vec3 = [4.9, 6.0, 8.9];

export interface StripArrow {
  kind: "strip";
  /** Center of the arrow, just above the face. */
  center: Vec3;
  /** Which way the arrow points (a unit axis vector). */
  direction: Vec3;
  /** The face's outward normal. */
  normal: Vec3;
  /** How many layers turn: 1, or 2 for wide moves like r. */
  layers: 1 | 2;
  /** Half turns get two heads. */
  double: boolean;
}

export interface ArcArrow {
  kind: "arc";
  /** The rotation axis (a unit axis vector). */
  axis: Vec3;
  /** Two unit vectors across the axis; u x v = axis, so growing angles go counterclockwise. */
  u: Vec3;
  v: Vec3;
  radius: number;
  /** Start and end angle of the arc, in radians. The head is at `to`. */
  from: number;
  to: number;
  double: boolean;
}

export interface FaceArrow {
  kind: "face";
  face: Face;
  /** Center of the circle. */
  center: Vec3;
  /** The face's outward normal. The circle lies across it. */
  normal: Vec3;
  /** 1: counterclockwise as seen from outside the face. -1: clockwise. */
  turn: 1 | -1;
  /** The face points away from the viewer, so the circle floats beside the cube, see-through. */
  hidden: boolean;
  double: boolean;
}

export type ArrowPlacement = StripArrow | ArcArrow | FaceArrow;

const ARC_RADIUS = 2.45;
const ARC_HALF_SPAN = (75 * Math.PI) / 180;

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clean = (v: Vec3): Vec3 => [v[0] + 0, v[1] + 0, v[2] + 0]; // turns -0 into 0

export function arrowFor(
  move: Move,
  style: ArrowStyle = "section",
  camera: Vec3 = CAMERA_POSITION,
): ArrowPlacement {
  const turn = moveTurn(move);
  const axis = unitVector(turn.axis);
  // Counterclockwise about +axis is +1; clockwise is -1. Half turns use +1.
  const sign = turn.quarterTurnsCcw === 3 ? -1 : 1;
  const double = turn.quarterTurnsCcw === 2;

  if (turn.kind === "rotation") {
    const u = unitVector(((turn.axis + 1) % 3) as 0 | 1 | 2);
    const v = unitVector(((turn.axis + 2) % 3) as 0 | 1 | 2);
    // Center the arc on the side of the cube that faces the camera.
    const middle = Math.atan2(dot(camera, v), dot(camera, u));
    const from = middle - sign * ARC_HALF_SPAN;
    const to = middle + sign * ARC_HALF_SPAN;
    return { kind: "arc", axis, u, v, radius: ARC_RADIUS, from, to, double };
  }

  if (style === "face" && turn.kind === "face") {
    const face = move.family[0] as Face;
    const faceNormal = FACE_NORMAL[face];
    // Turning counterclockwise about +axis is clockwise about a face that points the other way.
    const towardPlus = dot(faceNormal, axis) > 0;
    const hidden = dot(faceNormal, camera) < 0;
    const lift = hidden ? 2.6 : 1.53;
    return {
      kind: "face",
      face,
      center: clean([faceNormal[0] * lift, faceNormal[1] * lift, faceNormal[2] * lift]),
      normal: faceNormal,
      // Half turns are shown clockwise, with two heads.
      turn: double ? -1 : towardPlus ? sign : sign === 1 ? -1 : 1,
      hidden,
      double,
    };
  }

  const normal: Vec3 = turn.axis === 2 ? [0, 1, 0] : [0, 0, 1];
  // A counterclockwise turn about +axis moves points on the face along axis x normal.
  const ccw = cross(axis, normal);
  const direction = clean([ccw[0] * sign, ccw[1] * sign, ccw[2] * sign]);
  // Middle of the layers that turn (wide moves cover two).
  const layer = turn.layers.reduce((a, b) => a + b, 0) / turn.layers.length;
  const lift = 1.53;
  const center = clean([
    normal[0] * lift + axis[0] * layer,
    normal[1] * lift + axis[1] * layer,
    normal[2] * lift + axis[2] * layer,
  ]);
  return {
    kind: "strip",
    center,
    direction,
    normal,
    layers: turn.layers.length === 2 ? 2 : 1,
    double,
  };
}

/** A point on an arc arrow. */
export function arcPoint(arc: ArcArrow, angle: number): Vec3 {
  const c = Math.cos(angle) * arc.radius;
  const s = Math.sin(angle) * arc.radius;
  return clean([
    arc.u[0] * c + arc.v[0] * s,
    arc.u[1] * c + arc.v[1] * s,
    arc.u[2] * c + arc.v[2] * s,
  ]);
}

/** Which way the arc is heading at `angle` (a unit vector, toward the head). */
export function arcDirection(arc: ArcArrow, angle: number): Vec3 {
  const sign = arc.to > arc.from ? 1 : -1;
  const s = Math.sin(angle) * sign;
  const c = Math.cos(angle) * sign;
  return clean([
    -arc.u[0] * s + arc.v[0] * c,
    -arc.u[1] * s + arc.v[1] * c,
    -arc.u[2] * s + arc.v[2] * c,
  ]);
}
