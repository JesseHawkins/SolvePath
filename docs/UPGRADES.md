# Upgrades

Every dependency is pinned to an exact version (npm lockfile, Docker tags plus digests, GitHub Actions by commit SHA). Nothing changes until someone changes it on purpose. This page says when and how.

## Calendar

| When                           | What                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monthly (first week)           | Review npm updates: `npm outdated`. Apply patch and minor updates in one branch, run `npm run ci` and `npm run test:e2e`, check `npm run check:licenses`. Check security advisories: `npm audit --omit=dev`. |
| Monthly                        | Check new PocketBase, Caddy, Alpine, and Node releases (see below).                                                                                                                                          |
| Quarterly (Jan, Apr, Jul, Oct) | Review major versions (React, Vite, TypeScript, three.js, Tailwind, ESLint, Playwright). Read each changelog, try the upgrade on a branch, record the result in `docs/LESSONS.md`.                           |
| Any time                       | Security fixes for anything we ship: apply as soon as the tests pass.                                                                                                                                        |

## How to upgrade

### npm packages

1. `npm install <name>@<exact-version>` (`.npmrc` has `save-exact=true`).
2. `npm run ci && npm run test:e2e`.
3. If the package is shipped to users, update `THIRD_PARTY_NOTICES.md` and the version table in `docs/PLAN.md`.

Watch-list:

- **TypeScript:** pinned to 6.0.x because typescript-eslint supports `<6.1`. Move to TS 7 when typescript-eslint supports it.
- **eslint-plugin-jsx-a11y:** doesn't list ESLint 10 as supported yet; we use an npm `overrides` entry. Remove the override when it does. Its rules were tested working on ESLint 10.
- **cubing.js:** after any upgrade, run the Diagnostics e2e test (it guards the worker bundling fix in `apps/web/vite.config.ts`).
- **three.js:** cubing.js asks for an older three.js, so the root `package.json` has an `overrides` entry for `three` and `@types/three`. Upgrade three by changing the version in `apps/web/package.json` **and** in `overrides`, then run `npm ls three` and make sure only one version shows.
- **@react-three/fiber:** its peer range caps React (`<19.4` at last check). Check it before upgrading React.

### PocketBase (pre-1.0: breaking changes happen)

1. Read every release note between our version and the target at <https://github.com/pocketbase/pocketbase/releases>. Look for lines marked as breaking, and for changes to JS hooks, migrations, auth, and the API.
2. Check the JS SDK (`pocketbase` on npm) for a matching release.
3. Update `PB_VERSION` and both `PB_SHA256_*` values in `server/Dockerfile` from the release's `checksums.txt`.
4. Back up `pb_data` first (see Rollback).
5. Run the stack locally against a copy of real data, then run the tests.

### Docker base images (Caddy, Alpine, Node)

1. Pick the new tag. Get its digest: `skopeo inspect docker://docker.io/library/caddy:<tag>` (the `Digest` field), or `docker buildx imagetools inspect caddy:<tag>`.
2. Replace both tag and digest everywhere they appear (`grep -rn "sha256:" deploy server .github`).

### GitHub Actions

Find the commit SHA for the new tag (`gh api repos/<owner>/<action>/git/ref/tags/<tag>`) and replace it in `.github/workflows/ci.yml`, keeping the tag in the comment.

## Rollback

- **npm:** `git revert` the upgrade commit, then `npm ci`.
- **Containers:** check out the previous commit and run `make up`. Images rebuild from the old pins.
- **PocketBase data:** if the new version ran migrations, the old version may not read the data. Stop the stack, restore the backup taken in step 4 into the `pb_data` volume, then start the old version. (Backup and restore scripts arrive in M11.)
