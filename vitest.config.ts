import { defineConfig } from "vitest/config";

// One test run covers every workspace. Each folder below is its own project.
export default defineConfig({
  test: {
    projects: ["config", "packages/*", "apps/web", "tools"],
    passWithNoTests: true,
  },
});
