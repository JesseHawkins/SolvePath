/**
 * Dev-only fixture recorder (PLAN.md 5.11). The only code in the project
 * that records video. It never runs in the app, and it only saves files to
 * this device (they download like any other file).
 */
import { CUBES, LIGHTING, type FixtureMeta } from "../fixture-meta.ts";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const video = $<HTMLVideoElement>("video");
const overlay = $<HTMLCanvasElement>("overlay");
const status = $<HTMLParagraphElement>("status");
const recordButton = $<HTMLButtonElement>("record");
let scramble = "";
let recorder: MediaRecorder | null = null;

for (const [id, values] of [
  ["cube", CUBES],
  ["lighting", LIGHTING],
] as const) {
  const select = $<HTMLSelectElement>(id);
  for (const v of values) select.add(new Option(v, v));
}
$<HTMLInputElement>("mirror").addEventListener("change", (e) => {
  $("view").classList.toggle("mirror", (e.target as HTMLInputElement).checked);
});

$("new").addEventListener("click", () => {
  void import("cubing/scramble").then(async ({ randomScrambleForEvent }) => {
    scramble = (await randomScrambleForEvent("333")).toString();
    $("scramble").textContent = scramble;
  });
});

$("camera").addEventListener("click", () => {
  void navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    })
    .then(async (stream) => {
      video.srcObject = stream;
      await video.play();
      recordButton.disabled = false;
      drawGuide();
    })
    .catch((e: unknown) => (status.textContent = `Camera problem: ${String(e)}`));
});

/** The same guide box the app uses: a centered square, 80% of the short side. */
function drawGuide() {
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  const side = Math.min(overlay.width, overlay.height) * 0.8;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect((overlay.width - side) / 2, (overlay.height - side) / 2, side, side);
}

function pickType(): string {
  for (const t of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

recordButton.addEventListener("click", () => {
  if (recorder) {
    recorder.stop();
    return;
  }
  if (!scramble) {
    status.textContent = "Press New scramble first, and do it on your cube.";
    return;
  }
  const stream = video.srcObject as MediaStream;
  const type = pickType();
  const chunks: Blob[] = [];
  recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const ext = type.includes("mp4") ? "mp4" : "webm";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const base = `scan-${stamp}`;
    const meta: FixtureMeta = {
      scramble,
      cube: $<HTMLSelectElement>("cube").value as FixtureMeta["cube"],
      lighting: $<HTMLSelectElement>("lighting").value as FixtureMeta["lighting"],
      flipped: $<HTMLSelectElement>("flipped").value === "true",
      marked: $<HTMLSelectElement>("marked").value === "true",
    };
    download(new Blob(chunks, { type }), `${base}.${ext}`);
    download(
      new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }),
      `${base}.json`,
    );
    status.textContent = `Saved ${base}. Add it with: npm run fixtures:add -- ${base}.${ext} ${base}.json`;
    recorder = null;
    recordButton.textContent = "Record";
  };
  recorder.start(1000);
  recordButton.textContent = "Stop";
  status.textContent = "Recording… do the scan, then press Stop.";
});
