# Third-party notices

SolvePath is built on open-source software. This file lists the components with license terms worth calling out. The full list of npm packages and their licenses is checked on every CI run (`npm run check:licenses`); each package's own license file ships inside `node_modules/<package>/`.

## Shipped to users (in the web app)

| Component                                                             | Version        | License                                               | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | -------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [cubing.js](https://github.com/cubing/cubing.js)                      | 0.66.1         | MPL-2.0 OR GPL-3.0-or-later (we use it under MPL-2.0) | Used unmodified as a library. Includes vendored code under MIT (min2phase by Chen Shuang) and Apache-2.0. The npm package does not include its license files; the texts are at <https://github.com/cubing/cubing.js/blob/main/LICENSE-MPL.md> and <https://github.com/cubing/cubing.js/blob/main/LICENSE-GPL.md>. |
| [React](https://react.dev/)                                           | 19.3.1         | MIT                                                   |                                                                                                                                                                                                                                                                                                                   |
| [React Router](https://reactrouter.com/)                              | 8.5.1          | MIT                                                   |                                                                                                                                                                                                                                                                                                                   |
| [i18next](https://www.i18next.com/), react-i18next                    | 27.1.3, 18.0.2 | MIT                                                   |                                                                                                                                                                                                                                                                                                                   |
| [MiniSearch](https://github.com/lucaong/minisearch)                   | 7.2.0          | MIT                                                   |                                                                                                                                                                                                                                                                                                                   |
| [Lexend](https://www.lexend.com/) (via Fontsource)                    | 5.3.0          | SIL Open Font License 1.1                             | Self-hosted.                                                                                                                                                                                                                                                                                                      |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (via Fontsource) | 5.3.0          | SIL Open Font License 1.1                             | Self-hosted.                                                                                                                                                                                                                                                                                                      |

## Server and deploy (full mode)

| Component                                           | Version | License                                                  |
| --------------------------------------------------- | ------- | -------------------------------------------------------- |
| [PocketBase](https://pocketbase.io/)                | 0.40.6  | MIT                                                      |
| [Caddy](https://caddyserver.com/)                   | 2.11.9  | Apache-2.0                                               |
| [Alpine Linux](https://alpinelinux.org/) base image | 3.24.4  | Various open-source licenses (MIT for the image tooling) |

## Development only (never shipped)

Vite, Vitest, Playwright, ESLint, Prettier, TypeScript, Tailwind CSS, and the other packages in `devDependencies`. axe-core (used for accessibility tests) is MPL-2.0. ffmpeg and mkcert are optional system tools.

Planned additions (added in later milestones, listed in the plan): three.js and react-three-fiber (MIT), Zustand (MIT), Dexie (Apache-2.0), min2phase.js (MIT, vendored), uPlot (MIT), Motion (MIT), Comlink (Apache-2.0), PocketBase JS SDK (MIT), vite-plugin-pwa and Workbox (MIT).
