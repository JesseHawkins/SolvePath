import {
  applyMoves,
  CENTER_STICKERS,
  DEFAULT_PROFILE,
  diagnoseFacelets,
  FACES,
  facelets,
  parseAlg,
  solvedState,
  type CubeState,
  type Face,
} from "@solvepath/cube-core";
import { hexToOklab, type Lab } from "@solvepath/vision";
import { describe, expect, it } from "vitest";
import { nameScannedColors, sameCube } from "./check";

const target = applyMoves(solvedState(), parseAlg("R U2 F' L D B2 R' U"));
const standardHex = (f: Face) => DEFAULT_PROFILE.displayColors[DEFAULT_PROFILE.scheme[f]];

/** A color as a camera might see it: a bit darker and warmer than the reference. */
function camera(hex: string): Lab {
  const [L, a, b] = hexToOklab(hex);
  return [L * 0.85, a * 0.9, b * 0.9 + 0.01];
}

/**
 * What a scan returns when the cube is held turned by `rotation`: stickers
 * labeled by where their center color sits, and the camera color of each label.
 */
function scanOf(cube: CubeState, rotation: string) {
  const held = applyMoves(cube, parseAlg(rotation));
  const heldFaces = facelets(held);
  const spotOf = {} as Record<Face, Face>; // a color's home face -> where its center is now
  for (const spot of FACES) spotOf[heldFaces[CENTER_STICKERS[spot]]!] = spot;
  const diagnosis = diagnoseFacelets(heldFaces.map((f) => spotOf[f]));
  if (!diagnosis.ok) throw new Error("bad test setup");
  const colors = {} as Record<Face, Lab>;
  for (const home of FACES) colors[spotOf[home]] = camera(standardHex(home));
  return { state: diagnosis.state, colors };
}

describe("sameCube", () => {
  for (const rotation of ["", "y", "x y2", "z'"]) {
    it(`matches the target held turned by "${rotation || "nothing"}"`, () => {
      const scan = scanOf(target, rotation);
      expect(sameCube(scan.state, nameScannedColors(scan.colors), target)).toBe(true);
    });
  }

  it("notices a different cube", () => {
    const scan = scanOf(applyMoves(target, parseAlg("R")), "y");
    expect(sameCube(scan.state, nameScannedColors(scan.colors), target)).toBe(false);
  });

  it("names camera colors with the standard ones", () => {
    const colors = {} as Record<Face, Lab>;
    for (const f of FACES) colors[f] = camera(standardHex(f));
    expect(nameScannedColors(colors)).toEqual(DEFAULT_PROFILE.scheme);
  });
});
