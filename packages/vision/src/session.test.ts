import {
  applyMoves,
  FACES,
  parseAlg,
  solvedState,
  statesEqual,
  type Face,
} from "@solvepath/cube-core";
import { describe, expect, it } from "vitest";
import { assembleCube } from "./assemble";
import { srgbToOklab, type Lab } from "./color";
import { runSyntheticScan, STICKERLESS_COLORS, type ScriptOptions } from "./synthetic";

const STATE = applyMoves(solvedState(), parseAlg("R U R' F2 D L' B U2 R2 F' L D'"));
const KNOWN = Object.fromEntries(
  FACES.map((f) => [f, srgbToOklab(...STICKERLESS_COLORS[f])]),
) as Record<Face, Lab>;

describe("ScanSession (synthetic grip-and-spin)", () => {
  for (const [name, options, mirrored] of [
    ["stickerless, spin y", { seed: 3 }, false],
    [
      "stickered, spin y', warm light",
      { seed: 4, spin: "y'", scene: { style: "stickered", lighting: "warm" } },
      false,
    ],
    ["flipped feed", { seed: 5, scene: { flipped: true } }, true],
  ] as [string, ScriptOptions, boolean][]) {
    it(`reads the right cube: ${name}`, { timeout: 60_000 }, () => {
      const { scan, captures, result } = runSyntheticScan(STATE, options, { mirrored });
      // One capture per hold, in order. (Seeing a side again is fine; it's ignored.)
      expect(captures.filter((c) => !c.startsWith("repeat"))).toEqual([
        "side@hold-side",
        "side@hold-side",
        "side@hold-side",
        "side@hold-side",
        "top@hold-top",
        "bottom@hold-bottom",
      ]);
      expect(scan.spinDirection()).toBe(options.spin ?? "y");
      expect(result?.ok).toBe(true);
      if (result?.ok) expect(statesEqual(result.state, STATE)).toBe(true);
    });
  }

  it("tells a flipped picture apart only with known colors", { timeout: 60_000 }, () => {
    const { scan } = runSyntheticScan(STATE, { seed: 6 }, { mirrored: false });
    const faces = { sides: scan.sides, top: scan.top!, bottom: scan.bottom!, spin: null };
    // Right flip setting: one clear answer, even without the spin direction.
    const right = assembleCube({ ...faces, mirrored: false });
    expect(right.ok && statesEqual(right.state, STATE)).toBe(true);
    expect(right.ok && right.runnerUp - right.cost).toBeGreaterThan(5);
    // Wrong flip setting, new colors: a mirror-image cube fits just as well. This is
    // why calibration matters for a cube with colors we haven't seen before.
    const wrong = assembleCube({ ...faces, mirrored: true });
    expect(wrong.ok && !statesEqual(wrong.state, STATE)).toBe(true);
    expect(wrong.ok && right.ok && Math.abs(wrong.cost - right.cost)).toBeLessThan(1);
    // Known colors: the mirror image has impossible centers, so a wrong flip setting
    // fits far worse, and "unknown" picks the right one by itself.
    const wrongKnown = assembleCube({ ...faces, mirrored: true, knownColors: KNOWN });
    expect(!wrongKnown.ok || (right.ok && wrongKnown.cost > right.cost + 20)).toBe(true);
    const either = assembleCube({ ...faces, mirrored: "unknown", knownColors: KNOWN });
    expect(either.ok && either.mirrored === false && statesEqual(either.state, STATE)).toBe(true);
  });
});
