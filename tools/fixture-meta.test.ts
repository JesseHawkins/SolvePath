import { describe, expect, it } from "vitest";
import { checkMeta } from "./fixture-meta.ts";

const good = {
  scramble: "R U R' F2",
  cube: "gan-356-i-carry",
  lighting: "daylight",
  flipped: false,
  marked: false,
};

describe("checkMeta", () => {
  it("accepts good facts", () => {
    expect(checkMeta(good)).toEqual([]);
  });
  it("names each problem", () => {
    expect(checkMeta({ ...good, scramble: "R x Q", cube: "mine", flipped: "no" })).toEqual([
      "scramble has moves we don't expect: x Q",
      "cube must be one of: gan-356-i-carry, duncan, other",
      "flipped must be true or false.",
    ]);
  });
});
