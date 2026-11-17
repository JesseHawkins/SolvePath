/**
 * Compiles the Markdown files in docs/guide/ into data the app can show.
 *
 * This runs at build time (inside Vite), not in the browser, so users
 * download ready-made HTML and the app stays small and fast.
 *
 * Anchors: every heading that the app links to ends with `{#some.id}`,
 * for example `## Inspection {#timer.inspection}`. The `{#...}` part is
 * removed from the visible text and becomes the heading's HTML id.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import type { Heading, RootContent } from "mdast";

export interface GuideSection {
  /** The anchor id, for example "timer.inspection". */
  anchor: string;
  title: string;
  /** Plain text of the section, used by search. */
  text: string;
}

export interface GuidePage {
  /** File name without ".md", for example "privacy". */
  id: string;
  title: string;
  html: string;
  sections: GuideSection[];
}

const ANCHOR_PATTERN = /\s*\{#([a-z0-9][a-z0-9.-]*)\}\s*$/;

/** Pulls a trailing `{#id}` off a heading. Returns the id, or null if there is none. */
export function takeHeadingAnchor(heading: Heading): string | null {
  const last = heading.children.at(-1);
  if (!last || last.type !== "text") return null;
  const match = ANCHOR_PATTERN.exec(last.value);
  if (!match?.[1]) return null;
  last.value = last.value.slice(0, match.index);
  heading.data = { ...heading.data, hProperties: { id: match[1] } };
  return match[1];
}

function anchorOf(node: RootContent): string | null {
  if (node.type !== "heading") return null;
  const id = node.data?.hProperties?.id;
  return typeof id === "string" ? id : null;
}

export async function compileGuidePage(id: string, markdown: string): Promise<GuidePage> {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  visit(tree, "heading", (heading: Heading) => {
    takeHeadingAnchor(heading);
  });

  const firstHeading = tree.children.find(
    (node): node is Heading => node.type === "heading" && node.depth === 1,
  );
  if (!firstHeading) throw new Error(`Guide page "${id}" needs a "# Title" first line.`);

  // Split the page into searchable sections, one per heading with an anchor.
  const sections: GuideSection[] = [];
  let current: GuideSection | null = null;
  for (const node of tree.children) {
    const anchor = anchorOf(node);
    if (anchor && node.type === "heading" && node.depth <= 3) {
      current = { anchor, title: toString(node), text: "" };
      sections.push(current);
    } else if (current) {
      current.text += (current.text ? " " : "") + toString(node);
    }
  }

  // Raw HTML in Markdown is dropped (remark-rehype's default), so Guide
  // files can never inject scripts into the app.
  const hast = await unified().use(remarkRehype).run(tree);
  const html = unified().use(rehypeStringify).stringify(hast);

  return { id, title: toString(firstHeading), html, sections };
}
