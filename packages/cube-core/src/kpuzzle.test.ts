/**
 * Cross-check against cubing.js, a separate, widely used cube model.
 *
 * cubing.js numbers its pieces its own way, so first we learn how its
 * numbering lines up with ours, using only how moves behave. Then for
 * thousands of random move sequences (every kind of move), both models must
 * agree on where every piece is and how it's turned.
 */
import fc from "fast-check";
import type { KPuzzle } from "cubing/kpuzzle";
import { cube3x3x3 } from "cubing/puzzles";
import { beforeAll, describe, expect, it } from "vitest";
import { CORNER_NAMES, cubieFromStickers, EDGE_NAMES } from "./cubie";
import { FACES, OPPOSITE_FACE } from "./faces";
import { applyMoves } from "./moves";
import { formatAlg, parseAlg } from "./notation";
import { isIdentity, solvedState } from "./state";
import { anyMoves } from "./test/arbitraries";

let kpuzzle: KPuzzle;
let cornerMap: number[]; // cubing.js corner spot -> our corner spot
let edgeMap: number[];
let centerMap: number[];

type Orbit = { pieces: number[]; orientation: number[] };
const kp = (alg: string) =>
  kpuzzle.defaultPattern().applyAlg(alg).patternData as unknown as Record<string, Orbit>;

/** Each cubing.js spot is matched to ours by which face turns move it. */
function learnSpotMap(orbit: "CORNERS" | "EDGES", names: readonly string[]): number[] {
  const n = names.length;
  const touchedBy: string[][] = Array.from({ length: n }, () => []);
  for (const face of FACES) {
    const data = kp(face)[orbit]!;
    for (let i = 0; i < n; i++) {
      if (data.pieces[i] !== i || data.orientation[i] !== 0) touchedBy[i]!.push(face);
    }
  }
  const map = touchedBy.map((faces) =>
    names.findIndex((name) => [...name].sort().join("") === faces.sort().join("")),
  );
  expect(new Set(map).size).toBe(n);
  expect(map).not.toContain(-1);
  return map;
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}

/**
 * Centers don't move with face turns, so try all 720 matchings and keep the
 * ones that slices and rotations agree on. Exactly two fit, and they differ
 * by swapping every center with the opposite one. That's expected: a quarter
 * turn of the whole cube looks the same with every center label swapped with
 * its opposite, so center data alone can't tell them apart. Either is fine.
 */
function learnCenterMap(): number[] {
  const tests = ["x", "y", "z", "M", "E", "S"];
  const fits = permutations([0, 1, 2, 3, 4, 5]).filter((map) =>
    tests.every((alg) => {
      const theirs = kp(alg).CENTERS!.pieces;
      const ours = cubieFromStickers(applyMoves(solvedState(), parseAlg(alg))).centers;
      return theirs.every((piece, spot) => ours[map[spot]!] === map[piece]);
    }),
  );
  expect(fits).toHaveLength(2);
  const opposite = FACES.map((f) => FACES.indexOf(OPPOSITE_FACE[f]));
  expect(fits[1]).toEqual(fits[0]!.map((face) => opposite[face]));
  return fits[0]!;
}

beforeAll(async () => {
  kpuzzle = await cube3x3x3.kpuzzle();
  cornerMap = learnSpotMap("CORNERS", CORNER_NAMES);
  edgeMap = learnSpotMap("EDGES", EDGE_NAMES);
  centerMap = learnCenterMap();
});

describe("cross-check with cubing.js", () => {
  it("agrees on every piece and twist after any sequence", () => {
    fc.assert(
      fc.property(anyMoves(60), (moves) => {
        const theirs = kp(formatAlg(moves, { wide: "w" }));
        const ours = cubieFromStickers(applyMoves(solvedState(), moves));
        const corners = theirs.CORNERS!;
        const edges = theirs.EDGES!;
        corners.pieces.forEach((piece, spot) => {
          expect(ours.cp[cornerMap[spot]!]).toBe(cornerMap[piece]);
          expect(ours.co[cornerMap[spot]!]).toBe(corners.orientation[spot]);
        });
        edges.pieces.forEach((piece, spot) => {
          expect(ours.ep[edgeMap[spot]!]).toBe(edgeMap[piece]);
          expect(ours.eo[edgeMap[spot]!]).toBe(edges.orientation[spot]);
        });
        theirs.CENTERS!.pieces.forEach((piece, spot) => {
          expect(ours.centers[centerMap[spot]!]).toBe(centerMap[piece]);
        });
      }),
      { numRuns: 2000 },
    );
  });

  it("agrees on which sequences solve the cube", () => {
    for (const alg of ["(R U)105", "(R U R' U')6", "(M U)4", "x y z x' y' z'", "(R U)52"]) {
      const theirs = kpuzzle.defaultPattern().applyAlg(alg).isIdentical(kpuzzle.defaultPattern());
      expect(isIdentity(applyMoves(solvedState(), parseAlg(alg))), alg).toBe(theirs);
    }
  });
});
