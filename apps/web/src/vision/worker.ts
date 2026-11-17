/**
 * The vision worker: reads camera frames off the main thread (PLAN.md 5.2).
 *
 * Each frame arrives as an ImageBitmap (moved here, not copied), gets read
 * once, and is closed right away. Nothing is kept or sent anywhere.
 */
import * as Comlink from "comlink";
import {
  CalibrationTracker,
  ScanSession,
  toLab,
  type AssembleResult,
  type Box,
  type CalibrationResult,
  type FrameReport,
  type SessionOptions,
} from "@solvepath/vision";

/** The guide box: a centered square, this share of the picture's short side. */
export const GUIDE_BOX_SHARE = 0.8;

export function guideBox(width: number, height: number): Box {
  const side = Math.min(width, height) * GUIDE_BOX_SHARE;
  return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
}

export interface WorkerFrame extends FrameReport {
  /** Picture size the worker saw, for drawing the overlay. */
  width: number;
  height: number;
  box: Box;
  /** Time spent on this frame, in milliseconds. */
  ms: number;
  result: AssembleResult | null;
}

let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
let session: ScanSession | null = null;
let calibration: CalibrationTracker | null = null;

function pixels(bitmap: ImageBitmap): ImageData {
  if (!canvas || canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    context = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!context) throw new Error("No 2D canvas in this worker.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const api = {
  startScan(options: SessionOptions): void {
    session = new ScanSession(options);
  },

  scanFrame(bitmap: ImageBitmap): WorkerFrame | null {
    const start = performance.now();
    const image = pixels(bitmap);
    if (!session) return null;
    const box = guideBox(image.width, image.height);
    const margin = box.width * 0.1;
    const lab = toLab(image, {
      x: box.x - margin,
      y: box.y - margin,
      width: box.width + 2 * margin,
      height: box.height + 2 * margin,
    });
    const report = session.frame(lab, box);
    return {
      ...report,
      width: image.width,
      height: image.height,
      box,
      ms: performance.now() - start,
      result: session.result(),
    };
  },

  startCalibration(): void {
    calibration = new CalibrationTracker();
  },

  calibrationFrame(bitmap: ImageBitmap): void {
    const image = pixels(bitmap);
    calibration?.frame(toLab(image));
  },

  calibrationResult(): CalibrationResult | null {
    return calibration?.result() ?? null;
  },
};

export type VisionApi = typeof api;
Comlink.expose(api);
