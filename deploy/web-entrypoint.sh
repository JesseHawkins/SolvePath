#!/bin/sh
# Starts Caddy for SolvePath.
#
# The admin page password comes from ADMIN_HOME_PASSWORD (plain text in
# deploy/.env). Caddy needs a bcrypt hash, so we make one here at startup.
# That way nobody has to create a hash by hand or fight with the $ signs in it.
set -eu

if [ -z "${ADMIN_HOME_PASSWORD:-}" ]; then
  echo "ADMIN_HOME_PASSWORD is empty. Set it in deploy/.env (see .env.example)." >&2
  exit 1
fi

ADMIN_HOME_PASSWORD_HASH="$(caddy hash-password --plaintext "$ADMIN_HOME_PASSWORD")"
export ADMIN_HOME_PASSWORD_HASH
unset ADMIN_HOME_PASSWORD

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
