/**
 * Theme tokens: every color in the app comes from here.
 *
 * Components never use raw colors. They use Tailwind classes like
 * `bg-surface` or `text-muted`, which point at CSS variables, which are
 * filled in from these tables. Switching themes just swaps the variables.
 *
 * `tokens.test.ts` checks that every theme meets WCAG 2.2 AA contrast.
 */

export const THEME_IDS = ["dark", "light", "high-contrast"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = "dark";

export interface ThemeTokens {
  /** Page background. */
  bg: string;
  /** Cards and panels. */
  surface: string;
  /** Raised controls on top of a surface (inputs, buttons at rest). */
  raised: string;
  /** Main text. */
  text: string;
  /** Secondary text (still has to be easy to read). */
  muted: string;
  /** Lines between things. Decorative, so no contrast rule. */
  border: string;
  /** Brand and main action color. */
  accent: string;
  /** Text drawn on top of the accent color. */
  onAccent: string;
  /** Keyboard focus ring. */
  focus: string;
  success: string;
  warning: string;
  danger: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    bg: "#0b0d12",
    surface: "#151922",
    raised: "#1e2430",
    text: "#f3f5f9",
    muted: "#aeb8c8",
    border: "#2c3442",
    accent: "#5eb1ff",
    onAccent: "#06121f",
    focus: "#ffd166",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#f87171",
  },
  light: {
    bg: "#f7f8fb",
    surface: "#ffffff",
    raised: "#eef1f6",
    text: "#10141c",
    muted: "#4a5466",
    border: "#c9d1de",
    accent: "#0b63c4",
    onAccent: "#ffffff",
    focus: "#a34a00",
    success: "#15803d",
    warning: "#8a5300",
    danger: "#b91c1c",
  },
  "high-contrast": {
    bg: "#000000",
    surface: "#000000",
    raised: "#141414",
    text: "#ffffff",
    muted: "#e6e6e6",
    border: "#ffffff",
    accent: "#ffd400",
    onAccent: "#000000",
    focus: "#00e5ff",
    success: "#5cff8d",
    warning: "#ffd400",
    danger: "#ff7a7a",
  },
};

/** Builds the CSS that defines every theme's variables. */
export function themeStylesheet(): string {
  return THEME_IDS.map((id) => {
    const vars = Object.entries(THEMES[id])
      .map(([name, value]) => `--sp-${name}:${value};`)
      .join("");
    return `[data-theme="${id}"]{${vars}color-scheme:${id === "light" ? "light" : "dark"};}`;
  }).join("\n");
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
