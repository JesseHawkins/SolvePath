import { beforeEach, describe, expect, it } from "vitest";
import { useCubeSettings } from "./cubeSettings";

describe("cube settings", () => {
  beforeEach(() => {
    localStorage.clear();
    useCubeSettings.setState({ arrowStyle: "section" });
  });

  it("starts with section arrows", () => {
    expect(useCubeSettings.getState().arrowStyle).toBe("section");
  });

  it("saves the arrow style on this device", () => {
    useCubeSettings.getState().setArrowStyle("face");
    const saved = JSON.parse(localStorage.getItem("solvepath.cube")!) as { state: unknown };
    expect(saved.state).toEqual({
      arrowStyle: "face",
    });
  });

  it("ignores a saved style it doesn't know", async () => {
    localStorage.setItem(
      "solvepath.cube",
      JSON.stringify({ state: { arrowStyle: "sparkles" }, version: 1 }),
    );
    await useCubeSettings.persist.rehydrate();
    expect(useCubeSettings.getState().arrowStyle).toBe("section");
  });

  it("loads a saved style", async () => {
    localStorage.setItem(
      "solvepath.cube",
      JSON.stringify({ state: { arrowStyle: "face" }, version: 1 }),
    );
    await useCubeSettings.persist.rehydrate();
    expect(useCubeSettings.getState().arrowStyle).toBe("face");
  });
});
