/**
 * Reading and writing cube notation (Singmaster / WCA style).
 *
 * Parsing uses cubing.js's well-tested parser, so grouping, repeats, and
 * commutators like "[R, U]" or "(R U)2" all work. We then accept only the
 * moves that make sense on a 3x3:
 *   U R F D L B          outer faces
 *   Uw Rw ... or u r ... two layers (wide)
 *   M E S                middle slices
 *   x y z                whole-cube rotations
 * with an optional 2 (half turn) or ' (the other way).
 */
import { Alg, Move as CubingMove } from "cubing/alg";
import type { Amount, Move, MoveFamily } from "./moves";

export class NotationError extends Error {
  readonly token: string;
  constructor(message: string, token: string) {
    super(message);
    this.token = token;
    this.name = "NotationError";
  }
}

const FACE_LETTERS = new Set(["U", "R", "F", "D", "L", "B"]);
const WIDE_FAMILIES = new Set(["Uw", "Rw", "Fw", "Dw", "Lw", "Bw"]);
const LOWERCASE_WIDE: Record<string, MoveFamily> = {
  u: "Uw",
  r: "Rw",
  f: "Fw",
  d: "Dw",
  l: "Lw",
  b: "Bw",
};
const SLICES_AND_ROTATIONS = new Set(["M", "E", "S", "x", "y", "z"]);

function toMove(node: CubingMove): Move | null {
  const token = node.toString();
  const { family } = node;
  // cubing.js's types say null, but at runtime a missing layer is undefined. Accept both.
  const outerLayer = node.outerLayer ?? null;
  const innerLayer = node.innerLayer ?? null;
  if (outerLayer !== null) {
    throw new NotationError(`"${token}" uses layer ranges, which a 3x3 doesn't need.`, token);
  }

  let ourFamily: MoveFamily;
  if (FACE_LETTERS.has(family) && (innerLayer === null || innerLayer === 1)) {
    ourFamily = family as MoveFamily;
  } else if (WIDE_FAMILIES.has(family) && (innerLayer === null || innerLayer === 2)) {
    ourFamily = family as MoveFamily;
  } else if (family in LOWERCASE_WIDE && innerLayer === null) {
    ourFamily = LOWERCASE_WIDE[family]!;
  } else if (SLICES_AND_ROTATIONS.has(family) && innerLayer === null) {
    ourFamily = family as MoveFamily;
  } else {
    throw new NotationError(`"${token}" isn't a 3x3 move.`, token);
  }

  const amount = ((node.amount % 4) + 4) % 4;
  return amount === 0 ? null : { family: ourFamily, amount: amount as Amount };
}

/** Parses notation like "R U R' U'" or "(R U R' U')2" into moves. */
export function parseAlg(text: string): Move[] {
  let alg: Alg;
  try {
    alg = new Alg(text);
  } catch (error) {
    throw new NotationError(
      `Couldn't read "${text}": ${error instanceof Error ? error.message : String(error)}`,
      text,
    );
  }
  const moves: Move[] = [];
  for (const leaf of alg.experimentalExpand()) {
    if (leaf instanceof CubingMove) {
      const move = toMove(leaf);
      if (move) moves.push(move);
    }
    // Pauses ("."), comments, and line breaks are ignored.
  }
  return moves;
}

export interface FormatOptions {
  /** How to write two-layer moves: "r" (default, common in algorithms) or "Rw". */
  wide?: "lowercase" | "w";
}

export function formatMove(move: Move, options: FormatOptions = {}): string {
  let family: string = move.family;
  if (family.endsWith("w") && options.wide !== "w") family = family[0]!.toLowerCase();
  const suffix = move.amount === 1 ? "" : move.amount === 2 ? "2" : "'";
  return family + suffix;
}

export function formatAlg(moves: readonly Move[], options: FormatOptions = {}): string {
  return moves.map((m) => formatMove(m, options)).join(" ");
}
