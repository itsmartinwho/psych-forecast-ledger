// Layout for the Brier hairline (Lupi Basics F2): one 1px path per series over a calendar floor of one tick per
// quarter, one dot per period, the coin-flip rule at 0.25, labels on the latest value of every series and on
// the hero's best and worst quarter. Pure: data in, positioned numbers and strings out, so a test can snapshot it.
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { BrierSeriesData, SeriesPoint } from "@/components/charts/types";
import { fmtBrier } from "@/lib/format";
import { LADDER, MOTION } from "@/lib/tokens";

export interface BrierHairlineOptions {
  /** Series id that takes the accent. Defaults to the series flagged hero in the data. */
  hero?: string;
}

export interface HairlinePoint {
  period: string;
  x: number;
  y: number;
  value: number;
  n: number;
  /** Hollow when the period rests on fewer than three events. */
  hollow: boolean;
  label: string;
  delay: number;
}

export interface LatestLabel {
  x: number;
  y: number;
  valueY: number;
  nameY: number;
  valueText: string;
  nameText: string;
}

export interface ExtremeLabel {
  x: number;
  y: number;
  text: string;
}

export interface HairlineSeries {
  id: string;
  label: string;
  hero: boolean;
  /** Ladder step for a non-hero series; the hero takes the accent in the component. */
  tone: string;
  d: string;
  points: HairlinePoint[];
  latest: LatestLabel | null;
  best: ExtremeLabel | null;
  worst: ExtremeLabel | null;
  delay: number;
}

export interface BrierHairlineLayout {
  w: number;
  h: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  yTop: number;
  series: HairlineSeries[];
  floor: { y: number; xs: number[]; majorXs: number[] };
  baseline: { y: number; ticks: number[]; labels: string[] };
  yTicks: { y: number; label: string }[];
  coinFlip: { y: number; x1: number; x2: number; labelX: number; labelY: number; text: string } | null;
  footnote: { x: number; y: number; text: string };
  heroId: string | null;
}

export const DOT_RADIUS = 2.6;
export const HOLLOW_BELOW = 3;
export const LABEL_GAP = 20;
export const VALUE_SIZE = 9;
export const NAME_SIZE = 7;
export const COIN_FLIP_TEXT = "coin flip";
export const FOOTNOTE_TEXT = "brier · lower is better · hollow = fewer than 3 events";
/** Ladder steps for non-hero series, in series order. */
const TONES = [1, 3, 4, 5, 6] as const;

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Quarter index of a period string: "2024-Q2", "2024-05" or "2024". Null for anything else. */
export function quarterIndex(period: string): number | null {
  const q = /^(\d{4})-Q([1-4])$/.exec(period);
  if (q) return Number(q[1]) * 4 + Number(q[2]) - 1;
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (m) return Number(m[1]) * 4 + Math.floor((Number(m[2]) - 1) / 3);
  const y = /^(\d{4})$/.exec(period);
  if (y) return Number(y[1]) * 4;
  return null;
}

/** The accent goes to the named series when it exists, else to the series flagged hero, else nowhere. */
export function pickHeroSeries(series: BrierSeriesData["series"], hero?: string): string | null {
  if (hero && series.some((s) => s.id === hero)) return hero;
  return series.find((s) => s.hero)?.id ?? null;
}

interface QPoint extends SeriesPoint {
  q: number;
}

