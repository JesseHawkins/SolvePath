/** Runs a scripted scan through a scan session, for tests and the accuracy report. */
import type { CubeState } from "@solvepath/cube-core";
import type { Box } from "../grid";
import { toLab } from "../image";
import { ScanSession, type SessionOptions } from "../session";
import { renderScene } from "./render";
import { gripAndSpin, type ScriptOptions } from "./script";

/** The guide box used with the default 480 x 270 synthetic pictures. */
export const SYNTHETIC_BOX: Box = { x: 132, y: 27, width: 216, height: 216 };

export function runSyntheticScan(
  state: CubeState,
  script: ScriptOptions,
  session: SessionOptions,
  box: Box = SYNTHETIC_BOX,
) {
  const frames = gripAndSpin(state, script).frames;
  const scan = new ScanSession(session);
  const region = { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 };
  const captures: string[] = [];
  let ms = 0;
  for (const frame of frames) {
    const image = renderScene(frame.scene);
    const t = Date.now();
    const report = scan.frame(toLab(image, region), box);
    ms += Date.now() - t;
    if (report.captured) captures.push(`${report.captured}@${frame.phase}`);
  }
  return { scan, captures, result: scan.result(), msPerFrame: ms / frames.length };
}
