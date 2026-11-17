/**
 * A grip-and-spin scan, one camera frame at a time (PLAN.md 5.5).
 *
 * Feed it frames. It finds the face in the guide box, waits until the face
 * is held still for a moment, then captures it. It counts four sides, then
 * the top, then the bottom, keeps track of which way the cube spun, and at
 * the end puts the cube together.
 */
import { assembleCube, type AssembleResult, type FaceScan } from "./assemble";
import { colorDistance, medianLab, type Lab } from "./color";
import { fitGrid, type Box, type GridPose } from "./grid";
import { applyGain, exposureGain, type LabImage } from "./image";
import { lightnessStrip, stripShift } from "./motion";
import { GLARE_LIMIT, sampleStickers } from "./sample";
import type { Face } from "@solvepath/cube-core";

export type ScanStep = "sides" | "top" | "bottom" | "done";

/** What to tell the user right now. The app turns these into words. */
export type ScanHint =
  "find-cube" | "hold-still" | "spin" | "tip-top" | "tip-bottom" | "done" | "rescan";

export interface FrameReport {
  /** Where the face is, if we think we see one. */
  pose: GridPose | null;
  /** True while a face is held still and readable. */
  steady: boolean;
  /** Set on the frame a face is captured. "repeat" means we'd already seen it. */
  captured: "side" | "top" | "bottom" | "repeat" | null;
  step: ScanStep;
  sides: number;
  hint: ScanHint;
  /** Colors read this frame (camera order), for drawing on screen. */
  colors: Lab[] | null;
}

export interface SessionOptions {
  /**
   * True if the camera picture is flipped left to right (from calibration).
   * "unknown" works for cubes with known colors (see assembleCube).
   */
  mirrored: boolean | "unknown";
  knownColors?: Readonly<Record<Face, Lab>> | null;
}

/** How many steady frames in a row before we capture (about a third of a second at 12-15 per second). */
export const STEADY_FRAMES = 4;
/** Lowest grid score that can count as a face. */
export const MIN_SCORE = 0.28;
/** Most a sticker's color may change between frames and still count as steady. */
const MAX_CHANGE = 0.06;
/** Most the face may move between frames (share of its size). */
const MAX_MOVE = 0.06;
/** Two faces are the same if their stickers differ by less than this on average. */
const SAME_FACE = 0.05;
/** How fast the brightening follows the light (share per frame). */
const GAIN_SPEED = 0.1;
/** After a capture, the face has to change this much before we look for the next one. */
const RELEASE_CHANGE = 0.15;

interface Seen {
  pose: GridPose;
  score: number;
  colors: Lab[];
  glare: number[];
}

const faceDifference = (p: readonly (Lab | null)[], q: readonly (Lab | null)[]) => {
  let sum = 0;
  let n = 0;
  p.forEach((c, i) => {
    const d = q[i];
    if (c && d) {
      sum += colorDistance(c, d);
      n++;
    }
  });
  return n ? sum / n : Infinity;
};

/** A face turned a quarter turn clockwise on screen (camera order). */
const turned = (f: FaceScan): FaceScan => [6, 3, 0, 7, 4, 1, 8, 5, 2].map((i) => f[i]!);

export class ScanSession {
  private readonly options: SessionOptions;
  private recent: Seen[] = [];
  private locked: FaceScan | null = null;
  private previous: GridPose | null = null;
  private stripX: Float32Array | null = null;
  private motionX = 0;
  private spinVotes = 0;
  readonly sides: FaceScan[] = [];
  top: FaceScan | null = null;
  bottom: FaceScan | null = null;
  step: ScanStep = "sides";
  private assembled: AssembleResult | null = null;
  /** How much the last picture was brightened (1 = not at all). Lets the app say "more light, please". */
  gain = 1;

  constructor(options: SessionOptions) {
    this.options = options;
  }

