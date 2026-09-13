// Layout for the calibration plumb scatter (Lupi Basics F8): x = what the forecaster said, y = the share that
// came true, one dot per phrase bin with area = event count, a plumb line from each dot down to a barcode
// floor of one tick per event. Pure: data in, positioned numbers and strings out, so a test can snapshot it.
import { scaleLinear } from "d3-scale";
import type { CalibrationBinDatum, CalibrationData } from "@/components/charts/types";
import { fmtPct } from "@/lib/format";
import { MOTION, sqrtRadius } from "@/lib/tokens";

export interface CalibrationPlumbOptions {
  /** Bin id that takes the accent. Defaults to the bin with the largest gap between forecast and observed. */
  hero?: string;
}

export interface PlumbBin {
  id: string;
  x: number;
  y: number;
  r: number;
  n: number;
  forecast: number;
  observed: number | null;
  /** Hollow when the bin has no observed share; it sits on the ideal line at y = forecast. */
  hollow: boolean;
  hero: boolean;
  countText: string;
  countY: number;
  plumbY1: number;
  plumbY2: number;
  /** Barcode floor ticks for this bin: one per event, centred under the dot. */
  ticks: number[];
  heroLabel: { x: number; y: number; anchor: "start" | "middle" | "end"; text: string } | null;
  delay: number;
}

export interface CalibrationPlumbLayout {
  w: number;
  h: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  ideal: { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number; text: string };
  bins: PlumbBin[];
  floor: { y: number; xs: number[] };
  baseline: { y: number; ticks: number[]; labels: string[] };
  yTicks: { y: number; label: string }[];
  footnote: { x: number; y: number; text: string };
  heroId: string | null;
}

export const R_MIN = 3;
export const R_MAX = 14;
export const PLUMB_WIDTH = 0.55;
export const COUNT_SIZE = 8;
export const HERO_LABEL_SIZE = 9;
export const IDEAL_TEXT = "said = came true";
export const FOOTNOTE_TEXT = "dot area = events · dashed = perfect calibration";

const r2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The accent goes to the named bin when it exists, else to the bin furthest from the ideal line, else nowhere. */
export function pickHeroBin(bins: CalibrationBinDatum[], hero?: string): string | null {
  if (hero && bins.some((b) => b.bin === hero)) return hero;
  let best: CalibrationBinDatum | null = null;
  let gap = -1;
  for (const b of bins) {
    if (b.observed === null) continue;
    const g = Math.abs(b.observed - b.forecast);
    if (g > gap) {
      gap = g;
      best = b;
    }
  }
  return best?.bin ?? null;
}

/** Text for the hero label: both values in plain words. */
export function heroLabelText(b: CalibrationBinDatum): string {
  const said = `${fmtPct(b.forecast)} said`;
  return b.observed === null ? `${said} · no outcomes yet` : `${said} · ${fmtPct(b.observed)} came true`;
}

export function layoutCalibrationPlumb(data: CalibrationData, W: number, H: number, opts: CalibrationPlumbOptions = {}): CalibrationPlumbLayout {
  const wide = W >= 600;
  const x0 = wide ? 40 : 36;
  const x1 = W - 18;
  const y0 = 30;
  const baselineY = H - 38;
  // The plot floor sits above the baseline so a dot at zero still has a short plumb and room for its count.
  const y1 = baselineY - 18;

  const x = scaleLinear().domain([0, 1]).range([x0, x1]).clamp(true);
  const y = scaleLinear().domain([0, 1]).range([y1, y0]).clamp(true);

  const ordered = [...data.bins].sort((a, b) => a.forecast - b.forecast);
  const heroId = pickHeroBin(ordered, opts.hero);
  const maxN = ordered.reduce((m, b) => Math.max(m, b.n), 0);
  // One bin's floor ticks may spread over at most 16% of the track, so neighbours at 0.2 apart never touch.
  const span = (x1 - x0) * 0.16;

  const bins: PlumbBin[] = ordered.map((b, i) => {
    const cx = r2(x(b.forecast));
    const cy = r2(y(b.observed === null ? b.forecast : b.observed));
    const r = r2(sqrtRadius(b.n, maxN, R_MAX, R_MIN));
    const hero = b.bin === heroId;
    const gapPx = b.n > 1 ? Math.min(2, span / (b.n - 1)) : 0;
    const start = cx - (gapPx * (b.n - 1)) / 2;
    const ticks = Array.from({ length: b.n }, (_, k) => r2(clamp(start + k * gapPx, x0, x1)));
    let heroLabel: PlumbBin["heroLabel"] = null;
    if (hero) {
      const text = heroLabelText(b);
      const half = (text.length * HERO_LABEL_SIZE * 0.56) / 2;
      const anchor = cx - half < x0 ? "start" : cx + half > x1 ? "end" : "middle";
      const lx = anchor === "start" ? x0 : anchor === "end" ? x1 : cx;
      heroLabel = { x: lx, y: r2(Math.max(y0 - 16, cy - r - 6)), anchor, text };
    }
    return {
      id: b.bin,
      x: cx,
      y: cy,
      r,
      n: b.n,
      forecast: b.forecast,
      observed: b.observed,
      hollow: b.observed === null,
      hero,
      countText: `n=${b.n}`,
      countY: r2(Math.min(cy + r + 9, baselineY - 4)),
      plumbY1: r2(Math.min(cy + r, baselineY)),
      plumbY2: baselineY,
      ticks,
      heroLabel,
      delay: i * MOTION.staggerDotMs,
    };
  });

  const ideal = { x1: r2(x(0)), y1: r2(y(0)), x2: r2(x(1)), y2: r2(y(1)), labelX: r2(x(1)), labelY: r2(y(1) - 5), text: IDEAL_TEXT };
  const tickValues = wide ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1];
  const baseline = { y: baselineY, ticks: tickValues.map((t) => r2(x(t))), labels: tickValues.map((t) => fmtPct(t)) };
  const yTicks = [0, 0.5, 1].map((t) => ({ y: r2(y(t)), label: fmtPct(t) }));

  return {
    w: W,
    h: H,
    plot: { x0, x1, y0, y1 },
    ideal,
    bins,
    floor: { y: baselineY, xs: bins.flatMap((b) => b.ticks) },
    baseline,
    yTicks,
    footnote: { x: x0, y: H - 6, text: FOOTNOTE_TEXT },
    heroId,
  };
}
