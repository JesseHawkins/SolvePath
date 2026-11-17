/**
 * Images as plain data, so the same code runs in a worker, in Node tests,
 * and on decoded video frames.
 *
 * Pixel (x, y): x grows to the right, y grows down, (0, 0) is the top-left
 * corner of the top-left pixel. A pixel's center is at (x + 0.5, y + 0.5).
 * Images are always the camera's raw view (never mirrored).
 */
import { srgbToOklab, type Lab } from "./color";

/** Same shape as the browser's ImageData: 4 bytes per pixel, RGBA. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray | Uint8Array;
}

/** An image already turned into OKLab, one plane per channel. */
export interface LabImage {
  readonly width: number;
  readonly height: number;
  readonly L: Float32Array;
  readonly a: Float32Array;
  readonly b: Float32Array;
}

/**
 * Converts an image to OKLab. With `region`, only pixels inside it are
 * converted (the rest stay black), which saves time when we only look near
 * the guide box.
 */
export function toLab(
  image: RgbaImage,
  region?: { x: number; y: number; width: number; height: number },
): LabImage {
  const n = image.width * image.height;
  const L = new Float32Array(n);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  const d = image.data;
  const out: Lab = [0, 0, 0];
  const x0 = region ? Math.max(0, Math.floor(region.x)) : 0;
  const y0 = region ? Math.max(0, Math.floor(region.y)) : 0;
  const x1 = region ? Math.min(image.width, Math.ceil(region.x + region.width)) : image.width;
  const y1 = region ? Math.min(image.height, Math.ceil(region.y + region.height)) : image.height;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * image.width + x;
      srgbToOklab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!, out);
      L[i] = out[0];
      a[i] = out[1];
      b[i] = out[2];
    }
  }
  return { width: image.width, height: image.height, L, a, b };
}

/** The pixel index nearest to point (x, y), or -1 if it's outside the image. */
export function pixelAt(image: { width: number; height: number }, x: number, y: number): number {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= image.width || py >= image.height) return -1;
  return py * image.width + px;
}

/** Reads the Lab color nearest to (x, y) into `out`. Returns false outside the image. */
export function labAt(image: LabImage, x: number, y: number, out: Lab): boolean {
  const i = pixelAt(image, x, y);
  if (i < 0) return false;
  out[0] = image.L[i]!;
  out[1] = image.a[i]!;
  out[2] = image.b[i]!;
  return true;
}

/** Shrinks an image by averaging blocks of pixels. Used in tests; the worker uses the browser's scaler. */
export function downscale(image: RgbaImage, width: number): RgbaImage {
  const scale = image.width / width;
  const height = Math.round(image.height / scale);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * scale);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale));
      const y0 = Math.floor(y * scale);
      const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale));
      const sum = [0, 0, 0, 0];
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * image.width + xx) * 4;
          for (let c = 0; c < 4; c++) sum[c]! += image.data[i + c]!;
        }
      }
      const count = (x1 - x0) * (y1 - y0);
      for (let c = 0; c < 4; c++) data[(y * width + x) * 4 + c] = sum[c]! / count;
    }
  }
  return { width, height, data };
}

/** Area to measure or brighten. */
type Area = { x: number; y: number; width: number; height: number };

function bounds(image: LabImage, box: Area) {
  return {
    x0: Math.max(0, Math.floor(box.x)),
    y0: Math.max(0, Math.floor(box.y)),
    x1: Math.min(image.width, Math.ceil(box.x + box.width)),
    y1: Math.min(image.height, Math.ceil(box.y + box.height)),
  };
}

/**
 * How much to brighten a picture, like a camera's auto exposure: 1 if the
 * box is bright enough, more if it's dark.
 */
export function exposureGain(image: LabImage, box: Area): number {
  const { x0, y0, x1, y1 } = bounds(image, box);
  const values: number[] = [];
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) values.push(image.L[y * image.width + x]!);
  }
  if (values.length === 0) return 1;
  values.sort((a, b) => a - b);
  const bright = values[Math.floor(values.length * 0.95)]!;
  if (bright >= DARK) return 1;
  return Math.min(MAX_GAIN, TARGET_BRIGHT / Math.max(bright, 1e-3));
}

/**
 * Brightens the box by `gain`. In OKLab, changing the exposure scales L, a,
 * and b by the same amount, so this is the same as the camera letting in
 * more light (noise and all).
 */
export function applyGain(image: LabImage, box: Area, gain: number): void {
  if (gain === 1) return;
  const { x0, y0, x1, y1 } = bounds(image, box);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * image.width + x;
      image.L[i]! *= gain;
      image.a[i]! *= gain;
      image.b[i]! *= gain;
    }
  }
}

/** Below this, the brightest part of the box counts as dark. */
const DARK = 0.6;
/** Brighten so the brightest part reaches about this. */
const TARGET_BRIGHT = 0.85;
/** Never brighten more than this (very dark pictures are mostly noise). */
const MAX_GAIN = 1.8;
