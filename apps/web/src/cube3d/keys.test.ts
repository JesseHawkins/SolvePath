import { describe, expect, it } from "vitest";
import { formatMove } from "@solvepath/cube-core";
import guideMarkdown from "../../../../docs/guide/virtual-cube.md?raw";
import { keyLabel, loadKeyMoves } from "./keys";

/** Reads the "| Key | Move | Key | Move |" table from the Guide. */
function guideKeyTable(): Map<string, string> {
  const table = new Map<string, string>();
  for (const line of guideMarkdown.split("\n")) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length !== 4 || cells[0] === "Key" || cells[0]?.startsWith("-")) continue;
    for (let i = 0; i < 4; i += 2) {
      if (cells[i]) table.set(cells[i]!, cells[i + 1]!);
    }
  }
  return table;
}

describe("keyboard controls", () => {
  it("come from cubing.js's 3x3 key map", async () => {
    const moves = await loadKeyMoves();
    expect(formatMove(moves.get("KeyJ")!)).toBe("U");
    expect(formatMove(moves.get("KeyF")!)).toBe("U'");
    expect(formatMove(moves.get("KeyI")!)).toBe("R");
    expect(moves.has("Backquote")).toBe(false); // a pause, not a move
  });

  it("match the table in the Guide exactly", async () => {
    const moves = await loadKeyMoves();
    const fromApp = new Map([...moves].map(([code, move]) => [keyLabel(code), formatMove(move)]));
    expect(guideKeyTable()).toEqual(fromApp);
  });
});
