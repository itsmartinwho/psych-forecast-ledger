/** Cohen's kappa for two raters over nominal categories. Returns null when fewer than 2 pairs. */
export function cohenKappa<T extends string | number | boolean>(a: T[], b: T[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const cats = [...new Set([...a.slice(0, n), ...b.slice(0, n)].map(String))];
  const pa = new Map<string, number>(), pb = new Map<string, number>();
  let agree = 0;
  for (let i = 0; i < n; i++) {
    const x = String(a[i]), y = String(b[i]);
    if (x === y) agree++;
    pa.set(x, (pa.get(x) ?? 0) + 1);
    pb.set(y, (pb.get(y) ?? 0) + 1);
  }
  const po = agree / n;
  let pe = 0;
  for (const c of cats) pe += ((pa.get(c) ?? 0) / n) * ((pb.get(c) ?? 0) / n);
  if (pe >= 1) return po >= 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

/** Linear-weighted kappa for ordinal categories given in order. */
export function weightedKappa(a: string[], b: string[], order: string[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const k = order.length;
  const idx = (c: string) => order.indexOf(c);
  const obs: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const x = idx(a[i]), y = idx(b[i]);
    if (x < 0 || y < 0) continue;
    obs[x][y] += 1 / n;
  }
  const rowSum = obs.map((r) => r.reduce((s, v) => s + v, 0));
  const colSum = order.map((_, j) => obs.reduce((s, r) => s + r[j], 0));
  let num = 0, den = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
    const w = Math.abs(i - j) / (k - 1);
    num += w * obs[i][j];
    den += w * rowSum[i] * colSum[j];
  }
  if (den === 0) return num === 0 ? 1 : 0;
  return 1 - num / den;
}
