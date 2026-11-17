/**
 * Keyboard controls for the virtual cube.
 *
 * We use cubing.js's 3x3 key map, which follows the layout csTimer made
 * popular (J and F for U, I and K for R, and so on), so speedcubers can
 * use the keys they already know.
 */
import { parseAlg, type Move } from "@solvepath/cube-core";

export async function loadKeyMoves(): Promise<ReadonlyMap<string, Move>> {
  const { cube3x3x3 } = await import("cubing/puzzles");
  const mapping = (await cube3x3x3.keyMapping?.()) ?? {};
  const moves = new Map<string, Move>();
  for (const [code, leaf] of Object.entries(mapping)) {
    const parsed = parseAlg(leaf.toString()); // a pause (".") parses to no moves
    if (parsed.length === 1) moves.set(code, parsed[0]!);
  }
  return moves;
}

/** "KeyJ" → "J", "Semicolon" → ";", for showing keys to people. */
export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  return (
    ({ Semicolon: ";", Comma: ",", Period: ".", Slash: "/" } as Record<string, string>)[code] ??
    code
  );
}
