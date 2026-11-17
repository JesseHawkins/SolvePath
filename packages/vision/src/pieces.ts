/**
 * The most likely real cube, piece by piece.
 *
 * Instead of reading each sticker on its own, we ask: which real cube best
 * explains everything we saw? Each corner spot gets one of the 8 corner
 * pieces (turned one of 3 ways), and each edge spot one of the 12 edges
 * (flipped or not). The Hungarian algorithm finds the cheapest way to use
 * every piece once. Then we make the smallest fixes needed for the three
 * rules of a real cube: corner twists add up to a multiple of 3, edge flips
 * to a multiple of 2, and corner and edge swaps match.
 *
 * Because every piece is used once, each color ends up on exactly 9
 * stickers. A sticker we couldn't see (under a finger) costs the same for
 * every color, so the rules fill it in.
 */
import {
  CORNER_NAMES,
  CORNER_STICKERS,
  EDGE_NAMES,
  EDGE_STICKERS,
  FACES,
  permutationParity,
  type CubieState,
  type Face,
} from "@solvepath/cube-core";
import { assign } from "./hungarian";

/** cost[position][face index]: how badly the sticker at a position fits each face's color. */
export type StickerCosts = readonly (readonly number[])[];

interface Option {
  cost: number;
  twist: number;
}

/** Cost of putting `piece` (turned `twist`) in `spot`, for every twist. */
function pieceOptions(
  costs: StickerCosts,
  spots: readonly (readonly number[])[],
  names: readonly string[],
): Option[][][] {
  const faceIndex = (f: string) => FACES.indexOf(f as Face);
  return spots.map((positions) =>
    names.map((name) => {
      const n = positions.length;
      return Array.from({ length: n }, (_, twist) => {
        let cost = 0;
        for (let m = 0; m < n; m++) {
          // Spot place m shows piece face (m - twist) mod n (cubie.ts rule).
          cost += costs[positions[m]!]![faceIndex(name[(m - twist + n) % n]!)]!;
        }
        return { cost, twist };
      });
    }),
  );
}

interface Layer {
  perm: number[];
  twist: number[];
  options: Option[][][];
  mod: number;
}

const layerCost = (l: Layer) =>
  l.perm.reduce((sum, piece, spot) => sum + l.options[spot]![piece]![l.twist[spot]!]!.cost, 0);

function bestLayer(options: Option[][][], mod: number): Layer {
  const table = options.map((row) => row.map((twists) => Math.min(...twists.map((t) => t.cost))));
  const perm = assign(table);
  const twist = perm.map((piece, spot) => {
    const twists = options[spot]![piece]!;
    return twists.reduce((best, t) => (t.cost < twists[best]!.cost ? t.twist : best), 0);
  });
  return { perm, twist, options, mod };
}

/** Cheapest way to make the twists (or flips) add up right: change one piece's twist. */
function fixTwist(layer: Layer): Layer {
  const total = layer.twist.reduce((a, b) => a + b, 0) % layer.mod;
  if (total === 0) return layer;
  let best: { spot: number; twist: number; extra: number } | null = null;
  layer.perm.forEach((piece, spot) => {
    const current = layer.twist[spot]!;
    const twist = (current - total + layer.mod) % layer.mod;
    const extra =
      layer.options[spot]![piece]![twist]!.cost - layer.options[spot]![piece]![current]!.cost;
    if (!best || extra < best.extra) best = { spot, twist, extra };
  });
  const fix = best as unknown as { spot: number; twist: number };
  const twist = [...layer.twist];
  twist[fix.spot] = fix.twist;
  return { ...layer, twist };
}

/** Moves pieces between spots (spot cycle[0] gets the piece from cycle[1], and so on), then picks their best twists again. */
function cycled(layer: Layer, cycle: readonly number[]): Layer {
  const perm = [...layer.perm];
  cycle.forEach((spot, k) => (perm[spot] = layer.perm[cycle[(k + 1) % cycle.length]!]!));
  const twist = [...layer.twist];
  for (const spot of cycle) {
    const twists = layer.options[spot]![perm[spot]!]!;
    twist[spot] = twists.reduce((best, t) => (t.cost < twists[best]!.cost ? t.twist : best), 0);
  }
  return fixTwist({ ...layer, perm, twist });
}

/**
 * The Hungarian answer, plus every way to swap two pieces or cycle three,
 * each with its twists fixed. Several answers often tie, and only some of
 * them follow the cube's rules, so we keep the cheapest of each parity.
 */
function bestOfEachParity(layer: Layer): [Layer | null, Layer | null] {
  const n = layer.perm.length;
  const best: [Layer | null, Layer | null] = [null, null];
  const consider = (l: Layer) => {
    const p = permutationParity(l.perm);
    const current = best[p];
    if (!current || layerCost(l) < layerCost(current)) best[p] = l;
  };
  consider(fixTwist(layer));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      consider(cycled(layer, [i, j]));
      for (let k = j + 1; k < n; k++) {
        consider(cycled(layer, [i, j, k]));
        consider(cycled(layer, [i, k, j]));
      }
    }
  }
  return best;
}

export interface PieceFit {
  cubie: CubieState;
  cost: number;
}

export function bestValidCube(costs: StickerCosts): PieceFit {
  const cornerChoices = bestOfEachParity(
    bestLayer(pieceOptions(costs, CORNER_STICKERS, CORNER_NAMES), 3),
  );
  const edgeChoices = bestOfEachParity(
    bestLayer(pieceOptions(costs, EDGE_STICKERS, EDGE_NAMES), 2),
  );
  // Corner and edge swaps must match: both even or both odd.
  let corners: Layer | null = null;
  let edges: Layer | null = null;
  for (const p of [0, 1] as const) {
    const c = cornerChoices[p];
    const e = edgeChoices[p];
    if (!c || !e) continue;
    if (!corners || !edges || layerCost(c) + layerCost(e) < layerCost(corners) + layerCost(edges)) {
      corners = c;
      edges = e;
    }
  }
  if (!corners || !edges) throw new Error("No real cube found (this should never happen).");
  return {
    cubie: {
      cp: corners.perm,
      co: corners.twist,
      ep: edges.perm,
      eo: edges.twist,
      centers: [0, 1, 2, 3, 4, 5],
    },
    cost: layerCost(corners) + layerCost(edges),
  };
}
