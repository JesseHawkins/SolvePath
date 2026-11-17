import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { APP_NAME, SOURCE_URL } from "@solvepath/config";
import { ThemePicker } from "./ThemePicker";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-lg px-3 font-medium ${
    isActive ? "bg-raised text-text" : "text-muted hover:text-text"
  }`;

export function Layout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        {t("common.skipToContent")}
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <NavLink to="/" className="text-xl font-bold tracking-tight">
            {APP_NAME}
          </NavLink>
          <nav aria-label={t("nav.label")} className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/cube" className={navLinkClass}>
              {t("nav.cube")}
            </NavLink>
            <NavLink to="/guide" className={navLinkClass}>
              {t("nav.guide")}
            </NavLink>
          </nav>
          <ThemePicker />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none"
      >
        <Outlet />
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
        <p>
          {t("footer.promise")}{" "}
          <a href={SOURCE_URL} className="underline underline-offset-4" rel="noopener noreferrer">
            {t("footer.source")}
          </a>
        </p>
      </footer>
    </div>
  );
}
