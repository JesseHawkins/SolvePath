/**
 * Scripted grip-and-spin scans: a list of frames, each a scene plus what is
 * really happening, so tests know the right answer.
 *
 * The scan: hold the first side to the camera, spin a quarter turn and hold
 * (three times, always the same way), tip the top toward the camera and
 * hold, then tip the bottom toward the camera and hold.
 */
import { applyMove, type CubeState, type Move } from "@solvepath/cube-core";
import { DEFAULT_SCENE, type SceneSpec } from "./render";
import { IDENTITY, mul, random, rotation, type M3, type V3 } from "./math3";

export type ScanPhase = "hold-side" | "spin" | "hold-top" | "tip" | "hold-bottom";

export interface ScriptFrame {
  scene: SceneSpec;
  phase: ScanPhase;
  /** Which hold this frame is part of (0-3 sides, 4 top, 5 bottom), or -1 while moving. */
  hold: number;
  /** How far the current spin or tip has gone, in degrees (0 while holding). */
  turned: number;
}

export interface ScanScript {
  /** The cube's true state at the start (camera sees its B face). */
  state: CubeState;
  /** "y" spins the front toward the user's left; "y'" toward their right. */
  spin: "y" | "y'";
  frames: ScriptFrame[];
}

export interface ScriptOptions {
  /** Frames per second of the vision loop. */
  fps?: number;
  holdSeconds?: number;
  turnSeconds?: number;
  spin?: "y" | "y'";
  /** How much the hand wobbles, in degrees. */
  wobble?: number;
  scene?: Partial<Omit<SceneSpec, "state" | "pose">>;
  seed?: number;
}

const TURN: Record<string, { axis: V3; angle: number }> = {
  y: { axis: [0, 1, 0], angle: -Math.PI / 2 },
  "y'": { axis: [0, 1, 0], angle: Math.PI / 2 },
  x: { axis: [1, 0, 0], angle: -Math.PI / 2 },
  "x'": { axis: [1, 0, 0], angle: Math.PI / 2 },
};

const MOVE: Record<string, Move> = {
  y: { family: "y", amount: 1 },
  "y'": { family: "y", amount: 3 },
  x: { family: "x", amount: 1 },
  "x'": { family: "x", amount: 3 },
};

export function gripAndSpin(state: CubeState, options: ScriptOptions = {}): ScanScript {
  const fps = options.fps ?? 15;
  const holdFrames = Math.round((options.holdSeconds ?? 1) * fps);
  const turnFrames = Math.round((options.turnSeconds ?? 0.6) * fps);
  const spin = options.spin ?? "y";
  const wobble = ((options.wobble ?? 2.5) * Math.PI) / 180;
  const seed = options.seed ?? 1;
  const rand = random(seed);
  const phases = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];

  const frames: ScriptFrame[] = [];
  let shown = state;
  let grip: M3 = IDENTITY;
  let t = 0;
  const push = (pose: M3, phase: ScanPhase, hold: number, turned = 0) => {
    const time = t / fps;
    const w = mul(
      rotation([0, 1, 0], wobble * Math.sin(time * 1.7 + phases[0]!)),
      rotation([1, 0, 0], wobble * Math.sin(time * 1.3 + phases[1]!)),
    );
    const drift: V3 = [
      0.25 * Math.sin(time * 0.9 + phases[2]!),
      0.2 * Math.sin(time * 1.1 + phases[3]!),
      0,
    ];
    frames.push({
      scene: {
        ...DEFAULT_SCENE,
        ...options.scene,
        state: shown,
        pose: mul(w, pose),
        grip,
        offset: drift,
        seed: seed * 1000 + t,
        backgroundSeed: seed,
      },
      phase,
      hold,
      turned,
    });
    t++;
  };
  const hold = (phase: ScanPhase, index: number) => {
    for (let i = 0; i < holdFrames; i++) push(IDENTITY, phase, index);
  };
  const turn = (name: string, phase: ScanPhase, frames = turnFrames) => {
    const { axis, angle } = TURN[name]!;
    for (let i = 1; i <= frames; i++) {
      const p = i / (frames + 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      push(rotation(axis, angle * eased), phase, -1, Math.abs((angle * eased * 180) / Math.PI));
    }
    shown = applyMove(shown, MOVE[name]!);
    // Tipping carries the fingers along; spinning turns the cube under them.
    if (name.startsWith("x")) grip = mul(rotation(axis, angle), grip);
  };

  hold("hold-side", 0);
  for (let side = 1; side < 4; side++) {
    turn(spin, "spin");
    hold("hold-side", side);
  }
  turn("x", "tip");
  hold("hold-top", 4);
  turn("x'", "tip");
  turn("x'", "tip");
  hold("hold-bottom", 5);
  return { state, spin, frames };
}
