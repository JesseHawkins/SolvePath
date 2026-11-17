import { describe, expect, it } from "vitest";
import { formatMove, type Vec3 } from "@solvepath/cube-core";
import { moveForSwipe, type Project } from "./swipe";

/** A simple camera looking straight at F (no perspective): screen x = world x, screen y = -world y. */
const front: Project = (p: Vec3) => ({ x: p[0] * 100, y: -p[1] * 100 });
/** Looking straight down at U, with F at the bottom of the screen. */
const top: Project = (p: Vec3) => ({ x: p[0] * 100, y: p[2] * 100 });

const UP = { x: 0, y: -40 };
const DOWN = { x: 0, y: 40 };
const LEFT = { x: -40, y: 0 };
const RIGHT = { x: 40, y: 0 };

// Sticker numbers from the facelet layout (cube-core geometry.ts).
const F_TOP_RIGHT = 20;
const F_TOP_LEFT = 18;
const F_CENTER = 22;
const F_BOTTOM_LEFT = 24;
const U_FRONT_LEFT = 6;

const swipe = (sticker: number, drag: { x: number; y: number }, project = front) =>
  formatMove(moveForSwipe(sticker, drag, project));

describe("moveForSwipe", () => {
  it("turns R when you push the right column of F up", () => {
    expect(swipe(F_TOP_RIGHT, UP)).toBe("R");
    expect(swipe(F_TOP_RIGHT, DOWN)).toBe("R'");
  });

  it("turns L when you pull the left column of F down", () => {
    expect(swipe(F_TOP_LEFT, DOWN)).toBe("L");
  });

  it("turns U when you push the top row of F left", () => {
    expect(swipe(F_TOP_LEFT, LEFT)).toBe("U");
    expect(swipe(F_TOP_RIGHT, RIGHT)).toBe("U'");
  });

  it("turns D when you push the bottom row of F right", () => {
    expect(swipe(F_BOTTOM_LEFT, RIGHT)).toBe("D");
  });

  it("turns middle slices from the center", () => {
    expect(swipe(F_CENTER, DOWN)).toBe("M");
    expect(swipe(F_CENTER, RIGHT)).toBe("E");
  });

  it("turns F when you push the front row of U right", () => {
    expect(swipe(U_FRONT_LEFT, RIGHT, top)).toBe("F");
  });
});
