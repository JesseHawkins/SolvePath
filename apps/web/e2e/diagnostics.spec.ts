import { expect, test } from "@playwright/test";

// Smoke test for cubing.js inside our production build: its scramble
// worker and 3x3 solver must both work after Vite bundles them.
test("cubing.js scrambles and solves a cube in the browser", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("diagnostics");
  await page.getByRole("button", { name: "Run check" }).click();
  const status = page.getByTestId("diag-status");
  await expect(status).toHaveAttribute("data-status", /pass|fail/, { timeout: 60_000 });
  await expect(status).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("diag-scramble")).toHaveText(/^([URFDLB]['2]? ?){15,}$/);
  expect(errors).toEqual([]);
});
