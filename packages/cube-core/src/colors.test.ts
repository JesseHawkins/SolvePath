import { describe, expect, it } from "vitest";
import {
  checkScheme,
  DEFAULT_DISPLAY_COLORS,
  DEFAULT_PROFILE,
  faceForColor,
  STICKER_COLORS,
  WESTERN_SCHEME,
} from "./colors";

describe("color schemes", () => {
  it("accepts the Western scheme", () => {
    expect(checkScheme(WESTERN_SCHEME)).toEqual([]);
    expect(DEFAULT_PROFILE.scheme).toBe(WESTERN_SCHEME);
  });

  it("flags a repeated color", () => {
    expect(checkScheme({ ...WESTERN_SCHEME, D: "white" })).toContainEqual({
      kind: "repeated-color",
      color: "white",
    });
  });

  it("flags usual pairs that aren't opposite", () => {
    const swapped = { ...WESTERN_SCHEME, F: "red", R: "green" } as const;
    expect(checkScheme(swapped).map((p) => p.kind)).toContain("not-opposite");
  });

  it("maps colors back to faces", () => {
    expect(faceForColor(WESTERN_SCHEME, "green")).toBe("F");
    expect(faceForColor(WESTERN_SCHEME, "yellow")).toBe("D");
  });

  it("draws every color differently", () => {
    const shown = STICKER_COLORS.map((c) => DEFAULT_DISPLAY_COLORS[c]);
    expect(new Set(shown).size).toBe(6);
  });
});
