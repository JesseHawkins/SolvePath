import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatAlg, NotationError, parseAlg } from "./notation";
import { anyMoves } from "./test/arbitraries";

describe("notation", () => {
  it("reads faces, primes, and half turns", () => {
    expect(parseAlg("R U' F2")).toEqual([
      { family: "R", amount: 1 },
      { family: "U", amount: 3 },
      { family: "F", amount: 2 },
    ]);
  });

  it("reads wide moves both ways", () => {
    expect(parseAlg("r Rw u' Uw2 2Rw")).toEqual([
      { family: "Rw", amount: 1 },
      { family: "Rw", amount: 1 },
      { family: "Uw", amount: 3 },
      { family: "Uw", amount: 2 },
      { family: "Rw", amount: 1 },
    ]);
  });

  it("reads slices and rotations", () => {
    expect(parseAlg("M' E2 S x y' z2")).toEqual([
      { family: "M", amount: 3 },
      { family: "E", amount: 2 },
      { family: "S", amount: 1 },
      { family: "x", amount: 1 },
      { family: "y", amount: 3 },
      { family: "z", amount: 2 },
    ]);
  });

  it("treats R2' like R2 and R3 like R'", () => {
    expect(parseAlg("R2' R3 R4")).toEqual([
      { family: "R", amount: 2 },
      { family: "R", amount: 3 },
    ]);
  });

  it("expands groups, repeats, commutators, and conjugates", () => {
    expect(formatAlg(parseAlg("(R U)2"))).toBe("R U R U");
    expect(formatAlg(parseAlg("[R, U]"))).toBe("R U R' U'");
    expect(formatAlg(parseAlg("[F: R]"))).toBe("F R F'");
  });

  it("ignores pauses and comments", () => {
    expect(formatAlg(parseAlg("R . U // a comment"))).toBe("R U");
  });

  it("rejects moves a 3x3 doesn't have", () => {
    for (const bad of ["3R", "2-3Rw", "Q", "Lw3w", "R++"]) {
      expect(() => parseAlg(bad), bad).toThrow(NotationError);
    }
  });

  it("formats wide moves as lowercase by default, or with w", () => {
    const moves = parseAlg("Rw u'");
    expect(formatAlg(moves)).toBe("r u'");
    expect(formatAlg(moves, { wide: "w" })).toBe("Rw Uw'");
  });

  it("reads back whatever it writes", () => {
    fc.assert(
      fc.property(anyMoves(), (moves) => {
        expect(parseAlg(formatAlg(moves))).toEqual(moves);
        expect(parseAlg(formatAlg(moves, { wide: "w" }))).toEqual(moves);
      }),
    );
  });
});
