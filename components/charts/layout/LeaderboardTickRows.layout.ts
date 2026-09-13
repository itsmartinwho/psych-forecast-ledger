// Layout for the leaderboard tick rows (Lupi Basics F5 rows plus F15 whisker): one row per forecaster,
// a whisker for the 95% range, a dot at the score, then the score and the evidence tier at the row end.
// Pure: data in, positioned numbers and strings out, so a test can snapshot it without React.
import { scaleLinear } from "d3-scale";
import type { LeaderboardData, LeaderboardRowDatum, Tier } from "@/components/charts/types";
import { TIER_LABEL } from "@/components/ui/TierBadge";
import thresholds from "@/data/rules/thresholds.json";
import { NA, fmtBrier } from "@/lib/format";
import { MOTION } from "@/lib/tokens";

export interface LeaderboardTickRowsOptions {
  /** Row id that takes the accent. Defaults to the row flagged hero in the data. */
  hero?: string;
  /** True keeps the given order of person rows (the deriver's rank order). False sorts persons by label. */
  ranked?: boolean;
  /** Resolved events a row needs to leave T0. A T0 row reads "n of minN" instead of a score. */
  minN?: number;
}

export type RowVariant = "solid" | "hollow" | "faint";

export interface TickRow {
  id: string;
  label: string;
  href: string | null;
  tier: Tier;
  hero: boolean;
  reference: boolean;
  y: number;
  labelX: number;
  /** Dot centre, or null when the row has no score to place. */
  x: number | null;
  r: number;
  variant: RowVariant;
  /** Whisker ends, or null when the row is T0 or carries no interval. */
  lo: number | null;
  hi: number | null;
  valueText: string;
  valueX: number;
  tierText: string;
  tierX: number;
  delay: number;
}

export interface LeaderboardTickRowsLayout {
  w: number;
  h: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  rows: TickRow[];
  /** y of the hairline under every row but the last. */
  rules: number[];
  baseline: { y: number; ticks: number[]; labels: string[] };
  coinFlip: { x: number; y1: number; y2: number; labelX: number; labelY: number; text: string } | null;
  footnote: { x: number; y: number; text: string };
  heroId: string | null;
}

export const DOT_RADIUS = 3.5;
export const FAINT_RADIUS = 2.5;
export const FOOTNOTE_TEXT = "lower is better · 95% range";
export const COIN_FLIP_TEXT = "coin flip";

const r2 = (v: number): number => Math.round(v * 100) / 100;

function byLabel(a: LeaderboardRowDatum, b: LeaderboardRowDatum): number {
  const x = a.label.toLowerCase();
  const y = b.label.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

/** The accent goes to the named row when it exists, else to the row flagged hero, else nowhere. */
export function pickHeroRow(rows: LeaderboardRowDatum[], hero?: string): string | null {
  if (hero && rows.some((r) => r.id === hero)) return hero;
  return rows.find((r) => r.hero)?.id ?? null;
}

export function layoutLeaderboardTickRows(data: LeaderboardData, W: number, H: number, opts: LeaderboardTickRowsOptions = {}): LeaderboardTickRowsLayout {
  const wide = W >= 600;
  const minN = opts.minN ?? thresholds.min_clusters_headline;
  // Columns: label, track, score, tier. The track takes what the three text columns leave.
  const labelW = wide ? 120 : 96;
  const valueW = 36;
  const tierW = 60;
  const gap = 8;
  const x0 = labelW + gap;
  const x1 = W - tierW - gap - valueW - gap;
  const valueX = x1 + gap + valueW;
  const tierX = W - tierW;
  const baselineY = H - 38;
  const y0 = 24;
  const y1 = baselineY - 10;

  // Persons first, references last. Persons keep the deriver's order only when it is a rank order.
  const persons = data.rows.filter((r) => !r.reference);
  const refs = data.rows.filter((r) => r.reference);
  const ordered = [...(opts.ranked ? persons : [...persons].sort(byLabel)), ...refs];
  const heroId = pickHeroRow(ordered, opts.hero);

  const x = scaleLinear().domain(data.domain).range([x0, x1]).clamp(true);
  const pitch = ordered.length > 0 ? (y1 - y0) / ordered.length : 0;

  const rows: TickRow[] = ordered.map((r, i) => {
    const y = r2(y0 + pitch * (i + 0.5));
    const hasValue = r.value !== null && Number.isFinite(r.value);
    const t0 = r.tier === "T0";
    const hasWhisker = !t0 && hasValue && r.lo !== undefined && r.hi !== undefined;
    const variant: RowVariant = t0 ? "faint" : r.reference ? "hollow" : "solid";
    // A T0 row has too few resolved events for a stable score, so it shows progress toward the threshold.
    const valueText = t0 ? `${r.n} of ${minN}`.toUpperCase() : hasValue ? fmtBrier(r.value) : NA;
    return {
      id: r.id,
      label: r.label,
      href: r.href ?? null,
      tier: r.tier,
      hero: r.id === heroId,
      reference: r.reference === true,
      y,
      labelX: 0,
      x: hasValue ? r2(x(r.value as number)) : null,
      r: t0 ? FAINT_RADIUS : DOT_RADIUS,
      variant,
      lo: hasWhisker ? r2(x(r.lo as number)) : null,
      hi: hasWhisker ? r2(x(r.hi as number)) : null,
      valueText,
      valueX,
      tierText: TIER_LABEL[r.tier],
      tierX,
      delay: i * MOTION.staggerDotMs,
    };
  });

  const rules = ordered.slice(1).map((_, i) => r2(y0 + pitch * (i + 1)));
  const lo = Math.min(data.domain[0], data.domain[1]);
  const hi = Math.max(data.domain[0], data.domain[1]);
  const tickValues = x.ticks(wide ? 6 : 5).filter((t) => t >= lo && t <= hi);
  const baseline = { y: baselineY, ticks: tickValues.map((t) => r2(x(t))), labels: tickValues.map((t) => String(r2(t))) };

  const cx = r2(x(data.coinFlip));
  const coinFlip = data.coinFlip >= lo && data.coinFlip <= hi ? { x: cx, y1: y0 - 4, y2: baselineY, labelX: cx, labelY: y0 - 9, text: COIN_FLIP_TEXT } : null;

  return { w: W, h: H, plot: { x0, x1, y0, y1 }, rows, rules, baseline, coinFlip, footnote: { x: 0, y: H - 6, text: FOOTNOTE_TEXT }, heroId };
}
