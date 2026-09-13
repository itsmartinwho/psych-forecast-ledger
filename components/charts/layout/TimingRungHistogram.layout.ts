// Timing rung histogram (Lupi Basics F14): every record is one hairline rung, stacked per bin with a seeded
// jitter so the piles read as counted, not filled. Bins are equal-width columns in input order; zero and the
// median are placed by linear interpolation inside their bin (an open bin borrows the typical finite width).
import type { HistogramData } from "@/components/charts/types";
import { fmtMonths } from "@/lib/format";
import { FONT, LADDER, hashSeed, mulberry32 } from "@/lib/tokens";

export const RUNG_WIDTH = 6;
export const RUNG_STROKE = 0.9;
export const PITCH_MAX = 3.2;
export const PITCH_MIN = 1.1;
export const JITTER_MAX = 6;
/** Every bin gets a count label up to this many bins; past it only the tallest is labelled. */
export const LABEL_ALL_UP_TO = 6;

export interface HistogramOpts {
  /** Bin label that takes the accent; defaults to the tallest bin. */
  hero?: string;
  floor?: number;
}

export interface RungLayout { x1: number; x2: number; y: number }
export interface BinLayout {
  index: number;
  label: string;
  cx: number;
  x0: number;
  x1: number;
  count: number;
  tone: string;
  tallest: boolean;
  rungs: RungLayout[];
  countLabel: { x: number; y: number; text: string; accent: boolean } | null;
  title: string;
  delay: number;
}

export interface HistogramLayout {
  W: number;
  H: number;
  floor: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  baseline: { y: number; ticks: number[] };
  bins: BinLayout[];
  binLabel: { y: number; size: number };
  zero: { x: number; y1: number; y2: number; label: string; labelX: number; labelY: number; anchor: "start" | "end" } | null;
  median: { x: number; y1: number; y2: number; label: string; labelX: number; labelY: number; anchor: "start" | "end" } | null;
  footnote: { x: number; y: number; text: string };
  countSize: number;
  pitch: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function unitWord(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u.startsWith("month")) return "MO";
  if (u.startsWith("day")) return "D";
  if (u.startsWith("week")) return "WK";
  if (u.startsWith("year")) return "YR";
  return unit.toUpperCase();
}

function autoLabel(lo: number, hi: number, unit: string): string {
  if (!Number.isFinite(hi)) return `>${lo} ${unit}`;
  if (!Number.isFinite(lo)) return `<${hi} ${unit}`;
  return `${lo} to ${hi}`;
}

