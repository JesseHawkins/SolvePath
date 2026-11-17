/**
 * Which way the cube is moving, from one frame to the next (PLAN.md 5.5).
 *
 * We squash the guide box into a strip: the average lightness of each
 * column (for side-to-side motion) or each row (for up-and-down). Then we
 * find the shift that lines up this frame's strip with the last one.
 * It's a lot cheaper than full image matching and enough to tell left
 * from right.
 */
import type { Box } from "./grid";
import type { LabImage } from "./image";

/** Average lightness of each column (horizontal) or row (vertical) inside the box. */
export function lightnessStrip(image: LabImage, box: Box, horizontal: boolean): Float32Array {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(image.width, Math.floor(box.x + box.width));
  const y1 = Math.min(image.height, Math.floor(box.y + box.height));
  const strip = new Float32Array(horizontal ? x1 - x0 : y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      strip[horizontal ? x - x0 : y - y0]! += image.L[y * image.width + x]!;
    }
  }
  const n = horizontal ? y1 - y0 : x1 - x0;
  for (let i = 0; i < strip.length; i++) strip[i]! /= n || 1;
  return strip;
}

/**
 * The shift (in pixels) that best moves `before` onto `after`. Positive means
 * things moved toward the end of the strip (right, or down).
 */
export function stripShift(before: Float32Array, after: Float32Array, maxShift: number): number {
  const n = Math.min(before.length, after.length);
  // Compare changes, not raw lightness, so an overall brightness change doesn't matter.
  const grad = (s: Float32Array) => {
    const g = new Float32Array(n);
    for (let i = 1; i < n - 1; i++) g[i] = s[i + 1]! - s[i - 1]!;
    return g;
  };
  const a = grad(before);
  const b = grad(after);
  let best = 0;
  let bestScore = -Infinity;
  for (let shift = -maxShift; shift <= maxShift; shift++) {
    let sum = 0;
    let count = 0;
    for (let i = Math.max(1, -shift); i < Math.min(n - 1, n - 1 - shift); i++) {
      sum += a[i]! * b[i + shift]!;
      count++;
    }
    const score = count > 0 ? sum / count : -Infinity;
    if (score > bestScore) {
      bestScore = score;
      best = shift;
    }
  }
  return best;
}
