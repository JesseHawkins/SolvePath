/**
 * A small software renderer that draws a cube the way a webcam would see it.
 *
 * Used only for tests and the accuracy report (never shipped in the app).
 * Every picture starts from a real cube state made by legal moves (Rule 3),
 * so we always know the right answer.
 *
 * The scene is in the user's frame (cube-core): x right, y up, z toward the
 * user. The camera sits behind the cube at z = -distance, looking toward the
 * user, so it sees the user's B face. Image x grows to the camera's right,
 * which is the user's left (unless the feed is flipped).
 */
import { colorAt, STICKERS, type CubeState, type Face } from "@solvepath/cube-core";
import type { RgbaImage } from "../image";
import { add, apply, cross, dot, gaussian, random, scale, type M3, type V3 } from "./math3";

export type Lighting = "daylight" | "warm" | "dim" | "glare";
export type CubeStyle = "stickered" | "stickerless";
type Rgb = [number, number, number];

/** Sticker and plastic colors for a cube, as sRGB bytes. */
export type CubeColors = Readonly<Record<Face, Rgb>>;

/** Standard-scheme colors close to a stickerless speed cube (white U, green F, red R). */
export const STICKERLESS_COLORS: CubeColors = {
  U: [236, 238, 236],
  D: [250, 218, 30],
  F: [0, 170, 80],
  B: [10, 80, 200],
  R: [210, 25, 40],
  L: [255, 110, 15],
};

/** Standard-scheme sticker colors a little different from the stickerless ones. */
export const STICKERED_COLORS: CubeColors = {
  U: [245, 245, 240],
  D: [255, 213, 0],
  F: [0, 155, 72],
  B: [0, 70, 173],
  R: [183, 18, 52],
  L: [255, 88, 0],
};

export interface SceneSpec {
  width: number;
  height: number;
  /** The cube as the user holds it (user's frame). */
  state: CubeState;
  /** Extra turn of the whole cube, like a spin in progress. Applied about the cube's center. */
  pose: M3;
  /** Where the cube's center is, in cubie widths (user's frame). */
  offset: V3;
  /** Camera distance from the cube center, in cubie widths (about 1.9 cm each). */
  distance: number;
  /** Camera's horizontal field of view, in degrees. */
  fov: number;
  style: CubeStyle;
  colors: CubeColors;
  lighting: Lighting;
  /** Fingers on the top and bottom centers, like the grip-and-spin hold. */
  fingers: boolean;
  /**
   * Which way the fingers point, as a turn of the straight-up direction. It
   * changes when the user tips the cube (the fingers stay on the same two
   * centers), but not when they spin it between their fingers.
   */
  grip: M3;
  /** Some webcam tools flip the picture left to right. */
  flipped: boolean;
  /** Changes the noise and background. Same seed, same picture. */
  seed: number;
}

export const DEFAULT_SCENE: Omit<SceneSpec, "state"> = {
  width: 480,
  height: 270,
  pose: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  offset: [0, 0, 0],
  distance: 12,
  fov: 60,
  style: "stickerless",
  colors: STICKERLESS_COLORS,
  lighting: "daylight",
  fingers: true,
  grip: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  flipped: false,
  seed: 1,
};

interface Quad {
  corners: V3[];
  color: Rgb;
  normal: V3;
  shiny: boolean;
}

const SUPERSAMPLE = 2;
const LIGHT_DIR = (() => {
  const v: V3 = [0.4, 0.8, -0.6];
  const n = Math.hypot(...v);
  return v.map((x) => x / n) as V3;
})();

/** Gap between stickers, in cubie widths. Stickerless cubes only have thin seams. */
const GAP: Record<CubeStyle, number> = { stickered: 0.12, stickerless: 0.035 };
const BODY: Record<CubeStyle, Rgb> = { stickered: [16, 17, 20], stickerless: [40, 40, 44] };
const SKIN: Rgb = [214, 160, 130];

