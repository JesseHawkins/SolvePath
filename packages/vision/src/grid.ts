/**
 * Finding a cube face in a picture: the best 3x3 grid (PLAN.md 5.3).
 *
 * A grid pose is a square: its center, its width, and a small tilt. We score
 * a pose by how much it looks like a cube face:
 *
 * - each of the 9 cells is one even color inside (uniformity),
 * - neighbor cells are split by a color change or a dark seam (inner edges),
 * - the face stands out from what's around it (outer edges).
 *
 * Search is coarse to fine inside the guide box, then nudged into place.
 * While the cube is turning, no square grid fits well, so the score drops:
 * that is how we know a face is being shown.
 */
import { colorDistance, type Lab } from "./color";
import type { LabImage } from "./image";

export interface GridPose {
  /** Center of the face, in pixels. */
  cx: number;
  cy: number;
  /** Height of the face (edge to edge), in pixels. */
  size: number;
  /**
   * Width divided by height. Near 1 for a face held straight at the camera;
   * smaller while the cube is turned partway (the face looks narrow).
   */
  aspect: number;
  /** Tilt in radians, clockwise on screen. */
  angle: number;
}

/** The area where we look for the face, in pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridFit {
  pose: GridPose;
  score: number;
  /** Mean color of each cell (row by row from the top-left, as the camera sees it). */
  cells: Lab[];
  /** How uneven each cell is inside (0 = one flat color). */
  spread: number[];
}

/** Face coordinates (u right, v down, each -0.5 to 0.5) to image pixels. */
export function facePoint(pose: GridPose, u: number, v: number): { x: number; y: number } {
  const c = Math.cos(pose.angle);
  const s = Math.sin(pose.angle);
  return {
    x: pose.cx + pose.size * (u * pose.aspect * c - v * s),
    y: pose.cy + pose.size * (u * pose.aspect * s + v * c),
  };
}

/** The four corners of a pose, clockwise from the top-left. */
export function poseCorners(pose: GridPose) {
  return [
    facePoint(pose, -0.5, -0.5),
    facePoint(pose, 0.5, -0.5),
    facePoint(pose, 0.5, 0.5),
    facePoint(pose, -0.5, 0.5),
  ];
}

const CELL = 1 / 3;
const cellCenter = (i: number) => (i - 1) * CELL;

// Sample points inside each cell (inner 50%), in face coordinates.
const INSIDE: [number, number][] = [];
for (const a of [-1.5, -0.5, 0.5, 1.5])
  for (const b of [-1.5, -0.5, 0.5, 1.5]) INSIDE.push([a * 0.055, b * 0.055]);
// Across a seam: how far either side of the line we look for a dark seam.
const SEAM_OFFSETS = [-0.024, -0.012, 0, 0.012, 0.024];
const ALONG = [-0.08, 0, 0.08];
// Outside the face: how far past the edge.
const OUTSIDE = [0.05, 0.09];

const SEAM_WEIGHT = 0.6;
/** How many starting spots get fully nudged into place. */
const REFINE_STARTS = 3;
/** A face counts as held straight at the camera if its width is within this much of its height. */
export const SQUARE_TOLERANCE = 0.1;
const SPREAD_WEIGHT = 2;

function readLab(image: LabImage, x: number, y: number, out: Lab): boolean {
  const px = x | 0;
  const py = y | 0;
  if (x < 0 || y < 0 || px >= image.width || py >= image.height) return false;
  const i = py * image.width + px;
  out[0] = image.L[i]!;
  out[1] = image.a[i]!;
  out[2] = image.b[i]!;
  return true;
}

const tmp: Lab = [0, 0, 0];

