import { describe, expect, it } from "vitest";
import { parseAlg } from "@solvepath/cube-core";
import { arrowFor } from "./arrow";

const arrow = (alg: string) => arrowFor(parseAlg(alg)[0]!);

describe("arrowFor", () => {
  it("points up the right column of F for R", () => {
    expect(arrow("R")).toMatchObject({ direction: [0, 1, 0], normal: [0, 0, 1] });
    expect(arrow("R").center[0]).toBe(1);
    expect(arrow("R'").direction).toEqual([0, -1, 0]);
  });

  it("points left along the top row of F for U", () => {
    expect(arrow("U")).toMatchObject({ direction: [-1, 0, 0] });
    expect(arrow("U").center[1]).toBe(1);
  });

  it("uses the front row of U for F", () => {
    expect(arrow("F")).toMatchObject({ direction: [1, 0, 0], normal: [0, 1, 0] });
    expect(arrow("F").center[2]).toBe(1);
  });

  it("marks half turns and rotations", () => {
    expect(arrow("R2").double).toBe(true);
    expect(arrow("y").wide).toBe(true);
    expect(arrow("M").center[0]).toBe(0);
  });
});
