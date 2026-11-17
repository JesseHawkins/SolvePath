/**
 * Reading the 9 sticker colors of a found face (PLAN.md 5.6, step 1).
 *
 * For each sticker we look at the inner half of its cell, drop shine
 * (glare) pixels, and take the median color, which ignores a few odd
 * pixels. A sticker with too much shine is marked as unsure.
 */
import { chroma, medianLab, type Lab } from "./color";
import { facePoint, type GridPose } from "./grid";
import { labAt, type LabImage } from "./image";

export interface StickerSample {
  color: Lab;
  /** Share of the patch that was shine and got dropped (0 to 1). */
  glare: number;
}

const PATCH = [-0.25, -0.15, -0.05, 0.05, 0.15, 0.25].map((k) => (k * 1) / 3);

/** Too much shine to trust a sticker. */
export const GLARE_LIMIT = 0.4;

/** The 9 stickers, row by row from the top-left, as the camera sees them. */
export function sampleStickers(image: LabImage, pose: GridPose): StickerSample[] {
  const out: StickerSample[] = [];
  const tmp: Lab = [0, 0, 0];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const u0 = (col - 1) / 3;
      const v0 = (row - 1) / 3;
      const pixels: Lab[] = [];
      for (const du of PATCH) {
        for (const dv of PATCH) {
          const p = facePoint(pose, u0 + du, v0 + dv);
          if (labAt(image, p.x, p.y, tmp)) pixels.push([tmp[0], tmp[1], tmp[2]]);
        }
      }
      if (pixels.length === 0) {
        out.push({ color: [0, 0, 0], glare: 1 });
        continue;
      }
      const middle = medianLab(pixels);
      // Shine: much lighter than the sticker and washed out (little color).
      const kept = pixels.filter(
        (p) => !(p[0] > middle[0] + 0.12 && chroma(p) < Math.max(0.03, chroma(middle) * 0.5)),
      );
      out.push({
        color: kept.length > 0 ? medianLab(kept) : middle,
        glare: 1 - kept.length / pixels.length,
      });
    }
  }
  return out;
}
