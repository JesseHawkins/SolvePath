import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { THEME_IDS, THEMES, themeStylesheet, type ThemeTokens } from "./tokens";

// WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for UI parts like focus rings.
// The high-contrast theme aims for AAA text (7:1).
type Pair = [fg: keyof ThemeTokens, bg: keyof ThemeTokens, minimum: number];

const TEXT_PAIRS: Pair[] = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text", "raised", 4.5],
  ["muted", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "raised", 4.5],
  ["onAccent", "accent", 4.5],
  ["accent", "bg", 4.5],
  ["accent", "surface", 4.5],
  ["success", "surface", 4.5],
  ["warning", "surface", 4.5],
  ["danger", "surface", 4.5],
];
const UI_PAIRS: Pair[] = [
  ["focus", "bg", 3],
  ["focus", "surface", 3],
  ["focus", "raised", 3],
  ["accent", "raised", 3],
];

describe.each(THEME_IDS)("theme %s", (id) => {
  const theme = THEMES[id];
  const boost = id === "high-contrast" ? 7 / 4.5 : 1;

  it.each(TEXT_PAIRS)("%s on %s has enough contrast for text", (fg, bg, minimum) => {
    expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(minimum * boost);
  });

  it.each(UI_PAIRS)("%s on %s has enough contrast for UI", (fg, bg, minimum) => {
    expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(minimum);
  });
});

describe("themeStylesheet", () => {
  it("defines every token for every theme", () => {
    const css = themeStylesheet();
    for (const id of THEME_IDS) {
      expect(css).toContain(`[data-theme="${id}"]`);
    }
    expect(css.match(/--sp-accent:/g)).toHaveLength(THEME_IDS.length);
  });
});

describe("contrastRatio", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});
