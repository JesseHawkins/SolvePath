/**
 * Writes versions.json for the admin landing page: app version, git commit,
 * build time, and the pinned versions of the main dependencies and services.
 *
 * Usage: node tools/version-report.ts <output-file>
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = process.argv[2];
if (!out) {
  console.error("Usage: node tools/version-report.ts <output-file>");
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8")) as {
  version: string;
  packages: Record<string, { version?: string }>;
};
const KEY_PACKAGES = [
  "react",
  "vite",
  "cubing",
  "tailwindcss",
  "typescript",
  "pocketbase",
  "three",
];
const dependencies = Object.fromEntries(
  KEY_PACKAGES.flatMap((name) => {
    const version = lock.packages[`node_modules/${name}`]?.version;
    return version ? [[name, version]] : [];
  }),
);

function readArg(file: string, arg: string): string | null {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  return new RegExp(`^ARG ${arg}=(\\S+)`, "m").exec(text)?.[1] ?? null;
}
function readFrom(file: string, image: string): string | null {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  return new RegExp(`FROM ${image}:([^@\\s]+)`).exec(text)?.[1] ?? null;
}

let gitCommit = process.env.GIT_COMMIT ?? "unknown";
if (gitCommit === "unknown") {
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    // Not a git checkout (for example inside a Docker build). Keep "unknown".
  }
}

const report = {
  app: lock.version,
  gitCommit,
  builtAt: new Date().toISOString(),
  services: {
    pocketbase: readArg("server/Dockerfile", "PB_VERSION"),
    caddy: readFrom("deploy/web.Dockerfile", "caddy"),
    node: readFrom("deploy/web.Dockerfile", "node"),
  },
  dependencies,
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(`Wrote ${out}`);
