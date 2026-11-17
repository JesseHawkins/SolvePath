/**
 * Adds a real test clip (and its facts file) to packages/test-fixtures/vision.
 *
 *   npm run fixtures:add -- <clip.webm|clip.mp4> <facts.json>
 *
 * Clips should show only hands and the cube (they go in the public repo).
 */
import fs from "node:fs";
import path from "node:path";
import { checkMeta } from "./fixture-meta.ts";

const MAX_BYTES = 20 * 1024 * 1024;
const [clip, meta] = process.argv.slice(2);
if (!clip || !meta) {
  console.error("Usage: npm run fixtures:add -- <clip.webm|clip.mp4> <facts.json>");
  process.exit(1);
}
const ext = path.extname(clip).toLowerCase();
if (![".webm", ".mp4", ".mov"].includes(ext)) {
  console.error("The clip should be a .webm, .mp4, or .mov file.");
  process.exit(1);
}
const size = fs.statSync(clip).size;
if (size > MAX_BYTES) {
  console.error(
    `The clip is ${(size / 1e6).toFixed(1)} MB. Keep clips under 20 MB (record about 15 seconds).`,
  );
  process.exit(1);
}
const facts: unknown = JSON.parse(fs.readFileSync(meta, "utf8"));
const problems = checkMeta(facts);
if (problems.length > 0) {
  console.error(`The facts file has problems:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const dir = path.resolve(import.meta.dirname, "../packages/test-fixtures/vision");
fs.mkdirSync(dir, { recursive: true });
const base = path
  .basename(clip, path.extname(clip))
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-");
if (fs.existsSync(path.join(dir, `${base}.json`))) {
  console.error(`A clip named ${base} is already there. Rename the file and try again.`);
  process.exit(1);
}
fs.copyFileSync(clip, path.join(dir, `${base}${ext}`));
fs.writeFileSync(path.join(dir, `${base}.json`), `${JSON.stringify(facts, null, 2)}\n`);
console.log(`Added ${base}. Now run: npm run vision:report`);
