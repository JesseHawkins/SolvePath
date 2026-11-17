/**
 * The vision accuracy report (PLAN.md 5.11). Not a normal unit test: run it
 * with `npm run vision:report`. CI runs it too.
 *
 * It scans synthetic cubes under different conditions, plus every real clip
 * in packages/test-fixtures/vision (if ffmpeg is installed to read them),
 * writes the results to docs/vision-accuracy.md, and fails if anything got
 * worse than the saved baseline (packages/vision/accuracy-baseline.json).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  applyMoves,
  colorAt,
  parseAlg,
  solvedState,
  statesEqual,
  type CubeState,
} from "@solvepath/cube-core";
import { expect, test } from "vitest";
import { nameScannedColors, sameCube } from "../src/check";
import type { Box } from "../src/grid";
import { toLab } from "../src/image";
import { ScanSession } from "../src/session";
import { runSyntheticScan, type CubeStyle, type Lighting } from "../src/synthetic";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const FIXTURES = path.join(ROOT, "packages/test-fixtures/vision");
const BASELINE = path.join(ROOT, "packages/vision/accuracy-baseline.json");
const REPORT = path.join(ROOT, "docs/vision-accuracy.md");

const SCRAMBLES = [
  "R U R' F2 D L' B U2 R2 F' L D'",
  "D2 B' L2 U F' R2 D' B L' U2 R F2",
  "F R' U2 L B2 D' R F' U L2 B D2",
  "L' D R2 B' U' F2 L U R' D2 F B'",
];

interface Row {
  name: string;
  /** Faces captured in the right order (side x4, top, bottom). */
  captures: boolean;
  /** Share of the 54 stickers read right. */
  stickers: number;
  /** The whole cube read exactly right. */
  cube: boolean;
  /** Sure about the answer (clear winner). */
  sure: boolean;
  ms: number;
}

function stickerAccuracy(got: CubeState, want: CubeState): number {
  let right = 0;
  for (let i = 0; i < 54; i++) if (colorAt(got, i) === colorAt(want, i)) right++;
  return right / 54;
}

function syntheticRows(): Row[] {
  const rows: Row[] = [];
  let k = 0;
  for (const style of ["stickerless", "stickered"] as CubeStyle[]) {
    for (const lighting of ["daylight", "warm", "dim", "glare"] as Lighting[]) {
      for (const flipped of [false, true]) {
        const scramble = SCRAMBLES[k % SCRAMBLES.length]!;
        const spin = k % 2 ? "y'" : "y";
        k++;
        const state = applyMoves(solvedState(), parseAlg(scramble));
        const run = runSyntheticScan(
          state,
          { seed: 100 + k, spin, scene: { style, lighting, flipped } },
          { mirrored: flipped },
        );
        const ok = run.result?.ok ? run.result : null;
        rows.push({
          name: `synthetic ${style}, ${lighting}${flipped ? ", flipped feed" : ""}`,
          captures:
            run.captures.filter((c) => !c.startsWith("repeat")).join(" ") ===
            "side@hold-side side@hold-side side@hold-side side@hold-side top@hold-top bottom@hold-bottom",
          stickers: ok ? stickerAccuracy(ok.state, state) : 0,
          cube: ok ? statesEqual(ok.state, state) : false,
          sure: ok ? ok.runnerUp - ok.cost > 10 : false,
          ms: run.msPerFrame,
        });
      }
    }
  }
  return rows;
}

interface FixtureMeta {
  scramble: string;
  cube: string;
  lighting: string;
  flipped: boolean;
  marked?: boolean;
}

const hasFfmpeg = () => spawnSync("ffmpeg", ["-version"]).status === 0;

