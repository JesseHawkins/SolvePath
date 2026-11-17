# syntax=docker/dockerfile:1
# Builds the static web app, then serves it with Caddy.
# Build context is the repo root (see deploy/docker-compose.yml).

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts
# The Caddyfile serves the app at the root path, so BASE_PATH stays "/" here.
ARG BASE_PATH=/
ARG GIT_COMMIT=unknown
RUN BASE_PATH="$BASE_PATH" npm run build \
    && mkdir -p /app/admin-home-dist \
    && cp deploy/admin-home/* /app/admin-home-dist/ \
    && GIT_COMMIT="$GIT_COMMIT" node tools/version-report.ts /app/admin-home-dist/versions.json

FROM caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --chmod=755 deploy/web-entrypoint.sh /usr/local/bin/web-entrypoint.sh
COPY --from=build /app/apps/web/dist /srv/site
COPY --from=build /app/admin-home-dist /srv/admin-home
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/web-entrypoint.sh"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz >/dev/null || exit 1
