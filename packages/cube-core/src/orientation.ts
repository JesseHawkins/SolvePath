/**
 * Whole-cube orientation: which way the cube is being held.
 *
 * The centers never move relative to each other, so a cube can be held in
 * exactly 24 ways (6 choices of top face x 4 choices of front face).
 * We find all 24 by trying whole-cube rotations (x, y, z) from the standard
 * hold, so the list is computed, not typed in.
 */
import { FACES, type Face } from "./faces";
import { CENTER_STICKERS } from "./geometry";
import { applyMoves, invertMoves, type Move } from "./moves";
import { solvedState, type CubeState } from "./state";

export interface Orientation {
  /** The face whose center is on top. */
  up: Face;
  /** The face whose center points at the user. */
  front: Face;
}

export interface OrientationEntry extends Orientation {
  /** A shortest rotation that takes the standard hold (U up, F front) to this one. */
  rotation: Move[];
}

function centerFace(state: CubeState, spot: Face): Face {
  return FACES[Math.floor(state[CENTER_STICKERS[spot]]! / 9)]!;
}

export function orientationOf(state: CubeState): Orientation {
  return { up: centerFace(state, "U"), front: centerFace(state, "F") };
}

const ROTATIONS: Move[] = (["x", "y", "z"] as const).flatMap((family) =>
  ([1, 2, 3] as const).map((amount) => ({ family, amount })),
);

function buildOrientations(): OrientationEntry[] {
  const found = new Map<string, OrientationEntry>();
  const solved = solvedState();
  let frontier: Move[][] = [[]];
  while (frontier.length > 0) {
    const next: Move[][] = [];
    for (const rotation of frontier) {
      const o = orientationOf(applyMoves(solved, rotation));
      const key = o.up + o.front;
      if (found.has(key)) continue;
      found.set(key, { ...o, rotation });
      for (const r of ROTATIONS) next.push([...rotation, r]);
    }
    frontier = next;
  }
  return [...found.values()];
}

/** All 24 ways to hold a cube. */
export const ORIENTATIONS: readonly OrientationEntry[] = buildOrientations();

export function rotationToOrientation(target: Orientation): Move[] {
  const entry = ORIENTATIONS.find((o) => o.up === target.up && o.front === target.front);
  if (!entry) throw new Error(`Impossible orientation: ${target.up} up, ${target.front} front`);
  return entry.rotation;
}

/**
 * Turns the whole cube so the centers are back home (U center up, F center
 * in front). Returns the rotated state and the rotation that was applied.
 */
export function normalizeOrientation(state: CubeState): { state: CubeState; rotation: Move[] } {
  const rotation = invertMoves(rotationToOrientation(orientationOf(state)));
  return { state: applyMoves(state, rotation), rotation };
}
