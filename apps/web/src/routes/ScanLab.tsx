/**
 * Scan Lab: an early, rough test of reading a real cube with the camera
 * (M2 vision spike). The polished scan screen comes in M4.
 */
import {
  applyMoves,
  DEFAULT_PROFILE,
  FACES,
  facelets,
  faceletString,
  parseAlg,
  solvedState,
  type CubeState,
  type Face,
} from "@solvepath/cube-core";
import { hexToOklab, oklabToHex, type Lab } from "@solvepath/vision";
import * as Comlink from "comlink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideLink } from "../guide/GuideLink";
import {
  grabFrame,
  saveMirror,
  savedMirror,
  useCamera,
  useFramePump,
  type CameraStatus,
} from "../vision/camera";
import { nameScannedColors, sameCube } from "../vision/check";
import type { VisionApi, WorkerFrame } from "../vision/worker";

const button =
  "min-h-11 rounded-xl bg-raised px-4 font-semibold hover:bg-border disabled:opacity-60";
const primaryButton =
  "min-h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60";

/** The standard colors, for telling a flipped picture apart without calibrating. */
const KNOWN_COLORS = Object.fromEntries(
  FACES.map((f) => [f, hexToOklab(DEFAULT_PROFILE.displayColors[DEFAULT_PROFILE.scheme[f]])]),
) as Record<Face, Lab>;

type FlipSetting = "auto" | "normal" | "flipped";
type Calibration =
  | { step: "idle" }
  | { step: "countdown"; left: number }
  | { step: "moving" }
  | { step: "done"; message: string };

const MIRROR_PREVIEW_KEY = "solvepath.scan.mirrorPreview";
const CALIBRATION_SECONDS = 3;
const CALIBRATION_FRAMES = 30;

function useVisionWorker() {
  const api = useMemo(() => {
    const worker = new Worker(new URL("../vision/worker.ts", import.meta.url), { type: "module" });
    return { worker, remote: Comlink.wrap<VisionApi>(worker) };
  }, []);
  useEffect(() => () => api.worker.terminate(), [api]);
  return api.remote;
}