function cubeQuads(spec: SceneSpec): Quad[] {
  const quads: Quad[] = [];
  const place = (p: readonly number[]) => add(apply(spec.pose, p), spec.offset);
  // The plastic body: six big squares.
  for (const n of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as V3[]) {
    const axis = n.findIndex((v) => v !== 0);
    const [a, b] = [0, 1, 2].filter((i) => i !== axis) as [number, number];
    const corner = (sa: number, sb: number) => {
      const p: V3 = [0, 0, 0];
      p[axis] = n[axis]! * 1.5;
      p[a] = sa * 1.5;
      p[b] = sb * 1.5;
      return place(p);
    };
    quads.push({
      corners: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
      color: BODY[spec.style],
      normal: apply(spec.pose, n),
      shiny: false,
    });
  }
  // Stickers, a hair above the body.
  const half = 0.5 - GAP[spec.style] / 2;
  for (const s of STICKERS) {
    const n = s.normal;
    const axis = n.findIndex((v) => v !== 0);
    const [a, b] = [0, 1, 2].filter((i) => i !== axis) as [number, number];
    const center = add(s.cubie, scale(n, 0.501));
    const corner = (sa: number, sb: number) => {
      const p: V3 = [...center];
      p[a] = p[a]! + sa * half;
      p[b] = p[b]! + sb * half;
      return place(p);
    };
    const face = colorAt(spec.state, s.index);
    quads.push({
      corners: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
      color: spec.colors[face],
      normal: apply(spec.pose, n),
      shiny: true,
    });
  }
  if (spec.fingers) {
    // A finger is a long box resting on the U center, and another on the D center.
    for (const sign of [1, -1]) {
      // Fingers lean toward the user, so they come in at an angle, like a real hand.
      const lean = Math.hypot(1, 0.8);
      const up = apply(spec.pose, apply(spec.grip, [0, sign / lean, 0.8 / lean]));
      const side = apply(spec.pose, apply(spec.grip, [1, 0, 0]));
      const depth = cross(up, side);
      const base = add(apply(spec.pose, apply(spec.grip, [0, sign * 1.5, 0])), spec.offset);
      const w = 0.42;
      const t = 0.3;
      const len = 4;
      const at = (u: number, s: number, d: number) =>
        add(base, add(scale(up, u), add(scale(side, s), scale(depth, d))));
      const boxFaces: [V3, V3[]][] = [
        [scale(depth, 1), [at(0, -w, t), at(len, -w, t), at(len, w, t), at(0, w, t)]],
        [scale(depth, -1), [at(0, -w, -t), at(0, w, -t), at(len, w, -t), at(len, -w, -t)]],
        [scale(side, 1), [at(0, w, -t), at(0, w, t), at(len, w, t), at(len, w, -t)]],
        [scale(side, -1), [at(0, -w, -t), at(len, -w, -t), at(len, -w, t), at(0, -w, t)]],
        [scale(up, -1), [at(0.02, -w, -t), at(0.02, -w, t), at(0.02, w, t), at(0.02, w, -t)]],
        [up, [at(len, -w, -t), at(len, w, -t), at(len, w, t), at(len, -w, t)]],
      ];
      for (const [normal, corners] of boxFaces)
        quads.push({ corners, color: SKIN, normal, shiny: false });
    }
  }
  return quads;
}

/** Light reaching a surface, for each color channel. */
function shade(spec: SceneSpec, q: Quad, rand: () => number): Rgb {
  const diffuse = Math.max(0, dot(q.normal, LIGHT_DIR));
  const light = 0.55 + 0.45 * diffuse;
  const tint: Rgb =
    spec.lighting === "warm"
      ? [1.05, 0.93, 0.68]
      : spec.lighting === "dim"
        ? [0.42, 0.42, 0.42]
        : [1, 1, 1];
  // A little random shift per surface, like real plastic and uneven light.
  const wobble = 1 + (rand() - 0.5) * 0.06;
  return q.color.map((c, i) => c * light * tint[i]! * wobble) as Rgb;
}

