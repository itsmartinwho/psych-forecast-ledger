export interface CalibrationInput { p: number; o: 0 | 1; w: number; bin: string | null }
export interface CalibrationBin { bin: string; f: number; observed: number | null; n: number; weight: number; merged_from: string[] }
export interface Murphy { reliability: number; resolution: number; uncertainty: number; brier: number; n: number }

/**
 * Calibration by phrase bin. Each observation carries its cluster weight w (1 / (C * m_c)).
 * Stated numbers are assigned to the nearest bin by the caller. Bins with fewer than minPerBin
 * observations merge toward the 0.5 bin (C) and the merged bin reports the weighted mean forecast.
 */
export function calibrationByBin(rows: CalibrationInput[], binValues: Record<string, number>, minPerBin: number): CalibrationBin[] {
  const order = Object.keys(binValues).sort((a, b) => binValues[a] - binValues[b]);
  const acc = new Map<string, { f: number; wsum: number; osum: number; psum: number; n: number; from: string[] }>();
  for (const b of order) acc.set(b, { f: binValues[b], wsum: 0, osum: 0, psum: 0, n: 0, from: [b] });
  for (const r of rows) {
    if (!r.bin || !acc.has(r.bin)) continue;
    const a = acc.get(r.bin)!;
    a.wsum += r.w; a.osum += r.w * r.o; a.psum += r.w * r.p; a.n += 1;
  }
  // merge sparse bins toward the middle
  const midIdx = order.findIndex((b) => Math.abs(binValues[b] - 0.5) < 1e-9);
  const merge = (from: string, into: string) => {
    const a = acc.get(from)!, b = acc.get(into)!;
    b.wsum += a.wsum; b.osum += a.osum; b.psum += a.psum; b.n += a.n; b.from.push(...a.from);
    acc.delete(from);
  };
  let changed = true;
  while (changed) {
    changed = false;
    const keys = [...acc.keys()].sort((a, b) => binValues[a] - binValues[b]);
    for (const k of keys) {
      const a = acc.get(k);
      if (!a || a.n >= minPerBin || a.n === 0) continue;
      const idx = order.indexOf(k);
      // move one step toward the middle; the middle bin itself merges with its most populous neighbour
      let target: string | null = null;
      if (idx < midIdx) target = keys.find((x) => order.indexOf(x) > idx) ?? null;
      else if (idx > midIdx) target = [...keys].reverse().find((x) => order.indexOf(x) < idx) ?? null;
      else {
        const others = keys.filter((x) => x !== k);
        target = others.sort((x, y) => acc.get(y)!.n - acc.get(x)!.n)[0] ?? null;
      }
      if (target) { merge(k, target); changed = true; break; }
    }
  }
  return [...acc.entries()]
    .filter(([, a]) => a.n > 0)
    .map(([bin, a]) => ({ bin, f: a.wsum > 0 ? a.psum / a.wsum : a.f, observed: a.wsum > 0 ? a.osum / a.wsum : null, n: a.n, weight: a.wsum, merged_from: a.from }))
    .sort((x, y) => x.f - y.f);
}

/**
 * Murphy (1973) decomposition of the weighted Brier score over bins: B = REL - RES + UNC.
 * Exact when every forecast in a bin equals the bin's mean forecast; otherwise approximate and reported as such.
 */
export function murphy(rows: CalibrationInput[], bins: CalibrationBin[]): Murphy | null {
  const W = rows.reduce((s, r) => s + r.w, 0);
  if (W <= 0 || bins.length === 0) return null;
  const obar = rows.reduce((s, r) => s + r.w * r.o, 0) / W;
  let rel = 0, res = 0;
  for (const b of bins) {
    if (b.observed === null) continue;
    const share = b.weight / W;
    rel += share * (b.f - b.observed) ** 2;
    res += share * (b.observed - obar) ** 2;
  }
  const unc = obar * (1 - obar);
  const brierW = rows.reduce((s, r) => s + r.w * (r.p - r.o) ** 2, 0) / W;
  return { reliability: rel, resolution: res, uncertainty: unc, brier: brierW, n: rows.length };
}