/** Decodes a clip to 15 frames per second, short side 270 pixels, RGBA. */
function decode(clip: string): { width: number; height: number; frames: Uint8Array[] } {
  const probe = execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:stream_side_data=rotation",
    "-of",
    "json",
    clip,
  ]).toString();
  const info = JSON.parse(probe) as {
    streams: { width: number; height: number; side_data_list?: { rotation?: number }[] }[];
  };
  const s = info.streams[0]!;
  const rotated = Math.abs(s.side_data_list?.[0]?.rotation ?? 0) % 180 === 90;
  const [w0, h0] = rotated ? [s.height, s.width] : [s.width, s.height];
  const scale = 270 / Math.min(w0, h0);
  const width = Math.round((w0 * scale) / 2) * 2;
  const height = Math.round((h0 * scale) / 2) * 2;
  const raw = execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      clip,
      "-vf",
      `fps=15,scale=${width}:${height}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-",
    ],
    { maxBuffer: 1 << 30 },
  );
  const size = width * height * 4;
  const frames: Uint8Array[] = [];
  for (let o = 0; o + size <= raw.length; o += size) frames.push(raw.subarray(o, o + size));
  return { width, height, frames };
}

function realRows(): { rows: Row[]; note: string } {
  if (!fs.existsSync(FIXTURES)) return { rows: [], note: "No real clips yet." };
  const metas = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json"));
  if (metas.length === 0) return { rows: [], note: "No real clips yet." };
  if (!hasFfmpeg())
    return {
      rows: [],
      note: `ffmpeg isn't installed, so ${metas.length} real clips were skipped.`,
    };
  const rows: Row[] = [];
  for (const metaFile of metas) {
    const meta = JSON.parse(fs.readFileSync(path.join(FIXTURES, metaFile), "utf8")) as FixtureMeta;
    const base = metaFile.replace(/\.json$/, "");
    const clip = fs
      .readdirSync(FIXTURES)
      .find((f: string) => f.startsWith(`${base}.`) && !f.endsWith(".json"));
    if (!clip) continue;
    const { width, height, frames } = decode(path.join(FIXTURES, clip));
    const side = Math.min(width, height) * 0.8;
    const box: Box = { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
    const margin = side * 0.1;
    const region = {
      x: box.x - margin,
      y: box.y - margin,
      width: side + 2 * margin,
      height: side + 2 * margin,
    };
    const scan = new ScanSession({ mirrored: meta.flipped });
    let ms = 0;
    for (const data of frames) {
      const t = Date.now();
      scan.frame(toLab({ width, height, data }, region), box);
      ms += Date.now() - t;
      if (scan.step === "done") break;
    }
    const result = scan.result();
    const target = applyMoves(solvedState(), parseAlg(meta.scramble));
    const cube = result?.ok
      ? sameCube(result.state, nameScannedColors(result.faceColors), target)
      : false;
    rows.push({
      name: `real ${base} (${meta.cube}, ${meta.lighting}${meta.flipped ? ", flipped feed" : ""})`,
      captures: scan.step === "done",
      // Sticker accuracy needs the cube's hold, which a real clip doesn't pin down. Count the whole cube.
      stickers: cube ? 1 : NaN,
      cube,
      sure: result?.ok ? result.runnerUp - result.cost > 10 : false,
      ms: ms / Math.max(1, frames.length),
    });
  }
  return { rows, note: "" };
}

const pct = (x: number) => (Number.isNaN(x) ? "n/a" : `${(x * 100).toFixed(1)}%`);
const yes = (b: boolean) => (b ? "yes" : "**no**");

test("vision accuracy report", { timeout: 600_000 }, () => {
  const synthetic = syntheticRows();
  const real = realRows();
  const rows = [...synthetic, ...real.rows];
  const summary = (list: Row[]) => ({
    clips: list.length,
    cubes: list.filter((r) => r.cube).length,
    captures: list.filter((r) => r.captures).length,
  });
  const totals = { synthetic: summary(synthetic), real: summary(real.rows) };

  const lines = [
    "# Vision accuracy",
    "",
    "Made by `npm run vision:report` (CI runs it too). Do not edit by hand.",
    "",
    `Synthetic: ${totals.synthetic.cubes} of ${totals.synthetic.clips} cubes read exactly right. Real clips: ${totals.real.cubes} of ${totals.real.clips}. ${real.note}`,
    "",
    "| Clip | Faces captured in order | Stickers right | Whole cube right | Sure | ms per frame (this machine) |",
    "| ---- | ----------------------- | -------------- | ---------------- | ---- | --------------------------- |",
    ...rows.map(
      (r) =>
        `| ${r.name} | ${yes(r.captures)} | ${pct(r.stickers)} | ${yes(r.cube)} | ${yes(r.sure)} | ${r.ms.toFixed(1)} |`,
    ),
    "",
  ];
  fs.writeFileSync(REPORT, lines.join("\n"));

  // No regressions: at least as many exact cubes as the baseline.
  const baseline = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, "utf8")) as typeof totals)
    : null;
  if (process.env.UPDATE_BASELINE === "1" || !baseline) {
    fs.writeFileSync(BASELINE, `${JSON.stringify(totals, null, 2)}\n`);
    return;
  }
  expect(totals.synthetic.cubes).toBeGreaterThanOrEqual(baseline.synthetic.cubes);
  if (totals.real.clips >= baseline.real.clips) {
    expect(totals.real.cubes).toBeGreaterThanOrEqual(baseline.real.cubes);
  }
});
