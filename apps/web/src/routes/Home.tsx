import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "@solvepath/config";
import { GuideLink } from "../guide/GuideLink";

const FEATURES = ["scan", "follow", "learn", "timer"] as const;

export function Home() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="home-heading" className="flex flex-col gap-6">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h1 id="home-heading" className="text-4xl font-bold tracking-tight">
          {t("home.heading", { appName: APP_NAME })}
        </h1>
        <p className="mt-3 text-lg text-muted">{t("home.tagline")}</p>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-8">
        <h2 className="text-xl font-semibold">
          <GuideLink anchor="feature.home">{t("nav.home")}</GuideLink>
        </h2>
        <p className="mt-2 text-muted">{t("home.building")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((key) => (
            <li key={key} className="rounded-2xl bg-raised p-4">
              {t(`home.features.${key}`)}
            </li>
          ))}
        </ul>
        <Link
          to="/guide"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          {t("home.readGuide")}
        </Link>
      </div>
    </section>
  );
}