/** Scores one pose. Higher is more face-like. Returns -Infinity if it runs off the picture. */
export function scorePose(image: LabImage, pose: GridPose): GridFit | null {
  const c = Math.cos(pose.angle) * pose.size;
  const s = Math.sin(pose.angle) * pose.size;
  const w = pose.aspect;
  const at = (u: number, v: number, out: Lab) =>
    readLab(image, pose.cx + u * w * c - v * s, pose.cy + u * w * s + v * c, out);

  const cells: Lab[] = [];
  const spread: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const u0 = cellCenter(col);
      const v0 = cellCenter(row);
      let sL = 0,
        sa = 0,
        sb = 0,
        qL = 0,
        qa = 0,
        qb = 0;
      for (const [du, dv] of INSIDE) {
        if (!at(u0 + du, v0 + dv, tmp)) return null;
        sL += tmp[0];
        sa += tmp[1];
        sb += tmp[2];
        qL += tmp[0] * tmp[0];
        qa += tmp[1] * tmp[1];
        qb += tmp[2] * tmp[2];
      }
      const n = INSIDE.length;
      const mean: Lab = [sL / n, sa / n, sb / n];
      const variance =
        0.25 * (qL / n - mean[0] ** 2) + (qa / n - mean[1] ** 2) + (qb / n - mean[2] ** 2);
      cells.push(mean);
      spread.push(Math.sqrt(Math.max(0, variance)));
    }
  }

  // Inner edges: 12 places where two cells meet.
  let inner = 0;
  for (let k = 0; k < 2; k++) {
    const line = (k - 0.5) * CELL; // -1/6 or +1/6
    for (let j = 0; j < 3; j++) {
      for (const vertical of [true, false]) {
        const a = vertical ? cells[j * 3 + k]! : cells[k * 3 + j]!;
        const b = vertical ? cells[j * 3 + k + 1]! : cells[(k + 1) * 3 + j]!;
        let seam = 0;
        for (const t of ALONG) {
          let darkest = Infinity;
          for (const o of SEAM_OFFSETS) {
            const ok = vertical
              ? at(line + o, cellCenter(j) + t, tmp)
              : at(cellCenter(j) + t, line + o, tmp);
            if (!ok) return null;
            darkest = Math.min(darkest, tmp[0]);
          }
          seam += Math.max(0, (a[0] + b[0]) / 2 - darkest);
        }
        inner += Math.max(colorDistance(a, b), (SEAM_WEIGHT * seam) / ALONG.length);
      }
    }
  }
  inner /= 12;

  // Outer edges: each border cell against what's just outside it.
  let outer = 0;
  const side = (cell: Lab, u: number, v: number, du: number, dv: number) => {
    let sum = 0;
    for (const d of OUTSIDE) {
      if (!at(u + du * (0.5 + d), v + dv * (0.5 + d), tmp)) return NaN;
      sum += colorDistance(cell, tmp) + 0.25 * Math.max(0, cell[0] - tmp[0]);
    }
    return sum / OUTSIDE.length;
  };
  for (let j = 0; j < 3; j++) {
    const t = cellCenter(j);
    outer += side(cells[j]!, t, 0, 0, -1); // top row
    outer += side(cells[6 + j]!, t, 0, 0, 1); // bottom row
    outer += side(cells[j * 3]!, 0, t, -1, 0); // left column
    outer += side(cells[j * 3 + 2]!, 0, t, 1, 0); // right column
  }
  if (Number.isNaN(outer)) return null;
  outer /= 12;

  // A finger may cover one cell: ignore the most uneven one.
  const sorted = [...spread].sort((x, y) => x - y);
  const evenness = sorted.slice(0, 8).reduce((x, y) => x + y, 0) / 8;

  const score = inner + outer - SPREAD_WEIGHT * evenness;
  return { pose, score, cells, spread };
}

export interface FitOptions {
  /** Where to look. */
  box: Box;
  /** Last frame's pose, to start from. */
  previous?: GridPose | null;
}

/**
 * Edge strength along each column (or row) of the box: how much the color
 * changes from one pixel to the next, added up across the box.
 */
function edgeProfile(image: LabImage, box: Box, vertical: boolean): Float32Array {
  const x0 = Math.max(1, Math.floor(box.x));
  const y0 = Math.max(1, Math.floor(box.y));
  const x1 = Math.min(image.width - 2, Math.floor(box.x + box.width));
  const y1 = Math.min(image.height - 2, Math.floor(box.y + box.height));
  const profile = new Float32Array(vertical ? x1 - x0 + 1 : y1 - y0 + 1);
  const { L, a, b, width } = image;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * width + x;
      const j = vertical ? i + 1 : i + width;
      const k = vertical ? i - 1 : i - width;
      const d = Math.sqrt(
        0.25 * (L[j]! - L[k]!) ** 2 + (a[j]! - a[k]!) ** 2 + (b[j]! - b[k]!) ** 2,
      );
      profile[vertical ? x - x0 : y - y0]! += d;
    }
  }
  return profile;
}

