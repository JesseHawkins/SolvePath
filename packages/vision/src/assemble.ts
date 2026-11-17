/**
 * Putting six scanned faces together into one cube (PLAN.md 5.5).
 *
 * We know roughly how the cube moved between captures (spun around for the
 * sides, tipped for the top and bottom), but a few things are uncertain:
 * which way it spun, how the top and bottom were turned when we saw them,
 * and which of the two hidden center colors is on top. So we try every
 * combination (64 at most) and keep the one that explains the colors best
 * as a real, solvable cube. The measured spin direction breaks ties.
 */
import {
  applyMoves,
  cameraGridToBackFace,
  FACES,
  facelets,
  ORIENTATIONS,
  solvedState,
  stickersFromCubie,
  type CubeState,
  type CubieState,
  type Face,
  type Move,
} from "@solvepath/cube-core";
import { balancedClusters } from "./cluster";
import { colorDistance, type Lab } from "./color";
import { assign } from "./hungarian";
import { bestValidCube } from "./pieces";

/** One scanned face: 9 colors in camera order (row by row from the top-left). Null means "couldn't see it". */
export type FaceScan = readonly (Lab | null)[];

export interface AssembleInput {
  /** The four side faces, in the order they were scanned. */
  sides: readonly FaceScan[];
  top: FaceScan;
  bottom: FaceScan;
  /** Measured spin direction between sides, or null if we couldn't tell. */
  spin: "y" | "y'" | null;
  /**
   * True if the camera picture is flipped left to right (from calibration).
   * "unknown" tries both ways. That only works with `knownColors`: with brand
   * new colors, a flipped scan gives a mirror-image cube that fits just as well.
   */
  mirrored: boolean | "unknown";
  /**
   * The cube's usual colors, if known (a cube profile, or the standard set).
   * Then we also insist the center colors are in a real arrangement, which
   * catches a mirror-image mix-up even without a spin direction.
   */
  knownColors?: Readonly<Record<Face, Lab>> | null;
}

export type AssembleResult =
  | {
      ok: true;
      /** The cube, as held when the first side was scanned (that side toward the camera). */
      state: CubeState;
      cubie: CubieState;
      /** How badly the colors fit (lower is better). */
      cost: number;
      /** Cost of the best different answer. A close second means we're not sure. */
      runnerUp: number;
      /** Group colors by face, in the same frame as `state`. */
      faceColors: Record<Face, Lab>;
      /** Whether the picture was flipped (the answer we used, if it was "unknown"). */
      mirrored: boolean;
    }
  | {
      ok: false;
      /** "impossible-colors": with the known colors, no way of holding the cube fits. */
      reason: "too-few-faces" | "impossible-colors";
    };

const Y: Move = { family: "y", amount: 1 };
const Y_PRIME: Move = { family: "y", amount: 3 };
const X: Move = { family: "x", amount: 1 };
const X_PRIME: Move = { family: "x", amount: 3 };

/** For each of the 9 camera stickers, the home position it shows when the cube is turned by `moves`. */
function homePositions(moves: Move[], mirrored: boolean): number[] {
  const shown = applyMoves(solvedState(), moves);
  const grid = Array.from({ length: 9 }, (_, i) => i);
  // Camera order to B facelet order, then B facelet to the home sticker shown there.
  return cameraGridToBackFace(grid, { mirrored }).map((i) => shown[45 + i]!);
}

/** How badly a color fits a group. Capped, so one odd sticker (a finger, a glint) can't wreck the answer. */
const NOISE = 0.03;
const CAP = 16;
function fitCost(color: Lab | null, group: Lab): number {
  if (!color) return 0;
  return Math.min(CAP, (colorDistance(color, group) / NOISE) ** 2);
}

/** Extra cost for an answer that disagrees with the measured spin. */
const SPIN_PENALTY = 25;

/** True if these center colors (face -> color's home face) could be a real cube held some way. */
function centersPossible(centerColor: Record<Face, Face>): boolean {
  return ORIENTATIONS.some((o) => {
    if (o.up !== centerColor.U || o.front !== centerColor.F) return false;
    const held = facelets(applyMoves(solvedState(), o.rotation));
    return FACES.every((f) => held[FACES.indexOf(f) * 9 + 4] === centerColor[f]);
  });
}

export function assembleCube(input: AssembleInput): AssembleResult {
  if (input.mirrored === "unknown") {
    const tries = [false, true].map((mirrored) => assembleOneWay({ ...input, mirrored }));
    let best: AssembleResult = tries[0]!;
    for (const t of tries) {
      if (t.ok && (!best.ok || t.cost < best.cost)) best = t;
    }
    return best;
  }
  return assembleOneWay({ ...input, mirrored: input.mirrored });
}

