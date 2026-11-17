import { expect, test, type Page } from "@playwright/test";

async function openCube(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("cube");
  const cube = page.getByTestId("cube-view");
  await expect(cube.locator("canvas")).toBeVisible();
  return {
    cube,
    errors,
    status: page.getByTestId("cube-status"),
    history: page.getByTestId("cube-history"),
  };
}

test("turns with the keyboard and knows when it's solved", async ({ page }) => {
  const { cube, errors, status, history } = await openCube(page);
  await expect(status).toHaveAttribute("data-solved", "true");
  await cube.focus();
  await page.keyboard.press("j"); // U
  await expect(history).toHaveText("U");
  await expect(status).toHaveAttribute("data-solved", "false");
  await page.keyboard.press("f"); // U'
  await expect(history).toHaveText("U U'");
  await expect(status).toHaveAttribute("data-solved", "true");
  expect(errors).toEqual([]);
});

test("does typed moves, and steps through them one at a time", async ({ page }) => {
  const { errors, status, history } = await openCube(page);
  const input = page.getByLabel("Type some moves");

  await input.fill("(R U R' U')6");
  await page.getByRole("button", { name: "Do them" }).click();
  await expect(page.getByText("24 moves")).toBeVisible();
  await expect(status).toHaveAttribute("data-solved", "true");

  await page.getByRole("button", { name: "Reset" }).click();
  await input.fill("R U");
  await page.getByRole("button", { name: "One at a time" }).click();
  await page.getByRole("button", { name: "Next move: R" }).click();
  await page.getByRole("button", { name: "Next move: U" }).click();
  await expect(page.getByText("All done!")).toBeVisible();
  await expect(history).toHaveText("R U");

  await input.fill("R Q");
  await page.getByRole("button", { name: "Do them" }).click();
  await expect(page.getByText("We couldn't read that.")).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  expect(errors).toEqual([]);
});

test("turns with buttons, undoes, and scrambles", async ({ page }) => {
  const { errors, status, history } = await openCube(page);
  await page.getByRole("button", { name: "Turn R", exact: true }).click();
  await expect(history).toHaveText("R");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(status).toHaveAttribute("data-solved", "true");

  await page.getByRole("button", { name: "Scramble" }).click();
  await expect(page.getByTestId("cube-scramble")).toHaveText(/^([URFDLB]['2]? ?){15,}$/, {
    timeout: 30_000,
  });
  await expect(status).toHaveAttribute("data-solved", "false");
  expect(errors).toEqual([]);
});

test("turns a layer when you swipe it", async ({ page }) => {
  const { cube, errors, history } = await openCube(page);
  const box = (await cube.boundingBox())!;
  // The middle of the view is the top right sticker of the front face. Pushing it up turns R.
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 30, { steps: 5 });
  await page.mouse.move(x, y - 60, { steps: 5 });
  await page.mouse.up();
  await expect(history).toHaveText("R");

  // Swiping beside the cube turns the whole cube.
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 8, box.y + box.height / 2 - 60, { steps: 5 });
  await page.mouse.up();
  await expect(history).toHaveText("R x");
  expect(errors).toEqual([]);
});
