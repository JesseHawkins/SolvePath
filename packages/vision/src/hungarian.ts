/**
 * The Hungarian algorithm: the cheapest way to pair up rows and columns of a
 * square cost table, one column per row. We use it to give each color
 * exactly 9 stickers.
 *
 * This is the classic O(n^3) version with potentials (Kuhn-Munkres, as
 * written up by e-maxx / cp-algorithms). Costs may be any finite numbers.
 */

/**
 * @param cost cost[row][col], an n x n table.
 * @returns For each row, the column it is paired with.
 */
export function assign(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  for (const row of cost) {
    if (row.length !== n) throw new Error("The cost table must be square.");
  }
  // 1-based arrays, with row/column 0 as a helper.
  const u = new Float64Array(n + 1);
  const v = new Float64Array(n + 1);
  const p = new Int32Array(n + 1); // p[col] = row paired with col
  const way = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(n + 1).fill(Infinity);
    const used = new Uint8Array(n + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0]!;
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
        if (cur < minv[j]!) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j]! < delta) {
          delta = minv[j]!;
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]!]! += delta;
          v[j]! -= delta;
        } else {
          minv[j]! -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0]!;
      p[j0] = p[j1]!;
      j0 = j1;
    } while (j0 !== 0);
  }
  const result = new Array<number>(n).fill(-1);
  for (let j = 1; j <= n; j++) result[p[j]! - 1] = j - 1;
  return result;
}

/** Total cost of a pairing. */
export function assignmentCost(
  cost: readonly (readonly number[])[],
  pairing: readonly number[],
): number {
  return pairing.reduce((sum, col, row) => sum + cost[row]![col]!, 0);
}
