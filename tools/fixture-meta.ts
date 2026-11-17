/**
 * The facts saved with each real test clip (PLAN.md 5.11). Shared by the
 * fixture recorder and `npm run fixtures:add`.
 */
export const CUBES = ["gan-356-i-carry", "duncan", "other"] as const;
export const LIGHTING = ["daylight", "warm-bulb", "dim", "glare", "studio"] as const;

export interface FixtureMeta {
  /** Moves done to a solved cube (white on top, green in front) before the scan. */
  scramble: string;
  cube: (typeof CUBES)[number];
  lighting: (typeof LIGHTING)[number];
  /** True if the camera picture is flipped left to right. */
  flipped: boolean;
  /** True if one color's stickers were marked with dots (marking mode, M4). */
  marked: boolean;
  /** Free-form note, like "phone propped on books". Never names or places. */
  note?: string;
}

/** Moves we accept in a scramble: outer face turns, as in competition scrambles. */
const MOVE = /^[URFDLB](2|')?$/;

/** Returns a list of problems (empty if the facts look right). */
export function checkMeta(value: unknown): string[] {
  const problems: string[] = [];
  if (!value || typeof value !== "object") return ["The facts file isn't a JSON object."];
  const m = value as Record<string, unknown>;
  if (typeof m.scramble !== "string" || m.scramble.trim() === "") {
    problems.push("scramble is missing.");
  } else {
    const bad = m.scramble
      .trim()
      .split(/\s+/)
      .filter((t) => !MOVE.test(t));
    if (bad.length > 0) problems.push(`scramble has moves we don't expect: ${bad.join(" ")}`);
  }
  if (!CUBES.includes(m.cube as never)) problems.push(`cube must be one of: ${CUBES.join(", ")}`);
  if (!LIGHTING.includes(m.lighting as never)) {
    problems.push(`lighting must be one of: ${LIGHTING.join(", ")}`);
  }
  if (typeof m.flipped !== "boolean") problems.push("flipped must be true or false.");
  if (typeof m.marked !== "boolean") problems.push("marked must be true or false.");
  if (m.note !== undefined && typeof m.note !== "string") problems.push("note must be text.");
  return problems;
}
