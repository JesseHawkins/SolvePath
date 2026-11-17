/**
 * Moves, computed from geometry.
 *
 * Each move family says which axis it turns around, which layers turn, and
 * which way a single (unprimed) turn goes. A face turn is clockwise as you
 * look straight at that face. Slices and rotations follow a face:
 *   M follows L, E follows D, S follows F (slices, middle layer only)
 *   x follows R, y follows U, z follows F (whole-cube rotations)
 *   Rw (also written r) turns R and the middle layer together, and so on.
 *
 * The sticker permutation for every move is built by rotating the 3D
 * sticker positions from geometry.ts. Tests cross-check the result
 * against cubing.js's independent cube model.
 */
import { rotateQuarter, STICKERS, stickerIndexAt, type Axis } from "./geometry";
import { compose, STICKER_COUNT, type CubeState } from "./state";

export const MOVE_FAMILIES = [
  "U",
  "R",
  "F",
  "D",
  "L",
  "B",
  "Uw",
  "Rw",
  "Fw",
  "Dw",
  "Lw",
  "Bw",
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
] as const;
export type MoveFamily = (typeof MOVE_FAMILIES)[number];

/** 1 = quarter turn, 2 = half turn, 3 = quarter turn the other way (written '). */
export type Amount = 1 | 2 | 3;

export interface Move {
  readonly family: MoveFamily;
  readonly amount: Amount;
}

export interface MoveDefinition {
  readonly axis: Axis;
  /** Layer coordinates along the axis that turn (-1, 0, 1). */
  readonly layers: readonly number[];
  /** Direction of a single turn about the +axis: -1 is clockwise seen from +axis. */
  readonly direction: 1 | -1;
  readonly kind: "face" | "wide" | "slice" | "rotation";
}

const ALL = [-1, 0, 1] as const;

export const MOVE_DEFINITIONS: Readonly<Record<MoveFamily, MoveDefinition>> = {
  R: { axis: 0, layers: [1], direction: -1, kind: "face" },
  L: { axis: 0, layers: [-1], direction: 1, kind: "face" },
  U: { axis: 1, layers: [1], direction: -1, kind: "face" },
  D: { axis: 1, layers: [-1], direction: 1, kind: "face" },
  F: { axis: 2, layers: [1], direction: -1, kind: "face" },
  B: { axis: 2, layers: [-1], direction: 1, kind: "face" },
  Rw: { axis: 0, layers: [1, 0], direction: -1, kind: "wide" },
  Lw: { axis: 0, layers: [-1, 0], direction: 1, kind: "wide" },
  Uw: { axis: 1, layers: [1, 0], direction: -1, kind: "wide" },
  Dw: { axis: 1, layers: [-1, 0], direction: 1, kind: "wide" },
  Fw: { axis: 2, layers: [1, 0], direction: -1, kind: "wide" },
  Bw: { axis: 2, layers: [-1, 0], direction: 1, kind: "wide" },
  M: { axis: 0, layers: [0], direction: 1, kind: "slice" },
  E: { axis: 1, layers: [0], direction: 1, kind: "slice" },
  S: { axis: 2, layers: [0], direction: -1, kind: "slice" },
  x: { axis: 0, layers: ALL, direction: -1, kind: "rotation" },
  y: { axis: 1, layers: ALL, direction: -1, kind: "rotation" },
  z: { axis: 2, layers: ALL, direction: -1, kind: "rotation" },
};

/**
 * Builds the permutation P for a move, so that applying the move to state s
 * gives compose(s, P). P is itself the state you get by doing the move on a
 * solved cube.
 */
function buildPermutation(def: MoveDefinition, amount: Amount): CubeState {
  const perm = Uint8Array.from({ length: STICKER_COUNT }, (_, i) => i);
  const turns = def.direction * amount;
  for (const s of STICKERS) {
    if (!def.layers.includes(s.cubie[def.axis])) continue;
    const to = stickerIndexAt(
      rotateQuarter(s.cubie, def.axis, turns),
      rotateQuarter(s.normal, def.axis, turns),
    );
    perm[to] = s.index; // the sticker that was at s.index is now at `to`
  }
  return perm;
}