function assembleOneWay(input: AssembleInput & { mirrored: boolean }): AssembleResult {
  if (input.sides.length !== 4) return { ok: false, reason: "too-few-faces" };
  const scans = [...input.sides, input.top, input.bottom];
  // Top and bottom centers are under the fingers.
  const samples = scans.flatMap((scan, k) => scan.map((c, i) => (k >= 4 && i === 4 ? null : c)));
  const seen = samples.filter((s) => s !== null).length;
  // Side centers start groups 0-3. Groups 4 and 5 are the top and bottom colors.
  // Those two each miss their (hidden) center; any other unseen stickers come off the biggest groups.
  const sizes = [9, 9, 9, 9, 8, 8];
  let extra = 52 - seen;
  for (let g = 0; extra > 0; g = (g + 1) % 6, extra--) sizes[g]!--;
  const fixed: [number, number][] = [0, 1, 2, 3].flatMap((k) =>
    samples[k * 9 + 4] ? [[k * 9 + 4, k] as [number, number]] : [],
  );
  const { centers } = balancedClusters({ samples, fixed, sizes });
  const costs = samples.map((s) => centers.map((c) => fitCost(s, c)));

  // Name each group with a known color, if we have them and they match well.
  let colorOfGroup: Face[] | null = null;
  if (input.knownColors) {
    const known = input.knownColors;
    const table = centers.map((c) => FACES.map((f) => colorDistance(c, known[f])));
    const pairing = assign(table);
    const worst = Math.max(...pairing.map((f, g) => table[g]![f]!));
    if (worst < 0.15) colorOfGroup = pairing.map((f) => FACES[f]!);
  }

  const spins: ("y" | "y'")[] = ["y", "y'"];
  let best: {
    cost: number;
    cubie: CubieState;
    state: CubeState;
    groupOfFace: Record<Face, number>;
  } | null = null;
  const answers: { cost: number; state: CubeState }[] = [];
  for (const spin of spins) {
    const turn = spin === "y" ? Y : Y_PRIME;
    const sideMoves = [0, 1, 2, 3].map((k) => new Array<Move>(k).fill(turn));
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        for (const topGroup of [4, 5]) {
          const moves = [
            ...sideMoves,
            [...new Array<Move>(a).fill(Y), X],
            [...new Array<Move>(b).fill(Y), X_PRIME],
          ];
          const where = moves.map((m) => homePositions(m, input.mirrored));
          // Which group each face's color is: side centers tell us four, the choice tells us the rest.
          const groupOfFace = {} as Record<Face, number>;
          for (let k = 0; k < 4; k++) groupOfFace[FACES[Math.floor(where[k]![4]! / 9)]!] = k;
          groupOfFace.U = topGroup;
          groupOfFace.D = topGroup === 4 ? 5 : 4;
          if (colorOfGroup) {
            const centerColor = {} as Record<Face, Face>;
            for (const f of FACES) centerColor[f] = colorOfGroup[groupOfFace[f]]!;
            if (!centersPossible(centerColor)) continue;
          }
          const table: number[][] = Array.from({ length: 54 }, () => FACES.map(() => 0));
          where.forEach((positions, k) =>
            positions.forEach((pos, i) => {
              table[pos] = FACES.map((f) => costs[k * 9 + i]![groupOfFace[f]]!);
            }),
          );
          const fit = bestValidCube(table);
          const cost = fit.cost + (input.spin && input.spin !== spin ? SPIN_PENALTY : 0);
          const state = stickersFromCubie(fit.cubie);
          answers.push({ cost, state });
          if (!best || cost < best.cost) best = { cost, cubie: fit.cubie, state, groupOfFace };
        }
      }
    }
  }
  if (!best) return { ok: false, reason: "impossible-colors" };
  const winner = best;
  const runnerUp = Math.min(
    Infinity,
    ...answers.filter((a) => a.state.some((v, i) => v !== winner.state[i])).map((a) => a.cost),
  );
  const faceColors = {} as Record<Face, Lab>;
  for (const f of FACES) faceColors[f] = centers[winner.groupOfFace[f]]!;
  return {
    ok: true,
    state: winner.state,
    cubie: winner.cubie,
    cost: winner.cost,
    runnerUp,
    faceColors,
    mirrored: input.mirrored,
  };
}
