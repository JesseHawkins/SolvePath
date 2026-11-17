import { expect, test, type Page } from "@playwright/test";

async function openCube(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("cube");
  const cube = page.getByTestId("cube-view");
  await expect(cube.locator("canvas")).toBeVisible();
  // The canvas shows up before the 3D scene is ready for swipes.
  await expect(cube).toHaveAttribute("data-ready", "true");
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

  // Every whole-cube rotation has both directions, and two-layer moves have buttons.
  const rotations = page.getByRole("group", { name: "Turn the whole cube" });
  for (const move of ["x", "x'", "y", "y'", "z", "z'"]) {
    await rotations.getByRole("button", { name: `Turn ${move}`, exact: true }).click();
  }
  await expect(history).toHaveText("x x' y y' z z'");
  await expect(status).toHaveAttribute("data-solved", "true");
  await page
    .getByRole("group", { name: "Turn two layers" })
    .getByRole("button", { name: "Turn r", exact: true })
    .click();
  await expect(history).toHaveText("x x' y y' z z' r");
  await page.getByRole("button", { name: "Reset" }).click();

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

test("turns the whole cube with a right-drag or a Shift-drag", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mouse buttons and Shift are for desktops.");
  const { cube, errors, history } = await openCube(page);
  const box = (await cube.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // Starting on a sticker, a right-drag up turns the whole cube (x), not a layer.
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(x, y - 60, { steps: 5 });
  await page.mouse.up({ button: "right" });
  await expect(history).toHaveText("x");

  await page.keyboard.down("Shift");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 60, y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(history).toHaveText("x y");
  expect(errors).toEqual([]);
});

test("remembers the arrow style", async ({ page }) => {
  const { errors } = await openCube(page);
  const section = page.getByRole("radio", { name: "Section arrows" });
  const face = page.getByRole("radio", { name: "Face arrows" });
  await expect(section).toBeChecked();
  await face.check();
  await page.reload();
  await expect(page.getByTestId("cube-view")).toHaveAttribute("data-ready", "true");
  await expect(face).toBeChecked();
  expect(errors).toEqual([]);
});

test("Inspect spins the view without turning the cube", async ({ page }) => {
  const { cube, errors, history, status } = await openCube(page);
  const inspect = page.getByRole("button", { name: "Inspect" });
  await expect(inspect).toHaveAttribute("aria-pressed", "false");
  await inspect.click();
  await expect(inspect).toHaveAttribute("aria-pressed", "true");
  await expect(cube).toHaveAttribute("data-view-home", "false");

  // Dragging spins the view: no moves are made.
  const box = (await cube.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(history).toHaveText("No moves yet.");
  await expect(status).toHaveAttribute("data-solved", "true");

  // Moves from buttons still work while inspecting.
  await page.getByRole("button", { name: "Turn R", exact: true }).click();
  await expect(history).toHaveText("R");

  // Leaving Inspect glides the view home, and then swipes turn layers again.
  await inspect.click();
  await expect(inspect).toHaveAttribute("aria-pressed", "false");
  await expect(cube).toHaveAttribute("data-view-home", "true");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 30, { steps: 5 });
  await page.mouse.move(x, y - 60, { steps: 5 });
  await page.mouse.up();
  await expect(history).toHaveText("R R");
  expect(errors).toEqual([]);
});

test("quick buttons on the cube turn the whole cube", async ({ page }) => {
  const { errors, history, status } = await openCube(page);
  const quick = page.getByRole("group", { name: "Quick whole-cube turns" });
  for (const move of ["x", "x'", "y", "y'", "z", "z'"]) {
    await quick.getByRole("button", { name: `Turn ${move}`, exact: true }).click();
  }
  await expect(history).toHaveText("x x' y y' z z'");
  await expect(status).toHaveAttribute("data-solved", "true");
  // They step aside while inspecting.
  await page.getByRole("button", { name: "Inspect" }).click();
  await expect(quick).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("two fingers turn the whole cube: drag for x and y, twist for z", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Needs a touch screen.");
  const { cube, errors, history } = await openCube(page);
  const box = (await cube.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  type P = { x: number; y: number };
  const touch = async (type: "touchStart" | "touchMove" | "touchEnd", points: P[]) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })),
    });
  const gesture = async (from: [P, P], to: (t: number) => [P, P]) => {
    await touch("touchStart", from);
    for (let i = 1; i <= 8; i++) await touch("touchMove", to(i / 8));
    await touch("touchEnd", []);
  };

  // Both fingers move up together: x.
  await gesture(
    [
      { x: cx - 50, y: cy },
      { x: cx + 50, y: cy },
    ],
    (t) => [
      { x: cx - 50, y: cy - 60 * t },
      { x: cx + 50, y: cy - 60 * t },
    ],
  );
  await expect(history).toHaveText("x");

  // Twist clockwise on screen: z.
  const at = (deg: number): [P, P] => {
    const r = (deg * Math.PI) / 180;
    return [
      { x: cx - 60 * Math.cos(r), y: cy - 60 * Math.sin(r) },
      { x: cx + 60 * Math.cos(r), y: cy + 60 * Math.sin(r) },
    ];
  };
  await gesture(at(0), (t) => at(40 * t));
  await expect(history).toHaveText("x z");
  expect(errors).toEqual([]);
});
