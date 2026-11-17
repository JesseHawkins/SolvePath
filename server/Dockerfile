# syntax=docker/dockerfile:1
# PocketBase has no official Docker image, so we build a small one.
# The download is checked against the SHA-256 published in the release's
# checksums.txt, and the base image is pinned by digest.
# To upgrade: read docs/UPGRADES.md first (PocketBase is pre-1.0).

FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS download
ARG TARGETARCH=amd64
ARG PB_VERSION=0.40.6
ARG PB_SHA256_amd64=0e1f609158ed945f809f8a02ae012aa0427129c66ebb63c1aee76f2c0309373f
ARG PB_SHA256_arm64=d22c66ceb67ca92b7d767f36d826e848a276bcfa3c197ead20bf87c42208984f
WORKDIR /tmp/pb
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) sum="$PB_SHA256_amd64" ;; \
      arm64) sum="$PB_SHA256_arm64" ;; \
      *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    wget -q -O pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip"; \
    echo "$sum  pb.zip" | sha256sum -c -; \
    unzip -q pb.zip pocketbase

FROM alpine:3.24.4@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
ARG PB_VERSION=0.40.6
LABEL org.opencontainers.image.title="SolvePath PocketBase" \
      org.opencontainers.image.version="${PB_VERSION}" \
      org.opencontainers.image.licenses="MIT"
RUN addgroup -S pocketbase && adduser -S -G pocketbase pocketbase \
    && mkdir -p /pb_data && chown pocketbase:pocketbase /pb_data
COPY --from=download /tmp/pb/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
USER pocketbase
EXPOSE 8090
VOLUME /pb_data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health >/dev/null || exit 1
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
