# CLAUDE.md

Working notes for anyone (human or AI) building SolvePath. Keep this file current.

## Current milestone

**M2 (vision spike): built, waiting for the owner.** The owner tests Scan Lab on their phones and records real clips (`npm run fixtures:record`). Then we decide go/no-go on the fallbacks (PLAN.md 5.12) together. Do not start M3 until the owner confirms.

Milestone plan: `docs/PLAN.md` Section 12. **Queued owner requests: `docs/PLAN.md` 12.3. Check it at the start of every build.** Changelogs: `docs/milestones/`. Lessons: `docs/LESSONS.md`.

## Ground rules (from SOLVEPATH_SPEC.md Section 0)

1. One milestone at a time. Each ends with passing tests, a working build, `docs/milestones/MXX.md`, an updated `docs/LESSONS.md`, an updated "Current milestone" above, and one git commit. Then stop for the owner.
2. **Never invent cube algorithms.** Every named algorithm, pattern, and practice position must be machine-verified (PLAN.md Section 7).
3. **Every cube state comes from solved via legal moves.** Never build a state by editing stickers.
4. Free and open source only. No paid services, API keys, ads, analytics, or trackers. Fonts and assets self-hosted. `npm run check:licenses` enforces the license list; ask the owner before adding anything outside it.
5. Ask before collecting any new personal data or changing the auth or privacy model.
6. UI copy and docs: plain, friendly, readable by a 10-year-old. **Never use em dashes.**
7. Never put "Rubik's" in the app name, logo, domain, or branding. The name and domain live only in `config/brand.ts`.
8. Prefer mature, well-documented libraries over custom code (owner preference). Verify version, license, and maintenance before adding; pin exact versions.
9. Don't put family names, emails, or the owner's hostnames in committed files. Deploy hostnames go in `deploy/.env` (git-ignored).

## Commands

| Task                                        | Command                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| Install (exact lockfile versions)           | `npm ci` or `make install`                                  |
| Dev server (localhost)                      | `npm run dev`                                               |
| Dev server over HTTPS for phones on the LAN | `make dev` (uses mkcert certs if present, else self-signed) |
| Unit tests                                  | `npm test` (Vitest, all workspaces)                         |
| Browser tests                               | `npm run test:e2e` (Playwright, builds and previews first)  |
| Browser tests under a folder path           | `BASE_PATH=/cube/ npm run test:e2e`                         |
| Browser tests against a running deploy      | `E2E_BASE_URL=http://127.0.0.1:8088/ npx playwright test`   |
| Lint / format                               | `npm run lint`, `npm run format:check`, `npm run format`    |
| Type check                                  | `npm run typecheck`                                         |
| Guide anchor check                          | `npm run check:guide`                                       |
| License check                               | `npm run check:licenses`                                    |
| Everything CI runs (minus e2e)              | `npm run ci`                                                |
| Build static site                           | `npm run build` → `apps/web/dist`                           |
| Vision accuracy report                      | `npm run vision:report` (writes `docs/vision-accuracy.md`)  |
| Record a real test clip (dev only, HTTPS)   | `npm run fixtures:record`                                   |
| Add a recorded clip                         | `npm run fixtures:add -- <clip> <facts.json>`               |
| Full-mode stack                             | `make up` / `make down` / `make logs` (needs `deploy/.env`) |

## Layout

```
config/brand.ts        App name, tagline, domain, source URL. The only place they live.
apps/web/              React app (Vite). build/ holds Vite plugins (Guide compiler).
apps/web/e2e/          Playwright tests. Paths have no leading slash (base-path safe).
packages/*             Pure TypeScript logic packages. No DOM (lint enforces it).
docs/guide/            User-facing Guide (Markdown). Headings end in {#anchor.id}.
docs/                  PLAN.md, LESSONS.md, UPGRADES.md, DEVELOPMENT.md, milestones/
server/                PocketBase image, migrations, hooks.
deploy/                Compose, Caddyfile, web image, admin page, .env.example.
tools/                 Node scripts (run directly with Node's TypeScript support).
```

## Conventions

- **TypeScript strict** with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. TypeScript 6.0.3 (typescript-eslint doesn't support TS 7 yet).
- **Internal packages have no build step.** Their `package.json` `exports` point at `src/index.ts`; Vite and Vitest compile them.
- **Colors only from theme tokens** (`apps/web/src/theme/tokens.ts`). Tailwind's default palette is turned off, so `bg-red-500` doesn't exist. Use `bg-surface`, `text-muted`, `bg-accent`, and so on. `tokens.test.ts` checks WCAG AA contrast for every theme.
- **All UI text in `apps/web/src/i18n/en.ts`**, used through `useTranslation()`. Keys are type-checked.
- **Every feature and setting has a Guide entry.** Add its id to `apps/web/src/guide/registry.ts`, add a heading ending in `{#that.id}` under `docs/guide/`, and link titles with `<GuideLink anchor="that.id">`. `npm run check:guide` fails on any mismatch or broken link.
- **Cube model rules (`packages/cube-core`):** a state is 54 sticker numbers in Kociemba facelet order. `compose(a, b)` means "do a, then b". Moves are computed from 3D geometry (`geometry.ts`, `moves.ts`), never typed in as tables. The user's frame: x right, y up, z toward the user, so F faces the user and the camera sees B. Camera-to-cube left/right only goes through `cameraGridToBackFace` in `pov.ts`.
- **3D cube:** `apps/web/src/cube3d`. One `CubeView` per store. The store's `state` is the truth; the view plays the store's `queue`. Swipe math is in `swipe.ts` and has unit tests.
- **One three.js:** the root `package.json` `overrides` pins `three` and `@types/three`, because cubing.js asks for an older three. Check `npm ls three` after upgrades.
- **Workers:** anything slow (vision, solvers) runs in a Web Worker. cubing.js manages its own workers.
- **Vision (`packages/vision`):** pure TypeScript, no DOM, runs in `apps/web/src/vision/worker.ts` via Comlink. Images are raw camera pixels (never mirrored). Test with the synthetic camera (`packages/vision/src/synthetic`), never with hand-labeled stickers. Every change to vision should keep `npm run vision:report` at or above `packages/vision/accuracy-baseline.json` (`UPDATE_BASELINE=1` to raise it). The browser scan test uses Chrome's fake webcam playing a synthetic .y4m clip (made by `apps/web/e2e/support/fake-camera.ts`).
- **Vite build settings for cubing.js** (`apps/web/vite.config.ts`): `modulePreload: false` plus a separate `vite-preload-helper` chunk. Without both, cubing.js's search worker imports the main app bundle and crashes on `document`. The Diagnostics e2e test guards this. Don't remove either without rerunning it.
- **Tests:** unit tests next to the code (`*.test.ts`). Property tests with fast-check. Browser tests in `apps/web/e2e/`, including axe accessibility scans in every theme.
- **Formatting:** Prettier, 100 columns, double quotes, trailing commas.
- **Commits:** one per milestone (plus fixes). Author is the owner's GitHub noreply address, set in this repo's local git config.

## Deploy notes

- Testing deploy: the owner's existing Caddy fronts the stack (`deploy/front-proxy.Caddyfile.example`); our Caddy listens on `127.0.0.1:8088` HTTP-only.
- The PocketBase admin UI (`/_/`) is never public. Our Caddy returns 404 for it.
- See `deploy/README.md` and `docs/UPGRADES.md`.
