import { applyMoves, parseAlg, solvedState } from "@solvepath/cube-core";
import { describe, expect, it } from "vitest";
import { CalibrationTracker } from "./calibrate";
import { toLab } from "./image";
import { DEFAULT_SCENE, renderScene } from "./synthetic";

const STATE = applyMoves(solvedState(), parseAlg("R U F"));

/** The cube moves from x0 to x1 (user's frame: + is the user's right) over 30 frames. */
function track(x0: number, x1: number, flipped: boolean) {
  const tracker = new CalibrationTracker();
  for (let t = 0; t < 30; t++) {
    const x = x0 + ((x1 - x0) * t) / 29;
    tracker.frame(
      toLab(renderScene({ ...DEFAULT_SCENE, state: STATE, offset: [x, 0, 0], flipped, seed: t })),
    );
  }
  return tracker.result();
}

describe("CalibrationTracker", () => {
  it("knows a normal camera: your right shows on the picture's left", () => {
    expect(track(-3, 4, false)).toEqual({ ok: true, mirrored: false });
  });
  it("knows a flipped camera", () => {
    expect(track(-3, 4, true)).toEqual({ ok: true, mirrored: true });
  });
  it("asks again if the cube barely moved", () => {
    expect(track(0, 0.8, false)).toEqual({ ok: false, reason: "too-small" });
  });
});
