import { DEFAULT_THEME, isThemeId, themeStylesheet, type ThemeId } from "./tokens";

const STORAGE_KEY = "solvepath.theme";

/** Adds the theme variables to the page. Call once, before the first render. */
export function installThemeStylesheet(): void {
  const style = document.createElement("style");
  style.dataset.solvepath = "theme";
  style.textContent = themeStylesheet();
  document.head.append(style);
}

/**
 * Reads the saved theme. In M0 this lives in localStorage; player profiles
 * (M9) will move it into each player's settings.
 */
export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this visit.
  }
}
