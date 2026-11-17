import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: paths have no leading slash, so they work when the app lives in a folder like /cube/.

test("home page shows the app name and works with the keyboard", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to SolvePath");
  await expect(page).toHaveTitle("SolvePath");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("theme choice applies and is remembered", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("combobox", { name: "Theme" }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("unknown pages show a friendly not-found message", async ({ page }) => {
  await page.goto("no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

const PAGES = [
  "./",
  "guide",
  "guide/settings",
  "guide/virtual-cube",
  "guide/scan-lab",
  "cube",
  "scan",
  "diagnostics",
];
const THEMES = ["dark", "light", "high-contrast"];

for (const theme of THEMES) {
  test(`no automatic accessibility problems in the ${theme} theme`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "One browser is enough for axe scans.");
    await page.addInitScript((t) => localStorage.setItem("solvepath.theme", t), theme);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, `${path} in ${theme}`).toEqual([]);
    }
  });
}
