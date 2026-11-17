import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeTokens } from "./tokens";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function currentTheme() {
  const id = document.documentElement.dataset.theme;
  return isThemeId(id) ? id : DEFAULT_THEME;
}

/** The current theme's colors, for things CSS can't reach (like the 3D cube). */
export function useThemeTokens(): ThemeTokens {
  return THEMES[useSyncExternalStore(subscribe, currentTheme)];
}
