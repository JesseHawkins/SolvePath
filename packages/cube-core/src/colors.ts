/**
 * Sticker colors, color schemes, and cube profiles.
 *
 * A color scheme says which color belongs on each face of a solved cube.
 * Most cubes use the "Western" scheme below, but a cube profile can change
 * it (some cubes swap colors, and stickerless cubes often use different
 * shades). Faces stay logical everywhere else in cube-core; only this file
 * knows about colors.
 */
import { FACES, OPPOSITE_FACE, type Face } from "./faces";

export const STICKER_COLORS = ["white", "yellow", "green", "blue", "red", "orange"] as const;
export type StickerColor = (typeof STICKER_COLORS)[number];

export type ColorScheme = Readonly<Record<Face, StickerColor>>;

/** White top, green front, red right. The most common scheme. */
export const WESTERN_SCHEME: ColorScheme = {
  U: "white",
  D: "yellow",
  F: "green",
  B: "blue",
  R: "red",
  L: "orange",
};

/** Colors for drawing the virtual cube. Picked to be easy to tell apart. */
export const DEFAULT_DISPLAY_COLORS: Readonly<Record<StickerColor, string>> = {
  white: "#f4f5f7",
  yellow: "#ffd500",
  green: "#00a651",
  blue: "#0062d6",
  red: "#d4202a",
  orange: "#ff7a00",
};

/** The plastic between stickers on the virtual cube. */
export const CUBE_BODY_COLOR = "#101114";

export interface CubeProfile {
  /** Stable id, like "default" or a generated id for a user's cube. */
  readonly id: string;
  /** Name picked from a list (never typed), like "Speed cube" or "Big cube". */
  readonly name: string;
  readonly scheme: ColorScheme;
  /** How each color looks on the virtual cube. */
  readonly displayColors: Readonly<Record<StickerColor, string>>;
  /** Stickerless cubes have colored plastic instead of stickers (helps the camera, M2+). */
  readonly stickerless: boolean;
}

export const DEFAULT_PROFILE: CubeProfile = {
  id: "default",
  name: "standard",
  scheme: WESTERN_SCHEME,
  displayColors: DEFAULT_DISPLAY_COLORS,
  stickerless: false,
};

export type SchemeProblem =
  | { kind: "repeated-color"; color: StickerColor }
  | { kind: "not-opposite"; color: StickerColor; expectedOpposite: StickerColor };

/**
 * A scheme must use each color once. We also check the usual pairs are on
 * opposite faces (white/yellow, green/blue, red/orange); a scheme that
 * breaks this is allowed but flagged, since it's almost always a mistake.
 */
export function checkScheme(scheme: ColorScheme): SchemeProblem[] {
  const problems: SchemeProblem[] = [];
  const seen = new Set<StickerColor>();
  for (const face of FACES) {
    const color = scheme[face];
    if (seen.has(color)) problems.push({ kind: "repeated-color", color });
    seen.add(color);
  }
  const pairs: [StickerColor, StickerColor][] = [
    ["white", "yellow"],
    ["green", "blue"],
    ["red", "orange"],
  ];
  for (const [a, b] of pairs) {
    const face = FACES.find((f) => scheme[f] === a);
    if (face && scheme[OPPOSITE_FACE[face]] !== b) {
      problems.push({ kind: "not-opposite", color: a, expectedOpposite: b });
    }
  }
  return problems;
}

/** The face a color belongs to under a scheme, or undefined if it's not in the scheme. */
export function faceForColor(scheme: ColorScheme, color: StickerColor): Face | undefined {
  return FACES.find((f) => scheme[f] === color);
}
