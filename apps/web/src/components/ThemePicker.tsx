import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideLink } from "../guide/GuideLink";
import { applyTheme, loadTheme } from "../theme/apply";
import { THEME_IDS, isThemeId, type ThemeId } from "../theme/tokens";

export function ThemePicker() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemeId>(loadTheme);

  return (
    <div className="flex items-center gap-2 text-sm">
      <GuideLink anchor="settings.appearance.theme" className="text-muted">
        {t("theme.label")}
      </GuideLink>
      <select
        aria-label={t("theme.label")}
        value={theme}
        onChange={(event) => {
          const next = event.target.value;
          if (!isThemeId(next)) return;
          setTheme(next);
          applyTheme(next);
        }}
        className="min-h-11 rounded-lg border border-border bg-raised px-3 text-text"
      >
        {THEME_IDS.map((id) => (
          <option key={id} value={id}>
            {t(`theme.${id}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
