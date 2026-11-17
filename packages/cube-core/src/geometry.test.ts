import { describe, expect, it } from "vitest";
import { FACES } from "./faces";
import { CENTER_STICKERS, rotateQuarter, STICKERS, stickerIndexAt } from "./geometry";

describe("geometry", () => {
  it("has 54 stickers, each at its own place", () => {
    expect(STICKERS).toHaveLength(54);
    const keys = new Set(STICKERS.map((s) => `${s.cubie.join()}|${s.normal.join()}`));
    expect(keys.size).toBe(54);
    STICKERS.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("puts every sticker on the outside of its face", () => {
    for (const s of STICKERS) {
      const axis = s.normal.findIndex((n) => n !== 0);
      expect(s.cubie[axis]).toBe(s.normal[axis]);
    }
  });

  it("puts each center in the middle of its face", () => {
    for (const face of FACES) {
      const s = STICKERS[CENTER_STICKERS[face]]!;
      expect(s.face).toBe(face);
      expect(s.cubie).toEqual(s.normal);
    }
  });

  it("follows the Kociemba layout at the corners of the net", () => {
    // U1 (index 0) touches L and B; U9 (8) touches R and F; D1 (27) touches L and F.
    expect(STICKERS[0]!.cubie).toEqual([-1, 1, -1]);
    expect(STICKERS[8]!.cubie).toEqual([1, 1, 1]);
    expect(STICKERS[27]!.cubie).toEqual([-1, -1, 1]);
    // R1 (9) shares a corner with U9 and F3. B1 (45) shares a corner with U3 and R3.
    expect(STICKERS[9]!.cubie).toEqual([1, 1, 1]);
    expect(STICKERS[45]!.cubie).toEqual([1, 1, -1]);
    expect(stickerIndexAt([1, 1, -1], [0, 1, 0])).toBe(2);
  });

  it("turns any vector back to itself after four quarter turns", () => {
    for (const axis of [0, 1, 2] as const) {
      for (const s of STICKERS) {
        expect(rotateQuarter(s.cubie, axis, 4)).toEqual(s.cubie);
        expect(rotateQuarter(rotateQuarter(s.cubie, axis, 1), axis, -1)).toEqual(s.cubie);
      }
    }
  });

  it("turns counterclockwise by the right-hand rule", () => {
    expect(rotateQuarter([0, 1, 0], 0, 1)).toEqual([0, 0, 1]); // about x: y goes to z
    expect(rotateQuarter([0, 0, 1], 1, 1)).toEqual([1, 0, 0]); // about y: z goes to x
    expect(rotateQuarter([1, 0, 0], 2, 1)).toEqual([0, 1, 0]); // about z: x goes to y
  });
});
