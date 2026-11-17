/**
 * Vite plugin: `import guidePages from "virtual:guide"` gives the app every
 * compiled Guide page. Editing a Markdown file reloads it during development.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { compileGuidePage } from "./guide-compile.ts";

const VIRTUAL_ID = "virtual:guide";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export function guidePlugin(options: { dir: string }): Plugin {
  return {
    name: "solvepath-guide",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return null;
      const files = (await fs.readdir(options.dir)).filter((f) => f.endsWith(".md")).sort();
      const pages = [];
      for (const file of files) {
        const fullPath = path.join(options.dir, file);
        this.addWatchFile(fullPath);
        const markdown = await fs.readFile(fullPath, "utf8");
        pages.push(await compileGuidePage(path.basename(file, ".md"), markdown));
      }
      return `export default ${JSON.stringify(pages)};`;
    },
    hotUpdate({ file }) {
      if (!file.startsWith(options.dir) || !file.endsWith(".md")) return;
      const graph = this.environment.moduleGraph;
      const mod = graph.getModuleById(RESOLVED_ID);
      if (mod) graph.invalidateModule(mod);
      this.environment.hot.send({ type: "full-reload" });
      return [];
    },
  };
}
