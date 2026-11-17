import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the production build (`vite preview`),
 * because that's what users get. Set E2E_BASE_URL to test a running
 * deploy instead (for example the Docker Compose stack).
 * Set BASE_PATH=/cube/ to test hosting inside a folder.
 */
const basePath = `/${(process.env.BASE_PATH ?? "/").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "apps/web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:4173${basePath}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: "npm run build && npm run preview",
          url: `http://127.0.0.1:4173${basePath}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }),
});
