/**
 * Makes a fake camera clip for the scan browser test: a synthetic
 * grip-and-spin scan of a known cube, saved as a .y4m video that Chrome can
 * play as if it were a webcam (--use-file-for-fake-video-capture).
 *
 * The cube comes from solved + a scramble (Rule 3), so the test knows the
 * right answer. The clip starts with a few seconds of empty room, so the
 * test can press "Start scan" before the cube shows up.
 */
import fs from "node:fs";
import path from "node:path";
import { applyMoves, parseAlg, solvedState } from "@solvepath/cube-core";
import { DEFAULT_SCENE, gripAndSpin, renderScene } from "@solvepath/vision/synthetic";

export const FAKE_CAMERA_SCRAMBLE = "R U R' F2 D L' B U2 R2 F' L D'";
export const FAKE_CAMERA_FPS = 15;
const EMPTY_SECONDS = 3;
/** Bump this when the clip's content changes, so the cached file is rebuilt. */
const VERSION = 1;

export const FAKE_CAMERA_FILE = path.resolve(
  import.meta.dirname,
  `../../../../test-results/fake-camera/scan-v${VERSION}.y4m`,
);

/** RGBA to the YUV 4:2:0 planes a .y4m file holds (BT.601, full range, like "C420jpeg"). */
function toYuv(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): Buffer {
  const y = Buffer.alloc(width * height);
  const u = Buffer.alloc((width / 2) * (height / 2));
  const v = Buffer.alloc((width / 2) * (height / 2));
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = (j * width + i) * 4;
      y[j * width + i] = 0.299 * rgba[k]! + 0.587 * rgba[k + 1]! + 0.114 * rgba[k + 2]!;
    }
  }
  for (let j = 0; j < height / 2; j++) {
    for (let i = 0; i < width / 2; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [di, dj] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const k = ((j * 2 + dj!) * width + i * 2 + di!) * 4;
        r += rgba[k]! / 4;
        g += rgba[k + 1]! / 4;
        b += rgba[k + 2]! / 4;
      }
      u[j * (width / 2) + i] = Math.max(
        0,
        Math.min(255, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b),
      );
      v[j * (width / 2) + i] = Math.max(
        0,
        Math.min(255, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b),
      );
    }
  }
  return Buffer.concat([y, u, v]);
}

export function makeFakeCameraClip(): string {
  if (fs.existsSync(FAKE_CAMERA_FILE)) return FAKE_CAMERA_FILE;
  fs.mkdirSync(path.dirname(FAKE_CAMERA_FILE), { recursive: true });
  const state = applyMoves(solvedState(), parseAlg(FAKE_CAMERA_SCRAMBLE));
  const script = gripAndSpin(state, { seed: 11, fps: FAKE_CAMERA_FPS, holdSeconds: 1.2 });
  const { width, height } = DEFAULT_SCENE;
  const out = fs.openSync(`${FAKE_CAMERA_FILE}.part`, "w");
  fs.writeSync(out, `YUV4MPEG2 W${width} H${height} F${FAKE_CAMERA_FPS}:1 Ip A1:1 C420jpeg\n`);
  const write = (rgba: Uint8ClampedArray | Uint8Array) => {
    fs.writeSync(out, "FRAME\n");
    fs.writeSync(out, toYuv(width, height, rgba));
  };
  // An empty room: the first frame's scene with the cube far behind the camera.
  const empty = renderScene({ ...script.frames[0]!.scene, offset: [0, 0, -1000], fingers: false });
  for (let i = 0; i < EMPTY_SECONDS * FAKE_CAMERA_FPS; i++) write(empty.data);
  for (const frame of script.frames) write(renderScene(frame.scene).data);
  // Hold the last side a while longer, so the loop doesn't restart mid-capture.
  fs.closeSync(out);
  fs.renameSync(`${FAKE_CAMERA_FILE}.part`, FAKE_CAMERA_FILE);
  return FAKE_CAMERA_FILE;
}
