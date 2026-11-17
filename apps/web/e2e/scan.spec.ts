import { expect, test } from "@playwright/test";
import { applyMoves, faceletString, parseAlg, solvedState } from "@solvepath/cube-core";
import { FAKE_CAMERA_SCRAMBLE } from "./support/fake-camera";

test("scans a cube from the camera, in a worker, and gets it right", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("scan");
  await page.getByRole("button", { name: "Turn on the camera" }).click();
  // The fake camera's picture is not flipped.
  await page.getByLabel("Normal").check();
  await page.getByRole("button", { name: "Start scan" }).click();

  const result = page.getByTestId("scan-result");
  await expect(result).toBeVisible({ timeout: 60_000 });
  await expect(result).toHaveAttribute("data-ok", "true");
  await expect(page.getByTestId("scan-progress").getByRole("img")).toHaveCount(6);
  expect(await page.getByTestId("scan-view").getAttribute("data-step")).toBe("done");
  // The clip starts with the cube held the standard way, so the scan is exactly the scramble.
  const want = faceletString(applyMoves(solvedState(), parseAlg(FAKE_CAMERA_SCRAMBLE)));
  await expect(result).toHaveAttribute("data-facelets", want);
  expect(errors).toEqual([]);
});
