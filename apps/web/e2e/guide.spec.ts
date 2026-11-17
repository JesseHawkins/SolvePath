import { expect, test } from "@playwright/test";

test("searching the Guide finds a section and opens it", async ({ page }) => {
  await page.goto("guide");
  await page.getByRole("searchbox", { name: "Search the Guide" }).fill("camera");
  const results = page.getByTestId("guide-results");
  await results.getByRole("link", { name: /The camera/ }).click();
  await expect(page).toHaveURL(/guide\/privacy#privacy\.camera$/);
  await expect(page.locator("#privacy\\.camera")).toBeFocused();
});

test("a setting's label opens its Guide entry", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Theme (Opens the Guide)" }).click();
  await expect(page).toHaveURL(/guide\/settings#settings\.appearance\.theme$/);
  await expect(page.getByRole("heading", { name: "Theme", level: 2 })).toBeFocused();
});

test("deep links to a Guide entry work on a fresh load", async ({ page }) => {
  await page.goto("guide/privacy#privacy.data");
  await expect(page.getByRole("heading", { name: "Your data", exact: true })).toBeFocused();
});