/** Draws a scene. Returns an RGBA image the size of `spec`. */
export function renderScene(spec: SceneSpec): RgbaImage {
  const rand = random(spec.seed);
  const W = spec.width * SUPERSAMPLE;
  const H = spec.height * SUPERSAMPLE;
  const focal = W / 2 / Math.tan((spec.fov * Math.PI) / 360);
  const color = new Float32Array(W * H * 3);
  const depth = new Float32Array(W * H).fill(Infinity);

  // Background: a soft gradient with a few blurry shapes (a room behind the user).
  const bgRand = random(spec.seed * 7 + 3);
  const blobs = Array.from({ length: 5 }, () => ({
    x: bgRand() * W,
    y: bgRand() * H,
    r: (0.15 + bgRand() * 0.3) * W,
    c: [60 + bgRand() * 120, 60 + bgRand() * 110, 60 + bgRand() * 100],
  }));
  const dimBg = spec.lighting === "dim" ? 0.45 : 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = [120 - (y / H) * 40, 115 - (y / H) * 35, 110 - (y / H) * 30];
      for (const b of blobs) {
        const k = Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r));
        c = c.map((v, i) => v * (1 - k * 0.7) + b.c[i]! * k * 0.7);
      }
      const i = (y * W + x) * 3;
      color[i] = c[0]! * dimBg;
      color[i + 1] = c[1]! * dimBg;
      color[i + 2] = c[2]! * dimBg;
    }
  }

  const camera: V3 = [0, 0, -spec.distance];
  const project = (p: V3) => {
    const d = p[2] - camera[2];
    // Camera looks along +z; its right is the user's left (-x), its up is +y.
    return { x: W / 2 + (focal * -p[0]) / d, y: H / 2 - (focal * p[1]) / d, d };
  };

  for (const q of cubeQuads(spec)) {
    const toCamera = [
      camera[0] - q.corners[0]![0],
      camera[1] - q.corners[0]![1],
      camera[2] - q.corners[0]![2],
    ];
    if (dot(q.normal, toCamera) <= 0) continue; // facing away
    const rgb = shade(spec, q, rand);
    const pts = q.corners.map(project);
    for (const tri of [
      [pts[0]!, pts[1]!, pts[2]!],
      [pts[0]!, pts[2]!, pts[3]!],
    ]) {
      const [p0, p1, p2] = tri as [(typeof pts)[0], (typeof pts)[0], (typeof pts)[0]];
      const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
      const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
      const area = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
      if (Math.abs(area) < 1e-9) continue;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w0 = ((p1.x - px) * (p2.y - py) - (p2.x - px) * (p1.y - py)) / area;
          const w1 = ((p2.x - px) * (p0.y - py) - (p0.x - px) * (p2.y - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          // Perspective-correct depth is close enough with plain interpolation at this size.
          const d = w0 * p0.d + w1 * p1.d + w2 * p2.d - (q.shiny ? 0.004 : 0);
          const i = y * W + x;
          if (d >= depth[i]!) continue;
          depth[i] = d;
          let r = rgb[0];
          let g = rgb[1];
          let b = rgb[2];
          if (spec.lighting === "glare" && q.shiny) {
            // A bright reflection near one spot of the picture.
            const k = Math.exp(-((px - W * 0.47) ** 2 + (py - H * 0.42) ** 2) / (W * 0.03) ** 2);
            r += (255 - r) * k;
            g += (255 - g) * k;
            b += (255 - b) * k;
          }
          color[i * 3] = r;
          color[i * 3 + 1] = g;
          color[i * 3 + 2] = b;
        }
      }
    }
  }

  // Shrink (smooths the edges), add camera noise, and flip if asked.
  const out = new Uint8ClampedArray(spec.width * spec.height * 4);
  const noise = spec.lighting === "dim" ? 6 : 3;
  const noiseRand = random(spec.seed * 13 + 5);
  for (let y = 0; y < spec.height; y++) {
    for (let x = 0; x < spec.width; x++) {
      const sum = [0, 0, 0];
      for (let dy = 0; dy < SUPERSAMPLE; dy++) {
        for (let dx = 0; dx < SUPERSAMPLE; dx++) {
          const i = ((y * SUPERSAMPLE + dy) * W + x * SUPERSAMPLE + dx) * 3;
          sum[0]! += color[i]!;
          sum[1]! += color[i + 1]!;
          sum[2]! += color[i + 2]!;
        }
      }
      const outX = spec.flipped ? spec.width - 1 - x : x;
      const o = (y * spec.width + outX) * 4;
      for (let c = 0; c < 3; c++) {
        out[o + c] = sum[c]! / (SUPERSAMPLE * SUPERSAMPLE) + gaussian(noiseRand) * noise;
      }
      out[o + 3] = 255;
    }
  }
  return { width: spec.width, height: spec.height, data: out };
}

/** Where a point in the user's frame lands in the picture (before any flip). */
export function projectPoint(
  spec: Pick<SceneSpec, "width" | "distance" | "fov" | "height">,
  p: V3,
) {
  const focal = spec.width / 2 / Math.tan((spec.fov * Math.PI) / 360);
  const d = p[2] + spec.distance;
  return { x: spec.width / 2 + (focal * -p[0]) / d, y: spec.height / 2 - (focal * p[1]) / d };
}
