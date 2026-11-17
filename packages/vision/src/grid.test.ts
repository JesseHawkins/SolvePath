import { applyMoves, parseAlg, solvedState } from "@solvepath/cube-core";
import { describe, expect, it } from "vitest";
import { fitGrid, type Box } from "./grid";
import { toLab } from "./image";
import { DEFAULT_SCENE, gripAndSpin, projectPoint, renderScene, type SceneSpec } from "./synthetic";

const SCRAMBLED = applyMoves(solvedState(), parseAlg("R U R' F2 D L' B U2 R2 F'"));

/** The middle of the picture, where the guide box is. */
function guideBox(width: number, height: number): Box {
  const side = Math.min(width, height) * 0.8;
  return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
}

/** Where the B face really is in a picture with no tilt. */
function truth(spec: SceneSpec) {
  const tl = projectPoint(spec, [1.5 + spec.offset[0], 1.5 + spec.offset[1], -1.5]);
  const br = projectPoint(spec, [-1.5 + spec.offset[0], -1.5 + spec.offset[1], -1.5]);
  return { cx: (tl.x + br.x) / 2, cy: (tl.y + br.y) / 2, size: br.x - tl.x };
}

describe("fitGrid", () => {
  for (const style of ["stickerless", "stickered"] as const) {
    for (const [name, state] of [
      ["scrambled", SCRAMBLED],
      ["solved", solvedState()],
    ] as const) {
      it(`finds a ${name} ${style} face`, () => {
        const spec: SceneSpec = { ...DEFAULT_SCENE, style, state, offset: [0.3, -0.2, 0] };
        const fit = fitGrid(toLab(renderScene(spec)), { box: guideBox(spec.width, spec.height) })!;
        const want = truth(spec);
        // What matters is that every cell's center lands well inside its sticker.
        // (On a stickered cube the fit may hug the stickers instead of the plastic edge.)
        expect(Math.abs(fit.pose.cx - want.cx)).toBeLessThan(want.size * 0.04);
        expect(Math.abs(fit.pose.cy - want.cy)).toBeLessThan(want.size * 0.04);
        expect(Math.abs(fit.pose.size - want.size) / want.size).toBeLessThan(0.15);
        expect(Math.abs(fit.pose.angle)).toBeLessThan(0.05);
      });
    }
  }

  // TODO(M2): label frames by their true spin angle; turns ease in and out, so
  // their first and last frames really are face-on and score like held faces.
  it.skip("scores held faces well above faces mid-spin", () => {
    const script = gripAndSpin(SCRAMBLED, { seed: 3 });
    const held: number[] = [];
    const moving: number[] = [];
    for (const [i, frame] of script.frames.entries()) {
      if (i % 2) continue;
      const fit = fitGrid(toLab(renderScene(frame.scene)), { box: guideBox(480, 270) });
      const score = fit?.score ?? -1;
      if (frame.hold >= 0) held.push(score);
      else moving.push(score);
    }
    held.sort((a, b) => a - b);
    moving.sort((a, b) => a - b);
    // The worst held face still beats nearly every mid-spin frame.
    const worstHeld = held[0]!;
    const beaten = moving.filter((m) => m < worstHeld).length / moving.length;
    expect(beaten).toBeGreaterThan(0.8);
  });
});
