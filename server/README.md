# Server (full mode)

PocketBase provides accounts, cloud sync, and leaderboards. It is only used in full mode; the app works with no server at all in local-only mode.

- `Dockerfile`: builds a pinned, checksum-verified PocketBase image.
- `pb_migrations/`: database schema.
- `pb_hooks/`: server-side rules.

Run it with the rest of the stack: see `deploy/README.md`.
