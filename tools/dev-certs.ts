/**
 * Makes trusted HTTPS certificates for local development with mkcert,
 * so phones and tablets on your Wi-Fi can open the dev server and use the camera.
 *
 * One-time setup:
 *   1. Install mkcert (Fedora: `sudo dnf install mkcert`, macOS: `brew install mkcert`).
 *   2. Run `mkcert -install` once to trust its certificate authority on this computer.
 *   3. To trust it on a phone, copy the file from `mkcert -CAROOT` (rootCA.pem)
 *      to the phone and install it. See docs/DEVELOPMENT.md for iPhone and Android steps.
 *
 * Without mkcert, `make dev` still works using a self-signed certificate:
 * your browser shows a warning you have to accept.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const certDir = path.resolve(import.meta.dirname, "../.certs");

const probe = spawnSync("mkcert", ["-help"], { stdio: "ignore" });
if (probe.error) {
  console.log("mkcert not found: `make dev` will use a self-signed certificate instead.");
  process.exit(0);
}

const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);
const names = ["localhost", "127.0.0.1", "::1", `${os.hostname()}.local`, ...lanAddresses];

fs.mkdirSync(certDir, { recursive: true });
const result = spawnSync(
  "mkcert",
  [
    "-cert-file",
    path.join(certDir, "cert.pem"),
    "-key-file",
    path.join(certDir, "key.pem"),
    ...names,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Certificates ready for: ${names.join(", ")}`);
