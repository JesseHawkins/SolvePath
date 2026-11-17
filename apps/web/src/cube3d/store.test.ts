import { describe, expect, it } from "vitest";
import { isIdentity, parseAlg } from "@solvepath/cube-core";
import { createCubeStore } from "./store";

describe("cube store", () => {
  it("updates the state at once and queues the turns for the 3D view", () => {
    const store = createCubeStore();
    store.getState().doMoves(parseAlg("R U"));
    expect(store.getState().solved).toBe(false);
    expect(store.getState().queue).toHaveLength(2);
    expect(store.getState().takeNext()).toEqual({
      kind: "move",
      move: { family: "R", amount: 1 },
    });
    expect(store.getState().queue).toHaveLength(1);
  });

  it("is solved after a sequence and its undo", () => {
    const store = createCubeStore();
    store.getState().doMoves(parseAlg("R U F'"));
    for (let i = 0; i < 3; i++) store.getState().undo();
    expect(isIdentity(store.getState().state)).toBe(true);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().solved).toBe(true);
  });

  it("counts a rotated solved cube as solved", () => {
    const store = createCubeStore();
    store.getState().doMoves(parseAlg("x y"));
    expect(store.getState().solved).toBe(true);
  });

  it("resets without animating", () => {
    const store = createCubeStore();
    store.getState().doMoves(parseAlg("R"));
    store.getState().reset();
    expect(store.getState().queue.at(-1)?.kind).toBe("set");
    expect(store.getState().history).toEqual([]);
  });
});
