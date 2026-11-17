import { useEffect, useRef, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { GUIDE_PAGES, guidePathFor } from "../guide/data";

export function GuidePageView() {
  const { t } = useTranslation();
  const { pageId } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const page = GUIDE_PAGES.find((p) => p.id === pageId);

  // Jump to the anchor in the address (for example #settings.appearance.theme).
  useEffect(() => {
    const anchor = decodeURIComponent(hash.slice(1));
    const target = anchor ? document.getElementById(anchor) : null;
    if (target) {
      target.scrollIntoView({ block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash, pageId]);

  if (!page) {
    return (
      <div>
        <p>{t("guide.notFound")}</p>
        <Link to="/guide" className="underline">
          {t("guide.allPages")}
        </Link>
      </div>
    );
  }

  // Links inside Guide text are written as [words](#some.anchor).
  // Send them to whichever page holds that anchor, without a full page load.
  const onClick = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as HTMLElement).closest("a");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const to = guidePathFor(href.slice(1));
    if (!to) return;
    event.preventDefault();
    void navigate(to);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/guide" className="text-sm text-muted underline underline-offset-4">
        {t("guide.allPages")}
      </Link>
      {/* The HTML is compiled from our own Markdown at build time, with raw HTML removed. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- clicks here only come from the links inside, which are keyboard reachable */}
      <article
        ref={articleRef}
        className="guide-prose rounded-3xl border border-border bg-surface p-6 sm:p-8"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </div>
  );
}