export function ScanLab() {
  const { t } = useTranslation();
  const {
    attachVideo,
    video: cameraVideo,
    status: cameraStatus,
    deviceId,
    start: startCamera,
    stop: stopCamera,
  } = useCamera();
  const vision = useVisionWorker();
  const [scanning, setScanning] = useState(false);
  const [frame, setFrame] = useState<WorkerFrame | null>(null);
  const [faces, setFaces] = useState<{ kind: "side" | "top" | "bottom"; colors: Lab[] }[]>([]);
  const [msAverage, setMsAverage] = useState<number | null>(null);
  const [mirrorPreview, setMirrorPreview] = useState(
    () => localStorage.getItem(MIRROR_PREVIEW_KEY) !== "false",
  );
  // The user's choice; if they haven't chosen, use what we saved for this camera.
  const [flipChoice, setFlip] = useState<FlipSetting | null>(null);
  const saved = savedMirror(deviceId);
  const flip: FlipSetting = flipChoice ?? (saved === null ? "auto" : saved ? "flipped" : "normal");
  const [calibration, setCalibration] = useState<Calibration>({ step: "idle" });
  const [target, setTarget] = useState<{ alg: string; state: CubeState } | null>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const calibrationFrames = useRef(0);

  const startScan = useCallback(async () => {
    setFaces([]);
    setFrame(null);
    setMsAverage(null);
    await vision.startScan({
      mirrored: flip === "auto" ? "unknown" : flip === "flipped",
      knownColors: KNOWN_COLORS,
    });
    setScanning(true);
  }, [vision, flip]);

  const onFrame = useCallback(
    async (v: HTMLVideoElement) => {
      const bitmap = await grabFrame(v);
      if (!bitmap) return;
      if (calibration.step === "moving") {
        await vision.calibrationFrame(Comlink.transfer(bitmap, [bitmap]));
        calibrationFrames.current++;
        if (calibrationFrames.current >= CALIBRATION_FRAMES) {
          const result = await vision.calibrationResult();
          if (result?.ok) {
            saveMirror(deviceId, result.mirrored);
            setFlip(result.mirrored ? "flipped" : "normal");
            setCalibration({
              step: "done",
              message: t(result.mirrored ? "scan.calibrate.flipped" : "scan.calibrate.normal"),
            });
          } else {
            setCalibration({ step: "done", message: t("scan.calibrate.again") });
          }
        }
        return;
      }
      if (!scanning) {
        bitmap.close();
        return;
      }
      const report = await vision.scanFrame(Comlink.transfer(bitmap, [bitmap]));
      if (!report) return;
      setFrame(report);
      setMsAverage((m) => (m === null ? report.ms : m * 0.9 + report.ms * 0.1));
      const kind = report.captured;
      const colors = report.colors;
      if (kind && kind !== "repeat" && colors) setFaces((f) => [...f, { kind, colors }]);
      if (report.step === "done") setScanning(false);
    },
    [vision, scanning, calibration.step, deviceId, t],
  );

  useFramePump(
    cameraVideo,
    cameraStatus === "on" && (scanning || calibration.step === "moving"),
    onFrame,
  );

  // Calibration countdown, then 2.5 seconds of watching.
  useEffect(() => {
    if (calibration.step !== "countdown") return;
    const timer = setTimeout(() => {
      if (calibration.left > 1) setCalibration({ step: "countdown", left: calibration.left - 1 });
      else {
        calibrationFrames.current = 0;
        void vision.startCalibration().then(() => setCalibration({ step: "moving" }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [calibration, vision]);

  // Draw the guide box and the face we found.
  useEffect(() => {
    const canvas = overlay.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !frame) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(frame.box.x, frame.box.y, frame.box.width, frame.box.height);
    ctx.setLineDash([]);
    if (frame.pose) {
      const p = frame.pose;
      ctx.save();
      ctx.translate(p.cx, p.cy);
      ctx.rotate(p.angle);
      ctx.scale(p.size * p.aspect, p.size);
      ctx.lineWidth = 2 / p.size;
      ctx.strokeStyle = frame.steady ? "#4ade80" : "#fbbf24";
      for (let k = 0; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(-0.5 + k / 3, -0.5);
        ctx.lineTo(-0.5 + k / 3, 0.5);
        ctx.moveTo(-0.5, -0.5 + k / 3);
        ctx.lineTo(0.5, -0.5 + k / 3);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [frame]);

  const newTarget = async () => {
    const { randomScrambleForEvent } = await import("cubing/scramble");
    const alg = (await randomScrambleForEvent("333")).toString();
    setTarget({ alg, state: applyMoves(solvedState(), parseAlg(alg)) });
  };

  const result = frame?.result ?? null;
  const verdict = useMemo(() => {
    if (!result?.ok || !target) return null;
    return sameCube(result.state, nameScannedColors(result.faceColors), target.state);
  }, [result, target]);

  const hintText = frame ? t(`scan.hint.${frame.hint}`) : t("scan.hint.start");

  return (
    <section aria-labelledby="scan-heading" className="flex flex-col gap-6">
      <header>
        <h1 id="scan-heading" className="text-3xl font-bold">
          <GuideLink anchor="feature.scan-lab">{t("scan.heading")}</GuideLink>
        </h1>
        <p className="mt-2 text-muted">{t("scan.intro")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("scan.privacy")} <GuideLink anchor="privacy.camera">{t("nav.guide")}</GuideLink>
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <div
            className="relative mx-auto w-full max-w-[min(100%,70dvh)] overflow-hidden rounded-3xl border border-border bg-surface"
            data-testid="scan-view"
            data-step={frame?.step ?? "off"}
          >
            <div className={mirrorPreview ? "-scale-x-100" : undefined}>
              <video ref={attachVideo} playsInline muted className="block w-full" />
              <canvas
                ref={overlay}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </div>
            {cameraStatus !== "on" && (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <CameraMessage status={cameraStatus} onStart={() => void startCamera()} />
              </div>
            )}
          </div>
          <p
            aria-live="polite"
            className="text-center text-lg font-semibold"
            data-testid="scan-hint"
          >
            {calibration.step === "countdown"
              ? t("scan.calibrate.countdown", { count: calibration.left })
              : calibration.step === "moving"
                ? t("scan.calibrate.move")
                : hintText}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              disabled={
                cameraStatus !== "on" ||
                calibration.step === "countdown" ||
                calibration.step === "moving"
              }
              onClick={() => void startScan()}
            >
              {faces.length > 0 || result ? t("scan.restart") : t("scan.start")}
            </button>
            {cameraStatus === "on" && (
              <button type="button" className={button} onClick={stopCamera}>
                {t("scan.cameraOff")}
              </button>
            )}
          </div>

          <div
            className="rounded-2xl border border-border bg-surface p-4"
            data-testid="scan-progress"
          >
            <h2 className="font-semibold">
              <GuideLink anchor="scan.grip">{t("scan.progress")}</GuideLink>
            </h2>
            <p className="text-sm text-muted">
              {t("scan.sides", { count: frame?.sides ?? 0 })}
              {msAverage !== null && <> · {t("scan.speed", { ms: msAverage.toFixed(0) })}</>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {faces.map((f, i) => (
                <FaceSwatch key={i} colors={f.colors} label={t(`scan.face.${f.kind}`)} />
              ))}
            </div>
          </div>

          {result && (
            <div
              className="rounded-2xl border border-border bg-surface p-4"
              data-testid="scan-result"
              data-facelets={result.ok ? faceletString(result.state) : undefined}
              data-ok={result.ok}
            >
              <h2 className="font-semibold">{t("scan.result")}</h2>
              {result.ok ? (
                <>
                  <p className="text-sm text-muted">
                    {result.runnerUp - result.cost > 10 ? t("scan.sure") : t("scan.notSure")}
                  </p>
                  <CubeNet state={result.state} colors={result.faceColors} />
                  {verdict !== null && (
                    <p
                      className={
                        verdict ? "font-semibold text-success" : "font-semibold text-danger"
                      }
                      data-testid="scan-verdict"
                    >
                      {verdict ? t("scan.check.match") : t("scan.check.noMatch")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-danger">{t("scan.failed")}</p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="font-semibold">
              <GuideLink anchor="scan.check">{t("scan.check.title")}</GuideLink>
            </h2>
            <p className="text-sm text-muted">{t("scan.check.help")}</p>
            {target && (
              <p className="mt-2 font-mono" data-testid="scan-target">
                {target.alg}
              </p>
            )}
            <button type="button" className={`${button} mt-2`} onClick={() => void newTarget()}>
              {t("scan.check.new")}
            </button>
          </div>

          <fieldset className="rounded-2xl border border-border bg-surface p-4">
            <legend className="px-1 font-semibold">
              <GuideLink anchor="settings.scan.flip">{t("scan.flip.legend")}</GuideLink>
            </legend>
            {(["auto", "normal", "flipped"] as const).map((value) => (
              <div key={value} className="flex items-center gap-2 py-1">
                <input
                  type="radio"
                  id={`scan-flip-${value}`}
                  name="scan-flip"
                  checked={flip === value}
                  onChange={() => setFlip(value)}
                  className="size-5 accent-accent"
                />
                <label htmlFor={`scan-flip-${value}`}>{t(`scan.flip.${value}`)}</label>
              </div>
            ))}
            <button
              type="button"
              className={`${button} mt-2`}
              disabled={cameraStatus !== "on" || scanning}
              onClick={() => setCalibration({ step: "countdown", left: CALIBRATION_SECONDS })}
            >
              {t("scan.calibrate.button")}
            </button>
            {calibration.step === "done" && <p className="mt-2 text-sm">{calibration.message}</p>}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="scan-mirror-preview"
                checked={mirrorPreview}
                onChange={(e) => {
                  setMirrorPreview(e.target.checked);
                  localStorage.setItem(MIRROR_PREVIEW_KEY, String(e.target.checked));
                }}
                className="size-5 accent-accent"
              />
              <label htmlFor="scan-mirror-preview">
                <GuideLink anchor="settings.scan.mirror-preview">
                  {t("scan.mirrorPreview")}
                </GuideLink>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}

function CameraMessage({ status, onStart }: { status: CameraStatus; onStart: () => void }) {
  const { t } = useTranslation();
  if (status === "starting") return <p>{t("scan.camera.starting")}</p>;
  const problem = status === "denied" || status === "missing" || status === "error" ? status : null;
  return (
    <div className="flex flex-col items-center gap-3">
      {problem && <p className="text-danger">{t(`scan.camera.${problem}`)}</p>}
      <button type="button" className={primaryButton} onClick={onStart}>
        {t("scan.camera.start")}
      </button>
    </div>
  );
}

/** A captured face: 9 squares in the colors we read, as the camera saw them. */
function FaceSwatch({ colors, label }: { colors: Lab[]; label: string }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <div
        className="grid grid-cols-3 gap-0.5 rounded-md bg-bg p-0.5"
        role="img"
        aria-label={label}
      >
        {colors.map((c, i) => (
          <span key={i} className="size-4 rounded-sm" style={{ backgroundColor: oklabToHex(c) }} />
        ))}
      </div>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** The whole cube laid flat: U on top, then L F R B, then D. */
function CubeNet({ state, colors }: { state: CubeState; colors: Record<Face, Lab> }) {
  const { t } = useTranslation();
  const labels = facelets(state);
  const spots: Record<Face, [number, number]> = {
    U: [1, 0],
    L: [0, 1],
    F: [1, 1],
    R: [2, 1],
    B: [3, 1],
    D: [1, 2],
  };
  return (
    <div className="my-2 grid w-fit grid-cols-4 gap-1" role="img" aria-label={t("scan.netLabel")}>
      {FACES.map((face) => (
        <div
          key={face}
          className="grid grid-cols-3 gap-0.5"
          style={{ gridColumn: spots[face][0] + 1, gridRow: spots[face][1] + 1 }}
        >
          {labels.slice(FACES.indexOf(face) * 9, FACES.indexOf(face) * 9 + 9).map((l, i) => (
            <span
              key={i}
              className="size-4 rounded-sm"
              style={{ backgroundColor: oklabToHex(colors[l]) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
