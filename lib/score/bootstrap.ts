import { mulberry32 } from "@/lib/tokens";
import type { Interval } from "./wilson";

export interface BootstrapOptions { resamples: number; seed: number; alpha?: number }

/**
 * Percentile bootstrap over independent units (clusters). The statistic receives a resampled list of units.
 * Deterministic: the caller passes units in a stable order (sorted by id); the seed fixes every draw.
 * Returns null when the statistic is undefined on the full sample.
 */
export function bootstrap<T>(units: T[], stat: (sample: T[]) => number | null, opts: BootstrapOptions): Interval | null {
  const point = stat(units);
  if (point === null || units.length === 0) return null;
  const alpha = opts.alpha ?? 0.05;
  const rnd = mulberry32(opts.seed);
  const draws: number[] = [];
  const n = units.length;
  for (let r = 0; r < opts.resamples; r++) {
    const sample: T[] = new Array(n);
    for (let i = 0; i < n; i++) sample[i] = units[Math.floor(rnd() * n)];
    const v = stat(sample);
    if (v !== null && Number.isFinite(v)) draws.push(v);
  }
  if (draws.length === 0) return { point, lo: point, hi: point, n };
  draws.sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (draws.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return draws[lo] + (draws[hi] - draws[lo]) * (pos - lo);
  };
  return { point, lo: q(alpha / 2), hi: q(1 - alpha / 2), n };
}

/**
 * Joint bootstrap: several statistics computed on the same resamples, so ratios are bootstrapped together.
 * Each statistic may return null on a resample (for example a paired subset that is empty); such draws are skipped for that statistic.
 */
export function bootstrapJoint<T, K extends string>(
  units: T[],
  stats: Record<K, (sample: T[]) => number | null>,
  opts: BootstrapOptions,
): Record<K, Interval | null> {
  const keys = Object.keys(stats) as K[];
  const points = {} as Record<K, number | null>;
  for (const k of keys) points[k] = units.length ? stats[k](units) : null;
  const rnd = mulberry32(opts.seed);
  const draws = {} as Record<K, number[]>;
  for (const k of keys) draws[k] = [];
  const n = units.length;
  if (n > 0) {
    for (let r = 0; r < opts.resamples; r++) {
      const sample: T[] = new Array(n);
      for (let i = 0; i < n; i++) sample[i] = units[Math.floor(rnd() * n)];
      for (const k of keys) {
        const v = stats[k](sample);
        if (v !== null && Number.isFinite(v)) draws[k].push(v);
      }
    }
  }
  const alpha = opts.alpha ?? 0.05;
  const out = {} as Record<K, Interval | null>;
  for (const k of keys) {
    const point = points[k];
    if (point === null) { out[k] = null; continue; }
    const d = draws[k].sort((a, b) => a - b);
    if (d.length === 0) { out[k] = { point, lo: point, hi: point, n }; continue; }
    const q = (p: number) => { const pos = (d.length - 1) * p; const lo = Math.floor(pos), hi = Math.ceil(pos); return d[lo] + (d[hi] - d[lo]) * (pos - lo); };
    out[k] = { point, lo: q(alpha / 2), hi: q(1 - alpha / 2), n };
  }
  return out;
}

/** Largest absolute change in the statistic when one unit is left out. */
export function leaveOneOutMaxChange<T>(units: T[], stat: (sample: T[]) => number | null): number | null {
  const full = stat(units);
  if (full === null || units.length < 2) return null;
  let max = 0;
  for (let i = 0; i < units.length; i++) {
    const v = stat(units.filter((_, j) => j !== i));
    if (v !== null) max = Math.max(max, Math.abs(v - full));
  }
  return max;
}
