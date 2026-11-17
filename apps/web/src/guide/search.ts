import MiniSearch from "minisearch";
import { GUIDE_PAGES } from "./data";

export interface GuideHit {
  id: string;
  pageId: string;
  anchor: string;
  title: string;
  pageTitle: string;
}

let index: MiniSearch<GuideHit & { text: string }> | null = null;

/** The search index is built the first time someone searches. It's small and works offline. */
function getIndex() {
  if (index) return index;
  index = new MiniSearch({
    fields: ["title", "text"],
    storeFields: ["pageId", "anchor", "title", "pageTitle"],
    searchOptions: { boost: { title: 3 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(
    GUIDE_PAGES.flatMap((page) =>
      page.sections.map((s) => ({
        id: s.anchor,
        pageId: page.id,
        anchor: s.anchor,
        title: s.title,
        pageTitle: page.title,
        text: s.text,
      })),
    ),
  );
  return index;
}

export function searchGuide(query: string, limit = 8): GuideHit[] {
  if (!query.trim()) return [];
  return getIndex()
    .search(query)
    .slice(0, limit)
    .map((r) => ({
      id: r.id as string,
      pageId: r.pageId as string,
      anchor: r.anchor as string,
      title: r.title as string,
      pageTitle: r.pageTitle as string,
    }));
}
