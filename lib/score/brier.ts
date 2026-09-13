export type Outcome = 0 | 1;

/** Squared gap between a probability and a binary outcome. 0 is perfect; 0.25 is the constant 0.5; 0.81 is a wrong "will". */
export function brier(p: number, o: Outcome): number {
  return (p - o) ** 2;
}

/** Arithmetic mean; null for an empty list. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Brier skill score against a reference score: 1 - bs / ref. Positive beats the reference. */
export function skill(bs: number, ref: number): number | null {
  if (!(ref > 0)) return null;
  return 1 - bs / ref;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Quantile with linear interpolation on a sorted copy (type 7). */
export function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function clamp(p: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, p));
}