/** Like the profile, but each value is the best within +-1 step (so a line may sit between pixels). */
function widen(profile: Float32Array): Float32Array {
  const out = new Float32Array(profile.length);
  for (let i = 0; i < profile.length; i++) {
    out[i] = Math.max(profile[i]!, profile[i - 1] ?? 0, profile[i + 1] ?? 0);
  }
  return out;
}

/**
 * Likely face spots from the "comb" a 3x3 face makes in the edge profiles:
 * four lines evenly spaced (two outer edges, two inner seams), the same
 * spacing across and down.
 */
function combSeeds(image: LabImage, box: Box, count: number): GridPose[] {
  const px = widen(edgeProfile(image, box, true));
  const py = widen(edgeProfile(image, box, false));
  const ox = Math.max(1, Math.floor(box.x));
  const oy = Math.max(1, Math.floor(box.y));
  const span = Math.min(box.width, box.height);
  const comb = (p: Float32Array, start: number, size: number) => {
    let sum = 0;
    for (let k = 0; k <= 3; k++) {
      const v = p[Math.round(start + (k * size) / 3)];
      if (v === undefined) return -Infinity;
      // The outer edges count most: they are there even on a one-color face.
      sum += k === 0 || k === 3 ? v : 0.6 * v;
    }
    return sum;
  };
  const found: { score: number; pose: GridPose }[] = [];
  for (let size = Math.round(span * 0.3); size <= span; size += 2) {
    let bestX = { score: -Infinity, at: 0 };
    let bestY = { score: -Infinity, at: 0 };
    for (let at = 0; at + size < px.length; at++) {
      const score = comb(px, at, size);
      if (score > bestX.score) bestX = { score, at };
    }
    for (let at = 0; at + size < py.length; at++) {
      const score = comb(py, at, size);
      if (score > bestY.score) bestY = { score, at };
    }
    if (!Number.isFinite(bestX.score) || !Number.isFinite(bestY.score)) continue;
    found.push({
      // Normalize by size, so a big comb doesn't win just by crossing more rows.
      score: (bestX.score + bestY.score) / Math.sqrt(size),
      pose: {
        cx: ox + bestX.at + size / 2,
        cy: oy + bestY.at + size / 2,
        size,
        angle: 0,
        aspect: 1,
      },
    });
  }
  found.sort((p, q) => q.score - p.score);
  return found.slice(0, count).map((f) => f.pose);
}

/** Finds the best grid in the box. Always returns the best try, even if it's poor. */
export function fitGrid(image: LabImage, options: FitOptions): GridFit | null {
  const { box } = options;
  const span = Math.min(box.width, box.height);
  const seeds = combSeeds(image, box, 6);
  if (options.previous) seeds.push(options.previous);
  const starts: GridFit[] = [];
  for (const pose of seeds) {
    for (const angle of [-0.12, 0, 0.12]) {
      const start = scorePose(image, { ...pose, angle: pose.angle + angle });
      if (start) starts.push(start);
    }
  }
  // Only the most promising starts get the careful (slower) nudging.
  starts.sort((p, q) => q.score - p.score);
  let best: GridFit | null = null;
  for (const start of starts.slice(0, REFINE_STARTS)) {
    const fit = refine(image, start, span * 0.5);
    if (!best || fit.score > best.score) best = fit;
  }
  return best;
}

/** Nudges a pose to a nearby better one (pattern search with shrinking steps). */
export function refine(image: LabImage, start: GridFit, span: number): GridFit {
  let best = start;
  let step = { xy: span * 0.03, size: span * 0.03, angle: 0.04, aspect: 0.05 };
  for (let round = 0; round < 6; round++) {
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 8) {
      improved = false;
      const p = best.pose;
      const moves: GridPose[] = [
        { ...p, cx: p.cx + step.xy },
        { ...p, cx: p.cx - step.xy },
        { ...p, cy: p.cy + step.xy },
        { ...p, cy: p.cy - step.xy },
        { ...p, size: p.size + step.size },
        { ...p, size: p.size - step.size },
        { ...p, angle: p.angle + step.angle },
        { ...p, angle: p.angle - step.angle },
        { ...p, aspect: p.aspect + step.aspect },
        { ...p, aspect: p.aspect - step.aspect },
      ];
      for (const pose of moves) {
        const fit = scorePose(image, pose);
        if (fit && fit.score > best.score) {
          best = fit;
          improved = true;
        }
      }
    }
    step = { xy: step.xy / 2, size: step.size / 2, angle: step.angle / 2, aspect: step.aspect / 2 };
  }
  return best;
}
