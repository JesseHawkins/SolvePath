/** Tiny 3D helpers for the synthetic renderer. Row-major 3x3 matrices. */
export type V3 = [number, number, number];
export type M3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Rotation by `angle` radians about a unit axis, counterclockwise (right-hand rule). */
export function rotation(axis: V3, angle: number): M3 {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}

export function mul(a: M3, b: M3): M3 {
  const r = new Array<number>(9).fill(0) as M3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
    }
  }
  return r;
}

export function apply(m: M3, v: readonly number[]): V3 {
  return [
    m[0] * v[0]! + m[1] * v[1]! + m[2] * v[2]!,
    m[3] * v[0]! + m[4] * v[1]! + m[5] * v[2]!,
    m[6] * v[0]! + m[7] * v[1]! + m[8] * v[2]!,
  ];
}

export const add = (a: readonly number[], b: readonly number[]): V3 => [
  a[0]! + b[0]!,
  a[1]! + b[1]!,
  a[2]! + b[2]!,
];
export const scale = (a: readonly number[], k: number): V3 => [a[0]! * k, a[1]! * k, a[2]! * k];
export const dot = (a: readonly number[], b: readonly number[]) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
export const cross = (a: readonly number[], b: readonly number[]): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

/** A small seeded random number generator (mulberry32), so test images are repeatable. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normally distributed random number (Box-Muller). */
export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
