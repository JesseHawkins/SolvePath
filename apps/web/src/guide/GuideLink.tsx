import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { guidePathFor } from "./data";

interface GuideLinkProps {
  /** A Guide anchor, for example "settings.appearance.theme". Checked by `npm run check:guide`. */
  anchor: string;
  children: ReactNode;
  className?: string;
}

/**
 * Feature titles, setting labels, and stat names use this, so tapping
 * the name opens its Guide entry. This keeps explanations out of the main UI.
 */
export function GuideLink({ anchor, children, className = "" }: GuideLinkProps) {
  const { t } = useTranslation();
  const to = guidePathFor(anchor);
  if (!to) {
    if (import.meta.env.DEV) console.warn(`No Guide entry for anchor "${anchor}"`);
    return <span className={className}>{children}</span>;
  }
  return (
    <Link
      to={to}
      className={`underline decoration-dotted underline-offset-4 hover:decoration-solid ${className}`}
    >
      {children}
      <span className="sr-only"> ({t("common.opensGuide")})</span>
    </Link>
  );
}