export function layoutTimingRungHistogram(data: HistogramData, W: number, H: number, opts: HistogramOpts = {}): HistogramLayout {
  const half = W < 600;
  const floor = opts.floor ?? (half ? FONT.floorHalf : FONT.floorWide);
  const margin = half ? { l: 14, r: 14, t: 34, b: 44 } : { l: 40, r: 40, t: 32, b: 40 };
  const x0 = margin.l;
  const x1 = W - margin.r;
  const y0 = margin.t;
  const y1 = H - margin.b;
  const n = data.bins.length;
  const colW = n > 0 ? (x1 - x0) / n : x1 - x0;
  const binX0 = (i: number): number => r2(x0 + i * colW);
  const countSize = FONT.value.min;

  // Position of a value on the axis: linear inside its bin; an open bin borrows the typical finite width.
  const finiteWidths = data.bins.filter((b) => Number.isFinite(b.lo) && Number.isFinite(b.hi)).map((b) => b.hi - b.lo).sort((a, b) => a - b);
  const openWidth = finiteWidths.length ? finiteWidths[Math.floor(finiteWidths.length / 2)] : 1;
  const xOfValue = (v: number): number | null => {
    for (let i = 0; i < n; i++) {
      const b = data.bins[i];
      const inBin = v >= b.lo && (v < b.hi || (i === n - 1 && v <= b.hi));
      if (!inBin) continue;
      let frac: number;
      if (!Number.isFinite(b.hi)) frac = clamp((v - b.lo) / openWidth, 0, 0.95);
      else if (!Number.isFinite(b.lo)) frac = 1 - clamp((b.hi - v) / openWidth, 0, 0.95);
      else frac = b.hi > b.lo ? (v - b.lo) / (b.hi - b.lo) : 0;
      return r2(x0 + (i + frac) * colW);
    }
    return null;
  };

  const maxCount = data.bins.reduce((m, b) => Math.max(m, b.count), 0);
  // Leave room above the tallest pile for its count label.
  const stackRoom = y1 - 2 - (y0 + 14);
  const pitch = maxCount > 0 ? r2(clamp(stackRoom / maxCount, PITCH_MIN, PITCH_MAX)) : PITCH_MAX;
  const jitter = Math.min(JITTER_MAX, colW * 0.12);
  const labelAll = n <= LABEL_ALL_UP_TO;

  const labels = data.bins.map((b) => (b.label ?? autoLabel(b.lo, b.hi, data.unit)).toUpperCase());
  const heroLabel = opts.hero?.toUpperCase();
  const heroIndex = heroLabel === undefined ? -1 : labels.findIndex((l) => l === heroLabel);
  const tallestIndex = heroIndex >= 0 ? heroIndex : data.bins.findIndex((b) => b.count === maxCount && maxCount > 0);
  const rank = data.bins
    .map((b, i) => ({ i, c: b.count }))
    .sort((a, b) => b.c - a.c || a.i - b.i)
    .reduce<number[]>((acc, e, r) => {
      acc[e.i] = r;
      return acc;
    }, []);

  const bins: BinLayout[] = data.bins.map((b, i) => {
    const cx = r2(x0 + (i + 0.5) * colW);
    const rnd = mulberry32(hashSeed(`rung:${i}:${b.lo}:${b.hi}`));
    const rungs: RungLayout[] = [];
    for (let k = 0; k < b.count; k++) {
      const off = (rnd() - 0.5) * 2 * jitter;
      const y = r2(y1 - 2 - (k + 0.5) * pitch);
      rungs.push({ x1: r2(cx + off - RUNG_WIDTH / 2), x2: r2(cx + off + RUNG_WIDTH / 2), y });
    }
    const stackTop = y1 - 2 - b.count * pitch;
    const tallest = i === tallestIndex;
    const countLabel = b.count > 0 && (labelAll || tallest) ? { x: cx, y: r2(stackTop - 5), text: String(b.count), accent: tallest } : null;
    return {
      index: i,
      label: labels[i],
      cx,
      x0: binX0(i),
      x1: binX0(i + 1),
      count: b.count,
      tone: LADDER[Math.min(4, rank[i] ?? 4)],
      tallest,
      rungs,
      countLabel,
      title: `${labels[i]} · ${b.count} ${data.rungUnit ?? "record"}${b.count === 1 ? "" : "s"}`,
      delay: i * 100,
    };
  });

  const labelY = y0 - 6;
  const zeroX = xOfValue(0);
  const medianX = data.median !== undefined ? xOfValue(data.median) : null;
  // Rule labels face away from each other so they never cross: zero to the left unless the median sits left.
  const medianLeft = medianX !== null && zeroX !== null && medianX < zeroX;
  const zero =
    zeroX === null
      ? null
      : {
          x: zeroX,
          y1: y0,
          y2: y1,
          label: (data.zeroLabel ?? "zero").toUpperCase(),
          labelX: r2(medianLeft ? zeroX + 3 : zeroX - 3),
          labelY,
          anchor: (medianLeft ? "start" : "end") as "start" | "end",
        };
  const median =
    medianX === null || data.median === undefined
      ? null
      : {
          x: medianX,
          y1: y1,
          y2: y0 + 4,
          label: `MEDIAN ${data.median > 0 ? "+" : ""}${fmtMonths(data.median).replace(/ mo$/, "")} ${unitWord(data.unit)}`,
          labelX: r2(medianLeft ? medianX - 4 : medianX + 4),
          labelY,
          anchor: (medianLeft ? "end" : "start") as "start" | "end",
        };

  return {
    W,
    H,
    floor,
    plot: { x0, x1, y0, y1 },
    baseline: { y: y1, ticks: Array.from({ length: n + 1 }, (_, i) => binX0(i)) },
    bins,
    binLabel: { y: y1 + 14, size: 7 },
    zero,
    median,
    footnote: { x: x1, y: H - 6, text: `1 RUNG = 1 ${(data.rungUnit ?? "record").toUpperCase()}` },
    countSize,
    pitch,
  };
}
