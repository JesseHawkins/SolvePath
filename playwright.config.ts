import { defineConfig, devices } from "@playwright/test";
import { FAKE_CAMERA_FILE } from "./apps/web/e2e/support/fake-camera";

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
  // Makes the fake camera clip (a synthetic scan) for the scan test.
  globalSetup: "./apps/web/e2e/support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:4173${basePath}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /scan\.spec/ },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testIgnore: /scan\.spec/ },
    {
      // Chrome with a fake webcam that plays a synthetic scan of a known cube.
      name: "camera",
      testMatch: /scan\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera"],
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            `--use-file-for-fake-video-capture=${FAKE_CAMERA_FILE}`,
          ],
        },
      },
    },
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
