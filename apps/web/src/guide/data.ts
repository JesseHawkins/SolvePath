import guidePages from "virtual:guide";
import type { GuidePage } from "./types";

export const GUIDE_PAGES: readonly GuidePage[] = guidePages;

/** Which Guide page holds each anchor, for example "privacy.camera" → "privacy". */
export const PAGE_FOR_ANCHOR: ReadonlyMap<string, string> = new Map(
  GUIDE_PAGES.flatMap((page) => page.sections.map((s) => [s.anchor, page.id] as const)),
);

export function guidePathFor(anchor: string): string | null {
  const pageId = PAGE_FOR_ANCHOR.get(anchor);
  return pageId ? `/guide/${pageId}#${anchor}` : null;
}
