export interface Interval { point: number; lo: number; hi: number; n: number }

/** Wilson score interval for a proportion. n is the number of contributing observations. */
export function wilson(hits: number, n: number, z = 1.96): Interval | null {
  if (n <= 0) return null;
  const h = hits / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (h + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((h * (1 - h)) / n + z2 / (4 * n * n))) / denom;
  return { point: h, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half), n };
}