export function layoutBrierHairline(data: BrierSeriesData, W: number, H: number, opts: BrierHairlineOptions = {}): BrierHairlineLayout {
  const wide = W >= 600;
  const x0 = wide ? 34 : 30;
  // The right margin holds the latest-value labels: a value line and a name line, anchored at the last point.
  const x1 = W - (wide ? 96 : 68);
  const y0 = 22;
  const baselineY = H - 36;
  const y1 = baselineY;

  const parsed = data.series.map((s) => {
    const pts: QPoint[] = [];
    for (const p of s.points) {
      const q = quarterIndex(p.period);
      if (q !== null) pts.push({ ...p, q });
    }
    pts.sort((a, b) => a.q - b.q);
    return { s, pts };
  });

  const qs = parsed.flatMap(({ pts }) => pts.map((p) => p.q));
  let qMin = qs.length > 0 ? Math.min(...qs) : 0;
  let qMax = qs.length > 0 ? Math.max(...qs) : 0;
  if (qMin === qMax) {
    qMin -= 1;
    qMax += 1;
  }
  const values = parsed.flatMap(({ pts }) => pts.map((p) => p.value)).filter((v): v is number => v !== null && Number.isFinite(v));
  const yTop = Math.max(0.6, ...values);

  const x = scaleLinear().domain([qMin, qMax]).range([x0, x1]);
  const y = scaleLinear().domain([0, yTop]).range([y1, y0]).clamp(true);
  const heroId = pickHeroSeries(data.series, opts.hero);

  let toneIdx = 0;
  const series: HairlineSeries[] = parsed.map(({ s, pts }, i) => {
    const hero = s.id === heroId;
    const tone = hero ? LADDER[0] : LADDER[TONES[Math.min(toneIdx++, TONES.length - 1)]];
    const delay = i * MOTION.staggerBarMs;
    // A null value breaks the path: the line never bridges a quarter with no resolved events.
    const gen = line<QPoint>()
      .defined((p) => p.value !== null)
      .x((p) => r2(x(p.q)))
      .y((p) => r2(y(p.value as number)));
    const d = gen(pts) ?? "";
    const points: HairlinePoint[] = pts
      .filter((p): p is QPoint & { value: number } => p.value !== null)
      .map((p, j) => ({ period: p.period, x: r2(x(p.q)), y: r2(y(p.value)), value: p.value, n: p.n, hollow: p.n < HOLLOW_BELOW, label: fmtBrier(p.value), delay: delay + j * MOTION.staggerDotMs }));
    const last = points.length > 0 ? points[points.length - 1] : null;
    const latest: LatestLabel | null = last ? { x: r2(last.x + 6), y: last.y, valueY: 0, nameY: 0, valueText: fmtBrier(last.value), nameText: s.label.toUpperCase() } : null;
    let best: ExtremeLabel | null = null;
    let worst: ExtremeLabel | null = null;
    if (hero && points.length > 1) {
      let bi = 0;
      let wi = 0;
      points.forEach((p, j) => {
        if (p.value < points[bi].value) bi = j;
        if (p.value > points[wi].value) wi = j;
      });
      const lastIdx = points.length - 1;
      // Lower is better: the best quarter is labelled below its dot, the worst above. The latest label already covers the last point.
      if (bi !== lastIdx) best = { x: points[bi].x, y: r2(points[bi].y + DOT_RADIUS + 9), text: fmtBrier(points[bi].value) };
      if (wi !== lastIdx && wi !== bi) worst = { x: points[wi].x, y: r2(points[wi].y - DOT_RADIUS - 4), text: fmtBrier(points[wi].value) };
    }
    return { id: s.id, label: s.label, hero, tone, d, points, latest, best, worst, delay };
  });

  // Latest labels stack downward with a minimum gap, then the stack moves up if it runs past the baseline.
  const labels = series.filter((s) => s.latest !== null).map((s) => s.latest as LatestLabel);
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y < labels[i - 1].y + LABEL_GAP) labels[i].y = r2(labels[i - 1].y + LABEL_GAP);
  const lastLabel = labels.length > 0 ? labels[labels.length - 1] : null;
  if (lastLabel && lastLabel.y > y1 - 4) {
    const shift = lastLabel.y - (y1 - 4);
    for (const l of labels) l.y = r2(l.y - shift);
  }
  for (const l of labels) {
    l.valueY = r2(l.y - 1);
    l.nameY = r2(l.y + 8);
  }

  const xs: number[] = [];
  const majorXs: number[] = [];
  const years: string[] = [];
  for (let q = qMin; q <= qMax; q++) {
    const px = r2(x(q));
    xs.push(px);
    if (q % 4 === 0) {
      majorXs.push(px);
      years.push(String(Math.floor(q / 4)));
    }
  }

  const yTicks = y.ticks(3).filter((t) => t <= yTop).map((t) => ({ y: r2(y(t)), label: String(r2(t)) }));
  const cf = data.coinFlip;
  const coinFlip = cf > 0 && cf < yTop ? { y: r2(y(cf)), x1: x0, x2: x1, labelX: x0 + 2, labelY: r2(y(cf) - 3), text: COIN_FLIP_TEXT } : null;

  return {
    w: W,
    h: H,
    plot: { x0, x1, y0, y1 },
    yTop,
    series,
    floor: { y: baselineY, xs, majorXs },
    baseline: { y: baselineY, ticks: majorXs, labels: years },
    yTicks,
    coinFlip,
    footnote: { x: 0, y: H - 6, text: FOOTNOTE_TEXT },
    heroId,
  };
}
