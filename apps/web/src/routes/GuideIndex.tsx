import { useId, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { GUIDE_PAGES } from "../guide/data";
import { GuideLink } from "../guide/GuideLink";
import { searchGuide } from "../guide/search";

export function GuideIndex() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputId = useId();
  const hits = searchGuide(query);

  return (
    <section aria-labelledby="guide-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="guide-heading" className="text-3xl font-bold">
          <GuideLink anchor="feature.guide">{t("guide.title")}</GuideLink>
        </h1>
        <p className="mt-2 text-muted">{t("guide.intro")}</p>
      </div>

      <div role="search">
        <label htmlFor={inputId} className="block font-medium">
          {t("guide.searchLabel")}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("guide.searchPlaceholder")}
          className="mt-2 min-h-11 w-full rounded-xl border border-border bg-raised px-4 text-text placeholder:text-muted"
        />
        {query.trim() !== "" && (
          <div aria-live="polite" className="mt-3">
            {hits.length === 0 ? (
              <p className="text-muted">{t("guide.noResults")}</p>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="guide-results">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      to={`/guide/${hit.pageId}#${hit.anchor}`}
                      className="block rounded-xl bg-surface px-4 py-3 hover:bg-raised"
                    >
                      <span className="font-medium">{hit.title}</span>
                      <span className="block text-sm text-muted">{hit.pageTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <nav aria-label={t("guide.allPages")}>
        <h2 className="text-xl font-semibold">{t("guide.allPages")}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {GUIDE_PAGES.map((page) => (
            <li key={page.id}>
              <Link
                to={`/guide/${page.id}`}
                className="flex min-h-11 items-center rounded-xl bg-surface px-4 py-3 hover:bg-raised"
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
