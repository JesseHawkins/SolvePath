/**
 * CI check: every installed npm package has an open-source license we allow.
 *
 * Working Rule 9: ask before adding anything that isn't open source.
 * If this check fails, don't just add the license to the list. Check the
 * package and ask the project owner first.
 *
 * Run: npm run check:licenses
 */
import fs from "node:fs";
import path from "node:path";
import { isExpressionAllowed } from "./spdx.ts";

const ALLOWED = new Set([
  "MIT",
  "MIT-0",
  "ISC",
  "0BSD",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "MPL-2.0",
  "OFL-1.1",
  "CC0-1.0",
  "CC-BY-4.0",
  "BlueOak-1.0.0",
  "Python-2.0",
  "Unlicense",
  "Zlib",
]);

interface LockEntry {
  version?: string;
  license?: string;
  link?: boolean;
  dev?: boolean;
}

const root = path.resolve(import.meta.dirname, "..");
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
  packages: Record<string, LockEntry>;
};

const problems: string[] = [];
const counts = new Map<string, number>();
let total = 0;

for (const [key, entry] of Object.entries(lock.packages)) {
  if (!key.includes("node_modules/") || entry.link) continue;
  const name = key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
  const license = entry.license;
  total++;
  if (!license) {
    problems.push(`${name}@${entry.version ?? "?"}: no license listed`);
    continue;
  }
  counts.set(license, (counts.get(license) ?? 0) + 1);
  let ok: boolean;
  try {
    ok = isExpressionAllowed(license, ALLOWED);
  } catch (error) {
    problems.push(`${name}: ${(error as Error).message}`);
    continue;
  }
  if (!ok)
    problems.push(`${name}@${entry.version ?? "?"}: "${license}"${entry.dev ? " (dev only)" : ""}`);
}

const summary = [...counts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([license, n]) => `${license}: ${n}`)
  .join(", ");

if (problems.length > 0) {
  console.error(`License check failed (${problems.length}):\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`License check passed for ${total} packages. ${summary}`);
