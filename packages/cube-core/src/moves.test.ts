import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ALL_MOVES,
  applyMove,
  applyMoves,
  invertMoves,
  moveForLayerTurn,
  movePermutation,
  moveTurn,
  type Move,
} from "./moves";
import { parseAlg } from "./notation";
import { colorAt, faceletString, isIdentity, solvedState, statesEqual } from "./state";
import { anyMoves } from "./test/arbitraries";

const run = (alg: string) => applyMoves(solvedState(), parseAlg(alg));
const same = (a: string, b: string) => statesEqual(run(a), run(b));

function order(alg: string): number {
  const moves = parseAlg(alg);
  let s = applyMoves(solvedState(), moves);
  let n = 1;
  while (!isIdentity(s)) {
    s = applyMoves(s, moves);
    n++;
  }
  return n;
}

describe("moves", () => {
  it("are all real permutations", () => {
    for (const m of ALL_MOVES) {
      expect(new Set(movePermutation(m)).size).toBe(54);
    }
  });

  it("quarter turns come back after 4, half turns after 2", () => {
    for (const m of ALL_MOVES) {
      let s = solvedState();
      const times = m.amount === 2 ? 2 : 4;
      for (let i = 0; i < times; i++) s = applyMove(s, m);
      expect(isIdentity(s), `${m.family}${m.amount}`).toBe(true);
    }
  });

  it("undo themselves: a sequence then its inverse is solved", () => {
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        const s = applyMoves(applyMoves(solvedState(), moves), invertMoves(moves));
        return isIdentity(s);
      }),
    );
  });

  it("turn R clockwise as seen from the right", () => {
    // After R, the F face's right column shows the D color (stickers move up from D to F).
    const s = run("R");
    expect([20, 23, 26].map((p) => colorAt(s, p))).toEqual(["D", "D", "D"]);
    expect([2, 5, 8].map((p) => colorAt(s, p))).toEqual(["F", "F", "F"]);
  });

  it("turn U clockwise as seen from above", () => {
    // After U, the F face's top row shows R's color.
    const s = run("U");
    expect([18, 19, 20].map((p) => colorAt(s, p))).toEqual(["R", "R", "R"]);
  });

  it("give the expected facelet string for F", () => {
    // Worked out from the net in geometry.ts: U's bottom row gets L's right column,
    // R's left column gets U's bottom row, D's top row gets R's left column,
    // and L's right column gets D's top row.
    expect(faceletString(run("F"))).toBe("UUUUUULLLURRURRURRFFFFFFFFFRRRDDDDDDLLDLLDLLDBBBBBBBBB");
  });

  it("keep slices, wide moves, and rotations consistent with face turns", () => {
    expect(same("M", "R L' x'")).toBe(true);
    expect(same("E", "U D' y'")).toBe(true);
    expect(same("S", "F' B z")).toBe(true);
    expect(same("Rw", "L x")).toBe(true);
    expect(same("Uw", "D y")).toBe(true);
    expect(same("Fw", "B z")).toBe(true);
    expect(same("r", "R M'")).toBe(true);
    expect(same("u", "U E'")).toBe(true);
    expect(same("f", "F S")).toBe(true);
    expect(same("l", "L M")).toBe(true);
    expect(same("d", "D E")).toBe(true);
    expect(same("b", "B S'")).toBe(true);
  });

  it("have the well-known orders", () => {
    expect(order("R U R' U'")).toBe(6);
    expect(order("R U")).toBe(105);
    expect(order("R2 U2")).toBe(6);
    expect(order("M U")).toBe(order("M' U'"));
  });

  it("show half turns going the same way as the single turn", () => {
    for (const m of ALL_MOVES) {
      const t = moveTurn(m);
      expect(((t.signedQuarterTurns % 4) + 4) % 4, `${m.family}${m.amount}`).toBe(
        t.quarterTurnsCcw,
      );
      if (m.amount === 2) {
        const single = moveTurn({ family: m.family, amount: 1 });
        expect(t.signedQuarterTurns).toBe(2 * single.signedQuarterTurns);
      }
    }
    // R turns clockwise as seen from the right, which is clockwise about +x.
    expect(moveTurn({ family: "R", amount: 2 }).signedQuarterTurns).toBe(-2);
  });

  it("describe their 3D turn so it can be drawn and swiped", () => {
    for (const m of ALL_MOVES) {
      const t = moveTurn(m);
      if (t.kind === "wide") continue;
      const layer = t.layers.length === 3 ? "all" : (t.layers[0] as -1 | 0 | 1);
      const back: Move = moveForLayerTurn(t.axis, layer, t.quarterTurnsCcw);
      expect(back).toEqual(m);
    }
  });
});
