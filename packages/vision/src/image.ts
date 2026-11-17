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

export function toLab(image: RgbaImage): LabImage {
  const n = image.width * image.height;
  const L = new Float32Array(n);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  const d = image.data;
  const out: Lab = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    srgbToOklab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!, out);
    L[i] = out[0];
    a[i] = out[1];
    b[i] = out[2];
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
