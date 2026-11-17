/**
 * CI check: the Guide and the app agree on anchors.
 *
 * Fails when:
 *  - a feature id or settings key (apps/web/src/guide/registry.ts) has no Guide heading,
 *  - two Guide headings use the same anchor,
 *  - the app or a Guide page links to an anchor that doesn't exist.
 *
 * Run: npm run check:guide
 */
import fs from "node:fs";
import path from "node:path";
import { FEATURE_IDS, SETTINGS_KEYS } from "../apps/web/src/guide/registry.ts";

const root = path.resolve(import.meta.dirname, "..");
const guideDir = path.join(root, "docs/guide");
const srcDir = path.join(root, "apps/web/src");

const HEADING_ANCHOR = /^#{1,6}\s.*\{#([a-z0-9][a-z0-9.-]*)\}\s*$/gm;
const MARKDOWN_LINK = /\]\(#([^)\s]+)\)/g;
const APP_LINK = /anchor="([^"]+)"/g;

const problems: string[] = [];
const anchors = new Map<string, string>(); // anchor -> file
const linksToCheck: { anchor: string; from: string }[] = [];

for (const file of fs.readdirSync(guideDir).filter((f) => f.endsWith(".md"))) {
  const text = fs.readFileSync(path.join(guideDir, file), "utf8");
  for (const [, anchor] of text.matchAll(HEADING_ANCHOR)) {
    if (!anchor) continue;
    const existing = anchors.get(anchor);
    if (existing) problems.push(`Anchor "${anchor}" is used twice: ${existing} and ${file}`);
    anchors.set(anchor, file);
  }
  for (const [, anchor] of text.matchAll(MARKDOWN_LINK)) {
    if (anchor) linksToCheck.push({ anchor, from: `docs/guide/${file}` });
  }
}

for (const entry of fs.readdirSync(srcDir, { recursive: true, encoding: "utf8" })) {
  if (!entry.endsWith(".tsx")) continue;
  const text = fs.readFileSync(path.join(srcDir, entry), "utf8");
  for (const [, anchor] of text.matchAll(APP_LINK)) {
    if (anchor) linksToCheck.push({ anchor, from: `apps/web/src/${entry}` });
  }
}

for (const id of [...FEATURE_IDS, ...SETTINGS_KEYS]) {
  if (!anchors.has(id))
    problems.push(`"${id}" has no Guide entry. Add a heading ending in {#${id}}.`);
}
for (const { anchor, from } of linksToCheck) {
  if (!anchors.has(anchor))
    problems.push(`${from} links to "${anchor}", which no Guide heading has.`);
}

if (problems.length > 0) {
  console.error(`Guide anchor check failed (${problems.length}):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(
  `Guide anchor check passed: ${anchors.size} anchors, ${FEATURE_IDS.length + SETTINGS_KEYS.length} registered ids, ${linksToCheck.length} links.`,
);
