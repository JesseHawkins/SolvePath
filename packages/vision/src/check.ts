/**
 * Checking a scan against a known scramble (Scan Lab's accuracy test).
 *
 * The user scrambles a solved cube with moves we show them, then scans it.
 * The scan comes back in the way the cube was held, with colors measured
 * from the camera. To compare, we name each scanned color with the closest
 * standard color, then try all 24 ways of holding the cube.
 */
import {
  applyMoves,
  DEFAULT_PROFILE,
  FACES,
  facelets,
  ORIENTATIONS,
  type CubeState,
  type Face,
  type StickerColor,
} from "@solvepath/cube-core";
import { colorDistance, hexToOklab, type Lab } from "./color";
import { assign } from "./hungarian";

/** The 54 sticker colors of a state, by color name. */
function colorNames(state: CubeState, colorOf: Record<Face, StickerColor>): StickerColor[] {
  return facelets(state).map((face) => colorOf[face]);
}

/** Names each scanned face color with the closest standard color (each name used once). */
export function nameScannedColors(faceColors: Record<Face, Lab>): Record<Face, StickerColor> {
  const scheme = DEFAULT_PROFILE.scheme;
  const reference = FACES.map((f) => hexToOklab(DEFAULT_PROFILE.displayColors[scheme[f]]));
  const pairing = assign(FACES.map((f) => reference.map((r) => colorDistance(faceColors[f], r))));
  const names = {} as Record<Face, StickerColor>;
  FACES.forEach((f, i) => (names[f] = scheme[FACES[pairing[i]!]!]));
  return names;
}

/**
 * True if the scanned cube is the target cube held some way.
 * @param scanned the scan's state, labeled by where each center was
 * @param scannedColors the color of each of those faces, by name
 * @param target the expected cube (standard colors)
 */
export function sameCube(
  scanned: CubeState,
  scannedColors: Record<Face, StickerColor>,
  target: CubeState,
): boolean {
  const want = colorNames(target, DEFAULT_PROFILE.scheme);
  return ORIENTATIONS.some((o) => {
    const held = colorNames(applyMoves(scanned, o.rotation), scannedColors);
    return held.every((c, i) => c === want[i]);
  });
}
