import { describe, expect, it } from "vitest";
import { isExpressionAllowed } from "./spdx.ts";

const allowed = new Set(["MIT", "Apache-2.0", "MPL-2.0"]);

describe("isExpressionAllowed", () => {
  it.each([
    ["MIT", true],
    ["GPL-3.0-only", false],
    ["MPL-2.0 OR GPL-3.0-or-later", true],
    ["(MIT or GPL-3.0)", true],
    ["MIT AND GPL-3.0-only", false],
    ["MIT AND Apache-2.0", true],
    ["(GPL-2.0-only OR MIT) AND Apache-2.0", true],
    ["Apache-2.0 WITH LLVM-exception", true],
  ])("%s → %s", (expression, expected) => {
    expect(isExpressionAllowed(expression, allowed)).toBe(expected);
  });

  it("rejects broken expressions", () => {
    expect(() => isExpressionAllowed("(MIT", allowed)).toThrow();
  });
});