const PERMUTATIONS = new Map<string, CubeState>();
for (const family of MOVE_FAMILIES) {
  for (const amount of [1, 2, 3] as const) {
    PERMUTATIONS.set(family + amount, buildPermutation(MOVE_DEFINITIONS[family], amount));
  }
}

/** All 54 moves (18 families x 3 amounts). */
export const ALL_MOVES: readonly Move[] = MOVE_FAMILIES.flatMap((family) =>
  ([1, 2, 3] as const).map((amount) => ({ family, amount })),
);

/** The 18 outer-face moves (what scrambles and most solvers use). */
export const FACE_MOVES: readonly Move[] = ALL_MOVES.filter(
  (m) => MOVE_DEFINITIONS[m.family].kind === "face",
);

export function movePermutation(move: Move): CubeState {
  return PERMUTATIONS.get(move.family + move.amount)!;
}

export function applyMove(state: CubeState, move: Move): CubeState {
  return compose(state, movePermutation(move));
}

export function applyMoves(state: CubeState, moves: readonly Move[]): CubeState {
  let s = state;
  for (const m of moves) s = applyMove(s, m);
  return s;
}

export function invertMove(move: Move): Move {
  return { family: move.family, amount: (4 - move.amount) as Amount };
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return moves.toReversed().map(invertMove);
}

export function movesEqual(a: Move, b: Move): boolean {
  return a.family === b.family && a.amount === b.amount;
}

/**
 * What a move does in 3D: the axis, the layers that turn, and how far.
 *
 * `quarterTurnsCcw` is the end result: 1, 2, or 3 quarter turns
 * counterclockwise about the +axis.
 *
 * `signedQuarterTurns` is the way to show the turn: positive is
 * counterclockwise about +axis, negative is clockwise. A half turn goes the
 * same way as its single turn (R2 turns like R, twice), so animations and
 * arrows for half turns agree with each other. The 3D renderer and the
 * arrows both use this.
 */
export function moveTurn(move: Move): {
  axis: Axis;
  layers: readonly number[];
  quarterTurnsCcw: Amount;
  signedQuarterTurns: -2 | -1 | 1 | 2;
  kind: MoveDefinition["kind"];
} {
  const def = MOVE_DEFINITIONS[move.family];
  const quarterTurnsCcw = ((((def.direction * move.amount) % 4) + 4) % 4) as Amount;
  const signedQuarterTurns = (move.amount === 3 ? -def.direction : def.direction * move.amount) as
    -2 | -1 | 1 | 2;
  return {
    axis: def.axis,
    layers: def.layers,
    quarterTurnsCcw,
    signedQuarterTurns,
    kind: def.kind,
  };
}

/**
 * The move that turns one layer (or the whole cube) by `quarterTurnsCcw`
 * about the +axis. Used to turn a swipe on the screen into a move.
 * Outer layers give face turns, the middle gives slices, "all" gives rotations.
 */
export function moveForLayerTurn(
  axis: Axis,
  layer: -1 | 0 | 1 | "all",
  quarterTurnsCcw: Amount,
): Move {
  const wanted = layer === "all" ? [...ALL] : [layer];
  for (const family of MOVE_FAMILIES) {
    const def = MOVE_DEFINITIONS[family];
    if (def.axis !== axis || def.kind === "wide") continue;
    if (def.layers.length !== wanted.length || !wanted.every((l) => def.layers.includes(l))) {
      continue;
    }
    const amount = ((((quarterTurnsCcw * def.direction) % 4) + 4) % 4) as Amount;
    return { family, amount };
  }
  throw new Error(`No move turns axis ${axis} layer ${layer}`);
}
