/**
 * Left/right calibration, once per camera (PLAN.md 5.4).
 *
 * The user holds the cube up and moves it to their right. We follow the
 * colorful, moving part of the picture (the cube) and see which way it goes.
 * A normal camera facing you shows your right on its left. If the cube went
 * to the picture's right instead, the picture is flipped (some webcam tools
 * and virtual cameras do this).
 */
import { chroma, type Lab } from "./color";
import type { LabImage } from "./image";

export type CalibrationResult =
  | { ok: true; mirrored: boolean }
  /** "too-small": the cube didn't move far enough. "unclear": it went back and forth. */
  | { ok: false; reason: "too-small" | "unclear" | "no-cube" };

/** The cube must move at least this share of the picture's width. */
export const MIN_TRAVEL = 0.15;
/** Pixels at least this colorful can be the cube. */
const MIN_CHROMA = 0.08;
/** Pixels that changed this much since the last frame are moving. */
const MIN_CHANGE = 0.04;
/** Look at every Nth pixel (enough for a center point, and much faster). */
const STEP = 2;

export class CalibrationTracker {
  private previous: LabImage | null = null;
  private readonly xs: number[] = [];
  private width = 1;

  /** Feed each frame during the countdown. */
  frame(image: LabImage): void {
    this.width = image.width;
    const prev = this.previous;
    this.previous = image;
    if (!prev || prev.width !== image.width || prev.height !== image.height) return;
    let sumX = 0;
    let count = 0;
    const c: Lab = [0, 0, 0];
    for (let y = 0; y < image.height; y += STEP) {
      for (let x = 0; x < image.width; x += STEP) {
        const i = y * image.width + x;
        c[0] = image.L[i]!;
        c[1] = image.a[i]!;
        c[2] = image.b[i]!;
        if (chroma(c) < MIN_CHROMA) continue;
        const change = Math.hypot(
          image.L[i]! - prev.L[i]!,
          image.a[i]! - prev.a[i]!,
          image.b[i]! - prev.b[i]!,
        );
        if (change < MIN_CHANGE) continue;
        sumX += x;
        count++;
      }
    }
    // Too few moving colorful pixels: nothing moved this frame.
    if (count >= 20) this.xs.push(sumX / count);
  }

  result(): CalibrationResult {
    const n = this.xs.length;
    if (n < 4) return { ok: false, reason: "no-cube" };
    // Straight-line fit of position over time.
    const meanT = (n - 1) / 2;
    const meanX = this.xs.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    let total = 0;
    this.xs.forEach((x, t) => {
      num += (t - meanT) * (x - meanX);
      den += (t - meanT) ** 2;
      total += (x - meanX) ** 2;
    });
    const slope = num / den;
    const travel = Math.abs(slope * (n - 1)) / this.width;
    // How well a straight line explains the motion (1 = perfectly).
    const fit = total > 0 ? (num * num) / (den * total) : 0;
    if (travel < MIN_TRAVEL) return { ok: false, reason: "too-small" };
    if (fit < 0.5) return { ok: false, reason: "unclear" };
    // Moving to the picture's left is normal (your right is the camera's left).
    return { ok: true, mirrored: slope > 0 };
  }
}
