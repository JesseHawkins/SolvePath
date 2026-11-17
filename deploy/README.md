# Deploying SolvePath

There are two ways to host SolvePath. Both are free.

## 1. Local-only mode (static site, no server)

Everything works without accounts. All data stays in each visitor's browser.

```sh
npm ci
npm run build            # output: apps/web/dist
```

Upload `apps/web/dist` to any static host. The app uses normal web addresses (like `/guide/privacy`), so the host must send `index.html` for addresses it doesn't know:

- **Cloudflare Pages:** connect the repo, build command `npm run build`, output directory `apps/web/dist`. Single-page apps work automatically. Add your domain under Custom domains.
- **GitHub Pages:** publish `apps/web/dist`, and copy `index.html` to `404.html` so deep links work. If the site lives in a folder (like `https://you.github.io/SolvePath/`), build with `BASE_PATH=/SolvePath/`. For a custom domain, add it in the repo's Pages settings and create the DNS record GitHub shows you.

Use HTTPS everywhere: browsers only allow the camera on secure pages.

## 2. Full mode (accounts, sync, leaderboards)

Docker Compose runs two containers:

- **web:** Caddy serving the app, the `/api` proxy to PocketBase, `/healthz`, and a password-protected `/admin-home/` page.
- **pocketbase:** accounts and data, stored in the `pb_data` volume.

### Setup

```sh
cd deploy
cp .env.example .env     # fill it in; every value is explained there
make -C .. up            # or: docker compose up -d --build
```

Then create the first PocketBase admin account:

```sh
docker compose exec pocketbase pocketbase superuser upsert you@example.com 'a-long-password' --dir /pb_data
```

### Behind an existing Caddy (default)

If a Caddy server already handles HTTPS for your other sites, our stack listens on `127.0.0.1:8088` with plain HTTP. Add the site block from `front-proxy.Caddyfile.example` to your existing Caddyfile, point a DNS record at your server, and reload your Caddy.

### Standalone (this server handles HTTPS itself)

Set `SITE_ADDRESS` in `.env` to your domain, point its DNS at the server, open ports 80 and 443, then:

```sh
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d --build
```

### PocketBase admin UI

It is never exposed to the internet (Caddy returns 404 for `/_/`). It's published on the server at `127.0.0.1:8090`. Reach it with an SSH tunnel:

```sh
ssh -L 8090:127.0.0.1:8090 your-server
# then open http://localhost:8090/_/
```

### Health checks

- `GET /healthz` returns `ok` (web app).
- `GET /api/health` is PocketBase's health check.
- Both containers have Docker healthchecks; `docker compose ps` shows their status.

### Backups

Scheduled PocketBase backups with retention and an off-box copy script arrive in M11, with tested restore steps. Until then, back up the `pb_data` volume yourself if you store anything you care about (in M0 it holds nothing).

### Upgrading

Read `docs/UPGRADES.md` first. PocketBase is pre-1.0, so upgrades can include breaking changes.
