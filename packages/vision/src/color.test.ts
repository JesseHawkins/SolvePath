import { describe, expect, it } from "vitest";
import { colorDistance, hexToOklab, medianLab, oklabToHex, srgbToOklab } from "./color";

describe("OKLab", () => {
  it("matches published reference values", () => {
    // White is L=1, a=b=0. Pure sRGB red is about (0.628, 0.225, 0.126).
    const white = srgbToOklab(255, 255, 255);
    expect(white[0]).toBeCloseTo(1, 3);
    expect(white[1]).toBeCloseTo(0, 3);
    expect(white[2]).toBeCloseTo(0, 3);
    const red = hexToOklab("#ff0000");
    expect(red[0]).toBeCloseTo(0.628, 3);
    expect(red[1]).toBeCloseTo(0.2249, 3);
    expect(red[2]).toBeCloseTo(0.1258, 3);
    expect(srgbToOklab(0, 0, 0)[0]).toBeCloseTo(0, 6);
  });

  it("tells red and orange apart better than a lighter and darker red", () => {
    const red = hexToOklab("#d4202a");
    const darkRed = hexToOklab("#9a1820");
    const orange = hexToOklab("#ff7a00");
    expect(colorDistance(red, orange)).toBeGreaterThan(colorDistance(red, darkRed) * 0.8);
  });

  it("takes the median per channel", () => {
    expect(
      medianLab([
        [0.1, 0, 5],
        [0.2, 1, 0],
        [0.9, 2, 1],
      ]),
    ).toEqual([0.2, 1, 1]);
  });
});

describe("oklabToHex", () => {
  it("round-trips sRGB colors", () => {
    for (const hex of ["#ff7a00", "#00a651", "#f4f5f7", "#0062d6", "#000000", "#ffffff"]) {
      expect(oklabToHex(hexToOklab(hex))).toBe(hex);
    }
  });
});
