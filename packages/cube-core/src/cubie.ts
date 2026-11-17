/**
 * The cubie view of a cube: which piece is in each spot, and how it's turned.
 *
 * This is the same information as a sticker state (state.ts), arranged the
 * way solvers think about the cube. Conversion both ways is lossless
 * (tested). Naming and orientation rules follow Kociemba, so M3's two-phase
 * solver can use these directly:
 *
 *   Corner spots: URF UFL ULB UBR DFR DLF DBL DRB
 *   Edge spots:   UR UF UL UB DR DF DL DB FR FL BL BR
 *
 * A corner's twist (0, 1, 2) says where its U or D sticker is: 0 means on
 * the U or D face. An edge's flip (0, 1) says whether its first sticker
 * (the U/D one, or F/B for middle-layer edges) is in its spot's first place.
 * Each name lists its faces in clockwise order, starting from U or D.
 */
import { FACE_NORMAL, FACES, type Face, type Vec3 } from "./faces";
import { CENTER_STICKERS, stickerIndexAt } from "./geometry";
import { STICKER_COUNT, type CubeState } from "./state";

export const CORNER_NAMES = ["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"] as const;
export const EDGE_NAMES = [
  "UR",
  "UF",
  "UL",
  "UB",
  "DR",
  "DF",
  "DL",
  "DB",
  "FR",
  "FL",
  "BL",
  "BR",
] as const;

function facesOf(name: string): Face[] {
  return [...name] as Face[];
}

function cubieOf(faces: readonly Face[]): Vec3 {
  const v: [number, number, number] = [0, 0, 0];
  for (const f of faces) {
    const n = FACE_NORMAL[f];
    v[0] += n[0];
    v[1] += n[1];
    v[2] += n[2];
  }
  return v;
}

function stickersFor(name: string): number[] {
  const faces = facesOf(name);
  const cubie = cubieOf(faces);
  return faces.map((f) => stickerIndexAt(cubie, FACE_NORMAL[f]));
}

/** CORNER_STICKERS[i][j]: sticker position of the j-th face of corner spot i. */
export const CORNER_STICKERS: readonly (readonly number[])[] = CORNER_NAMES.map(stickersFor);
/** EDGE_STICKERS[i][j]: sticker position of the j-th face of edge spot i. */
export const EDGE_STICKERS: readonly (readonly number[])[] = EDGE_NAMES.map(stickersFor);

const CENTER_POSITIONS = FACES.map((f) => CENTER_STICKERS[f]);

export interface CubieState {
  /** Corner piece in each corner spot (piece number = its home spot). */
  cp: number[];
  /** Twist of the corner in each spot: 0, 1, or 2. */
  co: number[];
  /** Edge piece in each edge spot. */
  ep: number[];
  /** Flip of the edge in each spot: 0 or 1. */
  eo: number[];
  /** Center piece (as a face index, U=0 ... B=5) in each center spot. */
  centers: number[];
}

/** For each sticker number: which piece it belongs to, and which of that piece's stickers it is. */
interface Owner {
  piece: number;
  slot: number;
}
const CORNER_OWNER = new Map<number, Owner>();
CORNER_STICKERS.forEach((ids, piece) =>
  ids.forEach((id, slot) => CORNER_OWNER.set(id, { piece, slot })),
);
const EDGE_OWNER = new Map<number, Owner>();
EDGE_STICKERS.forEach((ids, piece) =>
  ids.forEach((id, slot) => EDGE_OWNER.set(id, { piece, slot })),
);

export function solvedCubie(): CubieState {
  return {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    centers: [0, 1, 2, 3, 4, 5],
  };
}

export function cubieFromStickers(state: CubeState): CubieState {
  const cp: number[] = [];
  const co: number[] = [];
  CORNER_STICKERS.forEach((spot) => {
    const owner = CORNER_OWNER.get(state[spot[0]!]!);
    if (!owner) throw new Error("A corner spot holds a sticker that isn't from a corner.");
    cp.push(owner.piece);
    // Spot place m holds piece sticker (slot + m); the piece's U/D sticker is where that is 0.
    co.push((3 - owner.slot) % 3);
  });
  const ep: number[] = [];
  const eo: number[] = [];
  EDGE_STICKERS.forEach((spot) => {
    const owner = EDGE_OWNER.get(state[spot[0]!]!);
    if (!owner) throw new Error("An edge spot holds a sticker that isn't from an edge.");
    ep.push(owner.piece);
    eo.push(owner.slot);
  });
  const centers = CENTER_POSITIONS.map((pos) => Math.floor(state[pos]! / 9));
  return { cp, co, ep, eo, centers };
}

export function stickersFromCubie(c: CubieState): CubeState {
  const s = new Uint8Array(STICKER_COUNT);
  CORNER_STICKERS.forEach((spot, i) => {
    const piece = CORNER_STICKERS[c.cp[i]!]!;
    const twist = c.co[i]!;
    spot.forEach((pos, m) => (s[pos] = piece[(m - twist + 3) % 3]!));
  });
  EDGE_STICKERS.forEach((spot, i) => {
    const piece = EDGE_STICKERS[c.ep[i]!]!;
    const flip = c.eo[i]!;
    spot.forEach((pos, m) => (s[pos] = piece[(m + flip) % 2]!));
  });
  CENTER_POSITIONS.forEach((pos, i) => {
    s[pos] = CENTER_POSITIONS[c.centers[i]!]!;
  });
  return s;
}

/** Number of swaps needed to sort a permutation, mod 2 (0 = even, 1 = odd). */
export function permutationParity(perm: readonly number[]): 0 | 1 {
  const seen = new Array<boolean>(perm.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let length = 0;
    for (let j = i; !seen[j]; j = perm[j]!) {
      seen[j] = true;
      length++;
    }
    swaps += length - 1;
  }
  return (swaps % 2) as 0 | 1;
}

/** Corner sticker faces for a spot, e.g. ["U","R","F"]. */
export function cornerFaces(spot: number): Face[] {
  return facesOf(CORNER_NAMES[spot]!);
}
export function edgeFaces(spot: number): Face[] {
  return facesOf(EDGE_NAMES[spot]!);
}
