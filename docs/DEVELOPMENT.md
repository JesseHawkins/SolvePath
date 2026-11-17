# Development

## First-time setup

1. Install Node.js 24 (the exact version is in `.nvmrc`).
2. `npm ci` installs the exact versions from `package-lock.json`.
3. `npx playwright install chromium` once, for the browser tests.

## Everyday commands

See the table in `CLAUDE.md`, or run `make` for the list.

## Testing on a phone or tablet (HTTPS on your Wi-Fi)

Browsers only allow the camera on secure (HTTPS) pages, except on `localhost`. To try SolvePath on a phone, the dev server has to use HTTPS.

`make dev` does this. It starts the dev server on every network address of your computer, using HTTPS.

### Option A: trusted certificates with mkcert (recommended)

With mkcert, your browsers trust the dev certificate, so there are no warnings.

1. Install mkcert: `sudo dnf install mkcert` (Fedora), `brew install mkcert` (macOS), or see <https://github.com/FiloSottile/mkcert>.
2. Run `mkcert -install` once. This trusts mkcert's local certificate authority on this computer.
3. Run `make dev`. It makes certificates in `.certs/` for `localhost`, your computer's name, and its LAN addresses.
4. On the phone, open `https://<your-computer's-LAN-address>:5173`.

To make the **phone** trust the certificate too, install mkcert's root certificate on it. Find the file with `mkcert -CAROOT` (it's `rootCA.pem`):

- **iPhone or iPad:** send `rootCA.pem` to the device (AirDrop or email), open it, then go to Settings > General > VPN & Device Management and install the profile. Then go to Settings > General > About > Certificate Trust Settings and turn on full trust for it.
- **Android:** copy the file to the phone, then Settings > Security > Encryption & credentials > Install a certificate > CA certificate. (Menu names vary by phone.)

Keep `rootCA.pem` private. Anyone with it, and mkcert's matching key, could create certificates your devices trust. Remove it from your phone when you're done testing.

### Option B: self-signed certificate (no setup)

If mkcert isn't installed, `make dev` uses a self-signed certificate. Your browser shows a warning; choose to continue. This works for quick tests, but some browsers are stricter with camera access on pages with warnings.

## Hosting under a folder

The app normally lives at the root of a site (`https://example.com/`). To build it for a folder like `https://example.com/cube/`, set `BASE_PATH`:

```sh
BASE_PATH=/cube/ npm run build
```

CI runs the browser tests both ways.

## Fixture videos (from M2)

The vision fixture recorder and the conversion script arrive in M2. Playwright's fake camera needs `.y4m` files, which `ffmpeg` makes from the committed WebM clips.
