import { describe, expect, it } from "vitest";
import { parseAlg, type Vec3 } from "@solvepath/cube-core";
import { arcDirection, arcPoint, arrowFor, type ArcArrow, type StripArrow } from "./arrow";

const strip = (alg: string) => arrowFor(parseAlg(alg)[0]!) as StripArrow;
const arc = (alg: string) => arrowFor(parseAlg(alg)[0]!) as ArcArrow;
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe("arrowFor, layer turns", () => {
  it("points up the right column of F for R", () => {
    expect(strip("R")).toMatchObject({ kind: "strip", direction: [0, 1, 0], normal: [0, 0, 1] });
    expect(strip("R").center[0]).toBe(1);
    expect(strip("R'").direction).toEqual([0, -1, 0]);
  });

  it("points left along the top row of F for U", () => {
    expect(strip("U").direction).toEqual([-1, 0, 0]);
    expect(strip("U").center[1]).toBe(1);
  });

  it("uses the front row of U for F", () => {
    expect(strip("F")).toMatchObject({ direction: [1, 0, 0], normal: [0, 1, 0] });
    expect(strip("F").center[2]).toBe(1);
  });

  it("covers two layers for wide moves, and marks half turns", () => {
    expect(strip("r")).toMatchObject({ layers: 2, direction: [0, 1, 0] });
    expect(strip("r").center[0]).toBe(0.5);
    expect(strip("M").center[0]).toBe(0);
    expect(strip("R2").double).toBe(true);
  });
});

describe("arrowFor, whole-cube rotations", () => {
  it("uses a curved arrow that reaches past the cube", () => {
    for (const alg of ["x", "x'", "y", "y'", "z", "z'", "y2"]) {
      const a = arc(alg);
      expect(a.kind).toBe("arc");
      expect(a.radius).toBeGreaterThan(Math.SQRT2 * 1.5); // clears the cube's edges
      expect(Math.abs(a.to - a.from)).toBeGreaterThan(Math.PI / 2); // longer than a face
    }
  });

  it("heads the same way the cube turns, everywhere along the arc", () => {
    // x turns like R (the front goes up): clockwise about +x. y' and z' are counterclockwise.
    const expected: Record<string, 1 | -1> = { x: -1, "x'": 1, y: -1, "y'": 1, z: -1, "z'": 1 };
    for (const [alg, sign] of Object.entries(expected)) {
      const a = arc(alg);
      for (const t of [0, 0.5, 1]) {
        const angle = a.from + (a.to - a.from) * t;
        const p = arcPoint(a, angle);
        const motion = cross(a.axis, p).map((n) => n * sign) as unknown as Vec3;
        expect(dot(arcDirection(a, angle), motion), `${alg} at ${t}`).toBeGreaterThan(0);
      }
    }
  });

  it("wraps around the side facing the camera", () => {
    const a = arc("y");
    const middle = arcPoint(a, (a.from + a.to) / 2);
    expect(middle[2]).toBeGreaterThan(0); // in front
    expect(middle[0]).toBeGreaterThan(0); // toward the camera's right side
  });

  it("goes left across the front for y (like U)", () => {
    const a = arc("y");
    const angle = (a.from + a.to) / 2;
    expect(arcDirection(a, angle)[0]).toBeLessThan(0);
  });
});
