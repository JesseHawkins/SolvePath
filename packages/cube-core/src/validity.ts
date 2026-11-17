/**
 * Checking whether a set of 54 sticker colors is a real, solvable cube.
 *
 * Input is 54 face labels in facelet order (geometry.ts), where each label
 * says which face's color a sticker has. (A color scheme turns camera
 * colors into face labels first; see colors.ts.)
 *
 * Instead of a plain yes or no, we list every problem we find, so the app
 * can tell the user what to fix: "Two stickers look the same, check the
 * red ones", "One corner is twisted", and so on.
 *
 * The centers may be in any of the 24 orientations. The result `state`
 * keeps the orientation the cube was held in.
 */
import { FACES, isFace, type Face } from "./faces";
import { CENTER_STICKERS } from "./geometry";
import {
  CORNER_NAMES,
  CORNER_STICKERS,
  EDGE_NAMES,
  EDGE_STICKERS,
  permutationParity,
  stickersFromCubie,
  type CubieState,
} from "./cubie";
import { applyMoves, invertMoves, movePermutation } from "./moves";
import { ORIENTATIONS } from "./orientation";
import { facelets, solvedState, type CubeState } from "./state";

export type CubeProblem =
  /** Not 54 stickers, or a label that isn't a face. */
  | { kind: "wrong-sticker-count"; count: number }
  /** A color shows up more or less than 9 times. */
  | { kind: "color-count"; face: Face; count: number }
  /** The six centers aren't six different colors in a real arrangement. */
  | { kind: "centers" }
  /** A corner's colors don't match any real corner. */
  | { kind: "unknown-corner"; spot: string; colors: Face[] }
  /** An edge's colors don't match any real edge. */
  | { kind: "unknown-edge"; spot: string; colors: Face[] }
  /** The same corner shows up twice. */
  | { kind: "duplicate-corner"; piece: string }
  /** The same edge shows up twice. */
  | { kind: "duplicate-edge"; piece: string }
  /** One corner is twisted in place (the sum of twists isn't a multiple of 3). */
  | { kind: "twisted-corner" }
  /** One edge is flipped in place. */
  | { kind: "flipped-edge" }
  /** Two pieces are swapped (corner and edge permutations have different parity). */
  | { kind: "swapped-pieces" };

export type Diagnosis =
  { ok: true; state: CubeState; cubie: CubieState } | { ok: false; problems: CubeProblem[] };

/** Facelet labels after doing a sequence of moves: out[pos] = labels[perm[pos]]. */
function permuteLabels(labels: readonly Face[], perm: CubeState): Face[] {
  return Array.from(perm, (from) => labels[from]!);
}

/** Matches the colors at a spot to a piece. Returns null if no piece fits. */
function matchPiece(
  colors: readonly Face[],
  pieces: readonly string[],
): { piece: number; twist: number } | null {
  const n = colors.length;
  for (let piece = 0; piece < pieces.length; piece++) {
    const name = pieces[piece]!;
    for (let twist = 0; twist < n; twist++) {
      // Spot place m holds piece sticker (m - twist) mod n (same rule as stickersFromCubie).
      let fits = true;
      for (let m = 0; m < n; m++) {
        if (colors[m] !== name[(m - twist + n) % n]) {
          fits = false;
          break;
        }
      }
      if (fits) return { piece, twist };
    }
  }
  return null;
}

export function diagnoseFacelets(input: readonly unknown[]): Diagnosis {
  const problems: CubeProblem[] = [];
  if (input.length !== 54 || !input.every(isFace)) {
    return { ok: false, problems: [{ kind: "wrong-sticker-count", count: input.length }] };
  }
  const labels = input;

  for (const face of FACES) {
    const count = labels.filter((l) => l === face).length;
    if (count !== 9) problems.push({ kind: "color-count", face, count });
  }

  // Find how the cube is held from its centers, then turn it to the standard hold.
  const up = labels[CENTER_STICKERS.U]!;
  const front = labels[CENTER_STICKERS.F]!;
  const held = ORIENTATIONS.find((o) => o.up === up && o.front === front);
  const heldLabels = held ? facelets(applyMoves(solvedState(), held.rotation)) : [];
  const centersMatch =
    held !== undefined &&
    FACES.every((spot) => labels[CENTER_STICKERS[spot]] === heldLabels[CENTER_STICKERS[spot]]);
  if (!held || !centersMatch) {
    problems.push({ kind: "centers" });
    return { ok: false, problems };
  }
  const toStandard = invertMoves(held.rotation);
  let standard = labels;
  for (const move of toStandard) standard = permuteLabels(standard, movePermutation(move));

  const cp: number[] = [];
  const co: number[] = [];
  const cornerSeen = new Set<number>();
  CORNER_STICKERS.forEach((spot, i) => {
    const colors = spot.map((pos) => standard[pos]!);
    const match = matchPiece(colors, CORNER_NAMES);
    if (!match) {
      problems.push({ kind: "unknown-corner", spot: CORNER_NAMES[i]!, colors });
      return;
    }
    if (cornerSeen.has(match.piece)) {
      problems.push({ kind: "duplicate-corner", piece: CORNER_NAMES[match.piece]! });
    }
    cornerSeen.add(match.piece);
    cp.push(match.piece);
    co.push(match.twist);
  });

  const ep: number[] = [];
  const eo: number[] = [];
  const edgeSeen = new Set<number>();
  EDGE_STICKERS.forEach((spot, i) => {
    const colors = spot.map((pos) => standard[pos]!);
    const match = matchPiece(colors, EDGE_NAMES);
    if (!match) {
      problems.push({ kind: "unknown-edge", spot: EDGE_NAMES[i]!, colors });
      return;
    }
    if (edgeSeen.has(match.piece)) {
      problems.push({ kind: "duplicate-edge", piece: EDGE_NAMES[match.piece]! });
    }
    edgeSeen.add(match.piece);
    ep.push(match.piece);
    eo.push(match.twist);
  });

  // The rules below only make sense once every piece is known and appears once.
  if (problems.length > 0) return { ok: false, problems };

  if (co.reduce((a, b) => a + b, 0) % 3 !== 0) problems.push({ kind: "twisted-corner" });
  if (eo.reduce((a, b) => a + b, 0) % 2 !== 0) problems.push({ kind: "flipped-edge" });
  if (permutationParity(cp) !== permutationParity(ep)) problems.push({ kind: "swapped-pieces" });
  if (problems.length > 0) return { ok: false, problems };

  const cubie: CubieState = { cp, co, ep, eo, centers: [0, 1, 2, 3, 4, 5] };
  // Turn back to the way the cube was held.
  const state = applyMoves(stickersFromCubie(cubie), held.rotation);
  return { ok: true, state, cubie };
}
