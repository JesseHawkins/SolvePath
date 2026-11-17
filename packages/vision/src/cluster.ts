/**
 * Grouping the 54 sticker colors into 6 colors (PLAN.md 5.6, steps 2-3).
 *
 * Every color appears on exactly 9 stickers, so we don't just put each
 * sticker with its nearest color: we hand out exactly 9 per color with the
 * Hungarian algorithm (a "balanced" grouping), then move each color's
 * middle to the middle of its stickers, and repeat until nothing changes.
 *
 * Known centers (the sides we saw) start their own groups and stay in them.
 */
import { colorDistance, type Lab } from "./color";
import { assign } from "./hungarian";

export interface ClusterInput {
  /** Every sticker color we saw (null for stickers we couldn't see). */
  samples: readonly (Lab | null)[];
  /** Stickers that must be in a group: [sample index, group]. Groups are numbered from 0. */
  fixed: readonly [number, number][];
  /** How many stickers belong in each group. Must add up to the number of seen stickers. */
  sizes: readonly number[];
}

export interface Clusters {
  /** Middle color of each group. */
  centers: Lab[];
  /** Group of each sample (-1 for unseen). */
  groupOf: number[];
}

/** Mean of the colors, ignoring the farthest 20% (so one odd sticker can't drag it). */
function trimmedMean(colors: Lab[], around: Lab): Lab {
  if (colors.length === 0) return around;
  const sorted = [...colors].sort((p, q) => colorDistance(p, around) - colorDistance(q, around));
  const keep = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.8)));
  const sum: Lab = [0, 0, 0];
  for (const c of keep) {
    sum[0] += c[0];
    sum[1] += c[1];
    sum[2] += c[2];
  }
  return [sum[0] / keep.length, sum[1] / keep.length, sum[2] / keep.length];
}

/**
 * Starting colors: one per fixed group, then "k-means++" for the rest: pick
 * the sticker farthest from every group so far.
 */
function seeds(input: ClusterInput): Lab[] {
  const groups = input.sizes.length;
  const centers: (Lab | null)[] = new Array<Lab | null>(groups).fill(null);
  for (const [index, group] of input.fixed) centers[group] = input.samples[index] ?? null;
  for (let g = 0; g < groups; g++) {
    if (centers[g]) continue;
    let far: Lab | null = null;
    let farDistance = -1;
    for (const s of input.samples) {
      if (!s) continue;
      const nearest = Math.min(
        ...centers.filter((c): c is Lab => c !== null).map((c) => colorDistance(c, s)),
      );
      if (nearest > farDistance) {
        farDistance = nearest;
        far = s;
      }
    }
    centers[g] = far ?? [0.5, 0, 0];
  }
  return centers as Lab[];
}

export function balancedClusters(input: ClusterInput, rounds = 6): Clusters {
  const seen = input.samples.flatMap((s, i) => (s ? [i] : []));
  const total = input.sizes.reduce((a, b) => a + b, 0);
  if (total !== seen.length)
    throw new Error(`Group sizes add to ${total}, but ${seen.length} stickers were seen.`);
  // One "slot" per sticker place in a group.
  const slotGroup = input.sizes.flatMap((size, g) => new Array<number>(size).fill(g));
  const fixedGroup = new Map(input.fixed);

  let centers = seeds(input);
  let groupOf = new Array<number>(input.samples.length).fill(-1);
  for (let round = 0; round < rounds; round++) {
    const cost = seen.map((i) => {
      const s = input.samples[i]!;
      const pinned = fixedGroup.get(i);
      return slotGroup.map((g) =>
        pinned !== undefined ? (pinned === g ? 0 : 1e6) : colorDistance(s, centers[g]!) ** 2,
      );
    });
    const pairing = assign(cost);
    const next = new Array<number>(input.samples.length).fill(-1);
    seen.forEach((i, row) => (next[i] = slotGroup[pairing[row]!]!));
    const same = next.every((g, i) => g === groupOf[i]);
    groupOf = next;
    centers = centers.map((c, g) =>
      trimmedMean(
        seen.filter((i) => groupOf[i] === g).map((i) => input.samples[i]!),
        c,
      ),
    );
    if (same) break;
  }
  return { centers, groupOf };
}
