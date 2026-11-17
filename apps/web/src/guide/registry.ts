/**
 * Every feature and every setting in the app has an entry in the Guide.
 *
 * Add the id here when you add a feature or setting, then add a heading
 * with the same `{#id}` to a file in docs/guide/. CI runs
 * `npm run check:guide`, which fails if any id here has no Guide heading,
 * or if the app links to a Guide anchor that doesn't exist.
 *
 * This file must stay import-free: the check script loads it directly.
 */

export const FEATURE_IDS = [
  "feature.home",
  "feature.guide",
  "feature.virtual-cube",
  "feature.diagnostics",
] as const;

export const SETTINGS_KEYS = ["settings.appearance.theme", "settings.cube.arrows"] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];
export type SettingsKey = (typeof SETTINGS_KEYS)[number];
