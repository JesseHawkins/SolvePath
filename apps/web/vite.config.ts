/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { APP_NAME, APP_TAGLINE } from "@solvepath/config";
import { guidePlugin } from "./build/guide-plugin.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");

/**
 * Local HTTPS (needed so phones on your Wi-Fi can use the camera).
 * `make dev` sets SOLVEPATH_HTTPS=1. If mkcert made trusted certificates in
 * .certs/, we use them. Otherwise we fall back to a self-signed certificate
 * (your browser will show a warning you have to click through).
 */
const wantHttps = process.env.SOLVEPATH_HTTPS === "1";
const certFile = path.join(repoRoot, ".certs/cert.pem");
const keyFile = path.join(repoRoot, ".certs/key.pem");
const haveMkcert = fs.existsSync(certFile) && fs.existsSync(keyFile);

/** The path the app is served under: "/" normally, "/cube/" if hosted in a folder. */
function basePath(): string {
  const raw = process.env.BASE_PATH ?? "/";
  return `/${raw.replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");
}

export default defineConfig({
  base: basePath(),
  plugins: [
    react(),
    tailwindcss(),
    guidePlugin({ dir: path.join(repoRoot, "docs/guide") }),
    {
      // Fills the app name into index.html from config/brand.ts.
      name: "solvepath-brand-html",
      transformIndexHtml: (html) =>
        html.replaceAll("__APP_NAME__", APP_NAME).replaceAll("__APP_TAGLINE__", APP_TAGLINE),
    },
    ...(wantHttps && !haveMkcert ? [basicSsl()] : []),
  ],
  server: {
    host: wantHttps ? true : "localhost",
    port: 5173,
    ...(wantHttps && haveMkcert
      ? { https: { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) } }
      : {}),
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  // cubing.js starts its own module workers; ES-format workers keep that working.
  worker: { format: "es" },
  optimizeDeps: { exclude: ["cubing"] },
  build: {
    target: ["safari18", "chrome120", "edge120", "firefox128"],
    sourcemap: true,
    // Don't add <link rel="modulepreload"> for lazy chunks: the helper that does
    // it needs `document`, which cubing.js's search worker doesn't have.
    modulePreload: false,
    // three.js plus react-three-fiber is about 930 kB before gzip (about 250 kB
    // gzipped), because react-three-fiber pulls in all of three.js. It only
    // loads on the cube pages, so we allow it here.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // cubing.js starts its own module worker. Vite doesn't know that
              // file is a worker, and by default it put its small "preload"
              // helper inside the main app bundle, so the worker imported the
              // whole app (which touches `document` and crashes). Keeping the
              // helper in its own tiny chunk keeps workers clean.
              // Covered by the Diagnostics e2e test.
              name: "vite-preload-helper",
              test: /preload-helper/,
            },
            {
              // three.js changes less often than our code, so keeping it in its own
              // file lets browsers keep it cached across app updates.
              name: "three",
              test: /node_modules[\\/](three|@react-three)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "build/**/*.test.ts"],
  },
});
