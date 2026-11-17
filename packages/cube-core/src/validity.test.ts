import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CORNER_STICKERS, EDGE_STICKERS } from "./cubie";
import type { Face } from "./faces";
import { applyMoves } from "./moves";
import { facelets, solvedState, statesEqual } from "./state";
import { anyMoves } from "./test/arbitraries";
import { diagnoseFacelets, type CubeProblem } from "./validity";

// These tests edit sticker labels on purpose: they stand in for a bad camera
// scan. Real cube states are only ever made by doing moves.
function kinds(labels: Face[]): CubeProblem["kind"][] {
  const d = diagnoseFacelets(labels);
  return d.ok ? [] : d.problems.map((p) => p.kind);
}
function solvedLabels(): Face[] {
  return facelets(solvedState());
}
function setAt(labels: Face[], positions: readonly number[], values: readonly Face[]): Face[] {
  const out = [...labels];
  positions.forEach((p, i) => (out[p] = values[i]!));
  return out;
}

describe("diagnoseFacelets", () => {
  it("accepts every cube reached by moves, held any way, and rebuilds it exactly", () => {
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        const s = applyMoves(solvedState(), moves);
        const d = diagnoseFacelets(facelets(s));
        expect(d.ok).toBe(true);
        if (d.ok) expect(statesEqual(d.state, s)).toBe(true);
      }),
    );
  });

  it("rejects the wrong number of stickers, or labels that aren't faces", () => {
    expect(kinds(solvedLabels().slice(1))).toEqual(["wrong-sticker-count"]);
    expect(diagnoseFacelets([...solvedLabels().slice(1), "Q"]).ok).toBe(false);
  });

  it("finds a twisted corner", () => {
    const urf = CORNER_STICKERS[0]!;
    expect(kinds(setAt(solvedLabels(), urf, ["R", "F", "U"]))).toEqual(["twisted-corner"]);
  });

  it("finds a flipped edge", () => {
    const uf = EDGE_STICKERS[1]!;
    expect(kinds(setAt(solvedLabels(), uf, ["F", "U"]))).toEqual(["flipped-edge"]);
  });

  it("finds two swapped pieces", () => {
    const [ur, uf] = [EDGE_STICKERS[0]!, EDGE_STICKERS[1]!];
    const labels = setAt(setAt(solvedLabels(), ur, ["U", "F"]), uf, ["U", "R"]);
    expect(kinds(labels)).toEqual(["swapped-pieces"]);
  });

  it("finds a corner whose colors can't exist (mirror image)", () => {
    const urf = CORNER_STICKERS[0]!;
    expect(kinds(setAt(solvedLabels(), urf, ["U", "F", "R"]))).toContain("unknown-corner");
  });

  it("finds a wrong color count and the pieces it breaks", () => {
    const labels = setAt(solvedLabels(), [0], ["D"]);
    const found = kinds(labels);
    expect(found).toContain("color-count");
    expect(found).toContain("unknown-corner");
    const d = diagnoseFacelets(labels);
    expect(!d.ok && d.problems).toContainEqual({ kind: "color-count", face: "D", count: 10 });
  });

  it("finds the same corner twice", () => {
    // URF shows UFL's colors, so UFL appears twice.
    const urf = CORNER_STICKERS[0]!;
    expect(kinds(setAt(solvedLabels(), urf, ["U", "F", "L"]))).toContain("duplicate-corner");
  });

  it("finds centers in an impossible arrangement", () => {
    expect(kinds(setAt(solvedLabels(), [13, 40], ["L", "R"]))).toContain("centers");
    expect(kinds(setAt(solvedLabels(), [4], ["F"]))).toContain("centers");
  });
});
