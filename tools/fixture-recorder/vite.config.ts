/**
 * Dev server for the fixture recorder (dev only, never built or deployed).
 *   npm run fixtures:record
 * Uses HTTPS so a phone on your Wi-Fi can use its camera (mkcert certs from
 * `make certs` if present, else a self-signed certificate).
 */
import fs from "node:fs";
import path from "node:path";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const cert = path.join(repoRoot, ".certs/cert.pem");
const key = path.join(repoRoot, ".certs/key.pem");
const mkcert = fs.existsSync(cert) && fs.existsSync(key);

export default defineConfig({
  root: import.meta.dirname,
  plugins: mkcert ? [] : [basicSsl()],
  server: {
    host: true,
    port: 5174,
    ...(mkcert ? { https: { cert: fs.readFileSync(cert), key: fs.readFileSync(key) } } : {}),
  },
  optimizeDeps: { exclude: ["cubing"] },
});
