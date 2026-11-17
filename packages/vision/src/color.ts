/**
 * Color math in OKLab (Björn Ottosson, 2020, public domain).
 *
 * OKLab is a "perceptual" color space: equal distances look about equally
 * different to people. L is lightness (0 black to 1 white); a and b are the
 * color direction (a: green to red, b: blue to yellow). Shading mostly
 * changes L, so we count L less when comparing sticker colors.
 */

export type Lab = [number, number, number];

/** sRGB byte (0-255) to linear light, as a lookup table. */
const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function srgbToOklab(r: number, g: number, b: number, out: Lab = [0, 0, 0]): Lab {
  const lr = LINEAR[r]!;
  const lg = LINEAR[g]!;
  const lb = LINEAR[b]!;
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return out;
}

/** Hex color like "#ff7a00" to OKLab. */
export function hexToOklab(hex: string): Lab {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return srgbToOklab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** How much lightness counts compared with color, when telling stickers apart. */
export const LIGHTNESS_WEIGHT = 0.5;

/** Distance between two sticker colors, counting lightness less (shading changes it most). */
export function colorDistance(p: Lab, q: Lab): number {
  const dL = (p[0] - q[0]) * LIGHTNESS_WEIGHT;
  const da = p[1] - q[1];
  const db = p[2] - q[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Plain distance in OKLab (all channels count the same). */
export function labDistance(p: Lab, q: Lab): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Chroma: how colorful (0 for white, gray, black). */
export function chroma(p: Lab): number {
  return Math.hypot(p[1], p[2]);
}

/** Per-channel median of a list of colors. Robust against a few odd pixels. */
export function medianLab(colors: readonly Lab[]): Lab {
  const mid = (values: number[]) => {
    values.sort((x, y) => x - y);
    const h = values.length >> 1;
    return values.length % 2 ? values[h]! : (values[h - 1]! + values[h]!) / 2;
  };
  return [mid(colors.map((c) => c[0])), mid(colors.map((c) => c[1])), mid(colors.map((c) => c[2]))];
}

export function meanLab(colors: readonly Lab[]): Lab {
  const sum: Lab = [0, 0, 0];
  for (const c of colors) {
    sum[0] += c[0];
    sum[1] += c[1];
    sum[2] += c[2];
  }
  const n = colors.length || 1;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}
