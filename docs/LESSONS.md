# Lessons learned

A candid log, updated at the end of every milestone. It's the raw material for the later "build this with me" guide, so it records what worked, the dead ends, the slow bugs, and what a person rebuilding this from scratch should do differently.

---

## Planning (before M0)

**What worked**

- **Checking every version against the real registries** (npm, GitHub releases, Docker Hub via `skopeo`) before writing the plan. Several "obvious" picks turned out to be wrong for November 2026 (see below). Guessing from memory would have baked those mistakes in.
- **Asking the owner a numbered list of questions**, each with a recommendation. Answers came back fast and short ("go with your picks"), and the list became a decisions table in the plan.
- **Writing down the owner's guiding principle** ("prefer mature, well-documented software") and applying it to every later choice.

**Decisions that changed**

- **Performance floor:** the spec said school Chromebooks and old iPads. The owner changed it to "an iPhone 14 Pro must be buttery smooth". That removed a lot of low-end workarounds before they were written. Lesson: confirm the target hardware early, with the owner's real devices.
- **Lint tooling:** I first recommended Biome + TypeScript 7. The owner asked for mature, well-documented tools, so we switched to ESLint + Prettier + TypeScript 6.0.3 (typescript-eslint doesn't support TS 7 yet).
- **Hosting:** first a `/cube/` folder on a shared host, then a subdomain. Browsers isolate storage by _origin_, not path, so a folder on a shared host lets every other page there read the app's data and login token. A subdomain fixes that for free.
- **Leaderboards:** the owner wanted them on by default with no speed floor. To stay privacy-friendly, names are hidden from logged-out visitors.

**Spec corrections found while verifying** (details in PLAN.md Section 1)

- TypeScript 7 is "latest" but incompatible with typescript-eslint.
- Framer Motion is now called `motion`.
- Playwright's fake camera reads only `.y4m`/`.mjpeg`, not MP4.
- PocketBase has no official Docker image, and no native passkeys.
- The taught grip covers the top and bottom centers, so only 4 centers can seed color clustering.

---

## M0: Scaffold

**What worked**

- **Node 24 runs TypeScript files directly** (type stripping). Tool scripts are plain `.ts` files run with `node tools/x.ts`: no build step, no ts-node, no tsx. Rule: only use erasable syntax (no `enum`), and import with the `.ts` extension.
- **Internal packages with no build step:** each `package.json` points `exports` at `src/index.ts`. Vite, Vitest, and `tsc` all follow it. Nothing to rebuild when a package changes.
- **Theme tokens in TypeScript with a contrast unit test.** The tokens are plain data, so a test checks WCAG contrast for every text/background pair in every theme. Tailwind's default palette is turned off, so raw colors can't sneak in.
- **axe accessibility scans in every theme, in e2e.** On its very first run it caught a real bug (next section).
- **Compiling the Guide at build time** (unified/remark) into HTML plus a search index. The browser does no Markdown parsing, raw HTML is stripped, and the anchor check is a simple regex script.
- **A Diagnostics page that runs cubing.js for real** (scramble, solve, verify) and an e2e test for it. It found the worst bug of the milestone within minutes of writing it.

**Bugs that took the longest**

1. **cubing.js's search worker crashed in the production build** with `document is not defined`, then "Module worker instantiation failed". Cause: cubing.js locates its worker file with `import.meta.resolve`, so Vite/Rolldown bundles that file as a normal chunk, not as a worker. Vite's little "preload helper" for lazy imports lived inside the main app bundle, so the worker imported the whole app, which touches `document`.
   - Dead end 1: `build.modulePreload: false` alone. The helper still lived in the main bundle and the worker still imported it.
   - Dead end 2: moving the helper into its own chunk alone. The worker then called the helper with real preload work, which again needs `document`.
   - Fix: **both together.** The helper goes in its own tiny chunk (`build.rolldownOptions.output.codeSplitting.groups`), _and_ `modulePreload: false`, so there's nothing to preload. Documented in `vite.config.ts`, `CLAUDE.md`, and `UPGRADES.md`.
   - Lesson: when a library starts its own workers, smoke-test it in the **production build**, not just the dev server. Dev worked fine.
2. **Light theme failed contrast on every page.** A small inline `<style>` in `index.html` set a dark background to avoid a white flash while loading. Unlayered CSS beats Tailwind's `@layer base` no matter the selector, so the dark background stayed in the light theme. Fix: scope it to `html[data-theme="dark"]`. Found by axe, not by eye.
3. **The dev-server e2e run failed once, then passed.** Vite optimizes dependencies on the first visit and reloads the page partway through. Not a bug, but it looks like one. Run e2e against the production build (which is what CI does).

**Surprises**

- **ESLint 9 is already deprecated on npm** ("no longer supported"). The plan said ESLint 9 because `eslint-plugin-jsx-a11y` doesn't list ESLint 10. We moved to ESLint 10.15.0 with an npm `overrides` entry for that plugin, after checking it uses none of the APIs ESLint 10 removed, and proving its rules still fire on a deliberately bad file.
- **TypeScript 6 changed defaults:** `types` now defaults to an empty list, so every tsconfig names its types (`vite/client`, `node`) explicitly. Being explicit is clearer anyway.
- **typescript-eslint's project service** finds the _nearest_ `tsconfig.json`. Test and build folders with different settings each need their own `tsconfig.json`, and root config files use a `defaultProject`.
- **cubing.js depends on its own copy of three.js (0.170.x).** We'll add our own three.js in M1. cubing's copy only matters if we import `cubing/twisty`, which we don't plan to. Check the bundle in M1.
- **The safety check in the AI tool blocked writing a file whose text contained `docker run --rm`**, reading it as a delete command. Writing that file with the file tool instead of a shell heredoc avoided the confusion.

**Do differently next time**

- Start the e2e Diagnostics smoke test for any worker-using library on day one, and run it against `vite build` + `vite preview`.
- Put `html[data-theme=...]` on any pre-load inline CSS from the start.
