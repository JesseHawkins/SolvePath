import { defineConfig } from "vitest/config";

// The accuracy report runs on its own (npm run vision:report), not with the unit tests.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ["**/*.report.ts"],
  },
});