  frame(image: LabImage, box: Box): FrameReport {
    // Side-to-side motion inside the box, for the spin direction.
    const strip = lightnessStrip(image, box, true);
    if (this.stripX) this.motionX += stripShift(this.stripX, strip, Math.round(box.width * 0.08));
    this.stripX = strip;

    // Brighten a dark picture first, like a camera's auto exposure.
    const margin = box.width * 0.1;
    const area = {
      x: box.x - margin,
      y: box.y - margin,
      width: box.width + 2 * margin,
      height: box.height + 2 * margin,
    };
    // Change slowly, so the same color looks the same on every face.
    this.gain = this.gain * (1 - GAIN_SPEED) + exposureGain(image, area) * GAIN_SPEED;
    applyGain(image, area, Math.abs(this.gain - 1) < 0.02 ? 1 : this.gain);
    const fit = fitGrid(image, { box, previous: this.previous });
    if (!fit || fit.score < MIN_SCORE) {
      this.recent = [];
      this.previous = null;
      if (this.locked) this.locked = null;
      return this.report(null, false, null, null);
    }
    this.previous = fit.pose;
    const samples = sampleStickers(image, fit.pose);
    const seen: Seen = {
      pose: fit.pose,
      score: fit.score,
      colors: samples.map((s) => s.color),
      glare: samples.map((s) => s.glare),
    };
    const last = this.recent[this.recent.length - 1];
    const steadyStep =
      last !== undefined &&
      Math.max(...seen.colors.map((c, i) => colorDistance(c, last.colors[i]!))) <= MAX_CHANGE &&
      Math.hypot(seen.pose.cx - last.pose.cx, seen.pose.cy - last.pose.cy) <=
        MAX_MOVE * seen.pose.size;
    this.recent = steadyStep ? [...this.recent, seen].slice(-STEADY_FRAMES) : [seen];

    if (this.locked && faceDifference(this.locked, seen.colors) > RELEASE_CHANGE)
      this.locked = null;
    const steady = this.recent.length >= STEADY_FRAMES;
    let captured: FrameReport["captured"] = null;
    if (steady && !this.locked && this.step !== "done") {
      const scan: FaceScan = seen.colors.map((_, i) => {
        const tooShiny =
          this.recent.filter((r) => r.glare[i]! > GLARE_LIMIT).length > STEADY_FRAMES / 2;
        return tooShiny ? null : medianLab(this.recent.map((r) => r.colors[i]!));
      });
      this.locked = scan;
      captured = this.capture(scan);
    }
    return this.report(fit.pose, steady, captured, seen.colors);
  }

  private capture(scan: FaceScan): FrameReport["captured"] {
    const matches = (f: FaceScan | null, anyTurn: boolean) => {
      if (!f) return false;
      let g = f;
      for (let k = 0; k < (anyTurn ? 4 : 1); k++, g = turned(g)) {
        if (faceDifference(g, scan) < SAME_FACE) return true;
      }
      return false;
    };
    if (this.sides.some((s) => matches(s, this.step !== "sides"))) return "repeat";
    if (this.step === "sides") {
      if (this.sides.length > 0) this.spinVotes += Math.sign(this.motionX);
      this.motionX = 0;
      this.sides.push(scan);
      if (this.sides.length === 4) this.step = "top";
      return "side";
    }
    if (this.step === "top") {
      this.top = scan;
      this.step = "bottom";
      return "top";
    }
    if (matches(this.top, true)) return "repeat";
    this.bottom = scan;
    this.step = "done";
    this.assembled = assembleCube({
      sides: this.sides,
      top: this.top!,
      bottom: scan,
      spin: this.spinDirection(),
      mirrored: this.options.mirrored,
      knownColors: this.options.knownColors ?? null,
    });
    return "bottom";
  }

  /**
   * Which way the cube spun, from the votes. A "y" spin moves the face toward
   * the user's right, which is the picture's left unless the feed is flipped.
   */
  spinDirection(): "y" | "y'" | null {
    if (this.spinVotes === 0 || this.options.mirrored === "unknown") return null;
    const towardImageLeft = this.spinVotes < 0;
    return towardImageLeft !== this.options.mirrored ? "y" : "y'";
  }

  result(): AssembleResult | null {
    return this.assembled;
  }

  private report(
    pose: GridPose | null,
    steady: boolean,
    captured: FrameReport["captured"],
    colors: Lab[] | null,
  ): FrameReport {
    let hint: ScanHint;
    if (this.step === "done") hint = this.assembled?.ok ? "done" : "rescan";
    else if (!pose)
      hint =
        this.sides.length === 0
          ? "find-cube"
          : this.step === "sides"
            ? "spin"
            : this.step === "top"
              ? "tip-top"
              : "tip-bottom";
    else if (this.locked)
      hint = this.step === "sides" ? "spin" : this.step === "top" ? "tip-top" : "tip-bottom";
    else hint = "hold-still";
    return { pose, steady, captured, step: this.step, sides: this.sides.length, hint, colors };
  }
}
