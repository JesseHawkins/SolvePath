import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="nf-heading">
      <h1 id="nf-heading" className="text-3xl font-bold">
        {t("notFound.heading")}
      </h1>
      <p className="mt-2 text-muted">{t("notFound.body")}</p>
      <Link to="/" className="mt-4 inline-block underline underline-offset-4">
        {t("notFound.goHome")}
      </Link>
    </section>
  );
}
