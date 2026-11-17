import { describe, expect, it } from "vitest";
import { formatMove, type Vec3 } from "@solvepath/cube-core";
import { moveForSwipe, moveForTwoFingers, type Point, type Project } from "./swipe";

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

const swipe = (sticker: number | null, drag: { x: number; y: number }, project = front) =>
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

  it("turns the whole cube when you swipe off it", () => {
    expect(swipe(null, UP)).toBe("x");
    expect(swipe(null, LEFT)).toBe("y");
  });
});

describe("moveForTwoFingers", () => {
  const two = (start: [Point, Point], now: [Point, Point]) => {
    const move = moveForTwoFingers(start, now, front);
    return move ? formatMove(move) : null;
  };
  const turned = (degrees: number): [Point, Point] => {
    const r = (degrees * Math.PI) / 180;
    // Fingers 160 px apart, turning about their middle. Screen y grows downward.
    return [
      { x: 200 - 80 * Math.cos(r), y: 200 - 80 * Math.sin(r) },
      { x: 200 + 80 * Math.cos(r), y: 200 + 80 * Math.sin(r) },
    ];
  };
  const START = turned(0);

  it("turns z when you twist clockwise, and z' the other way", () => {
    expect(two(START, turned(30))).toBe("z");
    expect(two(START, turned(-30))).toBe("z'");
  });

  it("turns x or y when both fingers move together", () => {
    const moved = (dx: number, dy: number): [Point, Point] => [
      { x: START[0].x + dx, y: START[0].y + dy },
      { x: START[1].x + dx, y: START[1].y + dy },
    ];
    expect(two(START, moved(0, -40))).toBe("x");
    expect(two(START, moved(0, 40))).toBe("x'");
    expect(two(START, moved(-40, 0))).toBe("y");
    expect(two(START, moved(40, 0))).toBe("y'");
  });

  it("waits until the fingers have moved far enough", () => {
    expect(two(START, turned(10))).toBeNull();
    expect(
      two(START, [
        { x: START[0].x + 5, y: START[0].y },
        { x: START[1].x + 5, y: START[1].y },
      ]),
    ).toBeNull();
  });

  it("handles twists across the -180/180 line", () => {
    const left: [Point, Point] = [
      { x: 300, y: 200 },
      { x: 100, y: 201 },
    ]; // nearly 180 degrees
    const past: [Point, Point] = [
      { x: 300, y: 200 },
      { x: 100, y: 120 },
    ];
    // The left finger moved up around the right one, like a clock hand going from 9 to 10:
    // clockwise on screen.
    expect(two(left, past)).toBe("z");
    expect(two(past, left)).toBe("z'");
  });
});
