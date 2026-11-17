/**
 * The camera: turning it on and off, and sending frames to the vision worker.
 *
 * Video is never recorded, saved, or uploaded. Each frame is shrunk, handed
 * to the worker, read once, and thrown away (PLAN.md 5.1).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "off" | "starting" | "on" | "denied" | "missing" | "error";

/** Frames per second we send to the worker. */
export const PUMP_FPS = 12;
/** The short side of the picture the worker gets, in pixels. */
export const PROCESS_SHORT_SIDE = 270;

export function useCamera() {
  // The <video> element: a ref to change it, and state so the page re-renders when it appears.
  const element = useRef<HTMLVideoElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  /** Put this on the <video> element as its `ref`. */
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    element.current = el;
    setVideo(el);
  }, []);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("off");
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (element.current) element.current.srcObject = null;
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("missing");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current = stream;
      setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null);
      const el = element.current;
      if (el) {
        el.srcObject = stream;
        await el.play();
      }
      setStatus("on");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setStatus(
        name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "missing" : "error",
      );
    }
  }, []);

  // Always turn the camera off when leaving the page.
  useEffect(
    () => () => {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    },
    [],
  );

  return { attachVideo, video, status, deviceId, start, stop };
}

/** A small copy of the current video frame, ready to move to the worker. */
export async function grabFrame(video: HTMLVideoElement): Promise<ImageBitmap | null> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = PROCESS_SHORT_SIDE / Math.min(w, h);
  return createImageBitmap(video, {
    resizeWidth: Math.round(w * scale),
    resizeHeight: Math.round(h * scale),
    resizeQuality: "medium",
  });
}

/**
 * Calls `onFrame` about PUMP_FPS times a second while `active`. Never runs
 * two at once: if the last frame isn't done, this one is skipped.
 */
export function useFramePump(
  video: HTMLVideoElement | null,
  active: boolean,
  onFrame: (video: HTMLVideoElement) => Promise<void>,
) {
  const busy = useRef(false);
  const handler = useRef(onFrame);
  useEffect(() => {
    handler.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!video || !active) return;
    let stopped = false;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let callbackId: number | undefined;
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      if (!busy.current && now - last >= 1000 / PUMP_FPS - 5) {
        last = now;
        busy.current = true;
        void handler.current(video).finally(() => {
          busy.current = false;
        });
      }
      schedule();
    };
    const schedule = () => {
      if ("requestVideoFrameCallback" in video) callbackId = video.requestVideoFrameCallback(tick);
      else timer = setTimeout(tick, 1000 / PUMP_FPS);
    };
    schedule();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (callbackId !== undefined && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(callbackId);
      }
    };
  }, [video, active]);
}

/** Which way each camera's picture faces, saved on this device only. */
const CAMERAS_KEY = "solvepath.cameras";

function readCameras(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CAMERAS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function savedMirror(deviceId: string | null): boolean | null {
  if (!deviceId) return null;
  const v = readCameras()[deviceId];
  return typeof v === "boolean" ? v : null;
}

export function saveMirror(deviceId: string | null, mirrored: boolean): void {
  if (!deviceId) return;
  localStorage.setItem(CAMERAS_KEY, JSON.stringify({ ...readCameras(), [deviceId]: mirrored }));
}
