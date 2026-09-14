// Bubble almanac (Lupi Editorial L9): one 7px ledger row per record on a time axis. A hairline runs from the
// statement date to the resolution; a dot whose area encodes p sits at the resolution point. Pure: numbers and strings.
import { scaleLinear } from "d3-scale";
import type { AlmanacData, AlmanacRow, State } from "@/components/charts/types";
import { addMonths, cmp, toUtc } from "@/lib/dates";
import { fmtDate, fmtPct } from "@/lib/format";
import { LADDER, PALETTE } from "@/lib/tokens";

export const ROW_PITCH = 7;
/** More rows than this go to another chart; the layout reports rowsRendered and rowsTotal. */
export const ROW_CAP = 120;
export const ALMANAC_TOP = 22;
export const ALMANAC_BOTTOM = 18;
/** Dots enter one after another; the brief sets dots at 12ms. */
export const DOT_STAGGER_MS = 12;
export const DATE_SIZE = 7;
export const TAG_SIZE = 6.5;
export const YEAR_SIZE = 8;
export const LABEL_SIZE = 7;
export const TODAY_SIZE = 7;
/** Dot radius from sqrt(p), scaled into 2 to 6. */
export const R_MIN = 2;
export const R_MAX = 6;
export const LEDGER_STROKE = 0.5;
export const ROW_STROKE = 0.6;
export const HERO_ROW_STROKE = 0.9;
export const PENDING_DASH = "2 2";
export const BASELINE_Y = 14;

/** H = 40 + rows * 7. */
export function almanacHeight(rows: number): number {
  return ALMANAC_TOP + ALMANAC_BOTTOM + rows * ROW_PITCH;
}

export interface AlmanacOpts {
  /** Row id that takes the accent; falls back to the first row flagged hero. */
  hero?: string;
  /** Skip this many rows (in date order) before rendering; pages split long ledgers into windows of ROW_CAP. */
  offset?: number;
}

export type DotVariant = "solid" | "hollow" | "tiny" | "pending";

export interface AlmanacSegment { x1: number; x2: number; dashed: boolean }
export interface AlmanacRowLayout {
  id: string;
  y: number;
  ledgerY: number;
  hero: boolean;
  affiliated: boolean;
  state: State;
  delay: number;
  href: string | null;
  /** Group color: the accent for the hero row, ink otherwise. Children read currentColor. */
  color: string;
  lineColor: string;
  lineWidth: number;
  date: { x: number; y: number; text: string };
  segments: AlmanacSegment[];
  dot: { cx: number; cy: number; r: number; variant: DotVariant };
  tag: { x: number; y: number; text: string } | null;
  label: { x: number; y: number; text: string; anchor: "start" | "end" } | null;
  title: string;
}

export interface LedgerAlmanacLayout {
  W: number;
  H: number;
  rowsTotal: number;
  rowsRendered: number;
  offset: number;
  x0: number;
  x1: number;
  baseline: { x1: number; x2: number; y: number; ticks: number[] };
  monthRules: { x: number; y1: number; y2: number; width: number; color: string }[];
  yearLabels: { x: number; y: number; text: string }[];
  today: { x: number; y1: number; y2: number; label: { x: number; y: number; text: string } } | null;
  rows: AlmanacRowLayout[];
  footnote: { x: number; y: number; text: string };
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const firstOfMonth = (iso: string): string => `${iso.slice(0, 7)}-01`;

/** Where the dot sits: the resolution date for a resolved row, the deadline while pending. Missing resolved falls back to the deadline. */
export function resolutionDate(row: AlmanacRow): string {
  if (row.state === "pending") return row.deadline;
  return row.resolved ?? row.deadline;
}

/** Radius from sqrt(p) scaled into [R_MIN, R_MAX]; p is clamped into [0, 1]. */
export function dotRadius(p: number): number {
  const q = Math.min(1, Math.max(0, p));
  return r2(R_MIN + (R_MAX - R_MIN) * Math.sqrt(q));
}

const VARIANT: Record<State, DotVariant> = { true: "solid", false: "hollow", void: "tiny", pending: "pending" };

export function layoutLedgerAlmanac(data: AlmanacData, W: number, opts: AlmanacOpts = {}): LedgerAlmanacLayout {
  const sorted = [...data.rows].sort((a, b) => cmp(a.date, b.date) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const offset = Math.max(0, Math.min(opts.offset ?? 0, sorted.length));
  const window = sorted.slice(offset, offset + ROW_CAP);
  const rowsRendered = window.length;
  const H = almanacHeight(rowsRendered);
  const heroId = opts.hero ?? window.find((r) => r.hero)?.id ?? null;

  const left = 10;
  const dateColW = 58;
  const x0 = left + dateColW;
  const x1 = W - 36;
  const x = scaleLinear().domain([toUtc(data.start), toUtc(data.end)]).range([x0, x1]).clamp(true);
  const xOf = (iso: string): number => r2(x(toUtc(iso)));
  const rowTop = ALMANAC_TOP;
  const rowBottom = rowTop + rowsRendered * ROW_PITCH;

  // Month rules run down the ledger; January rules are a step darker and a touch wider so years read at a glance.
  const monthRules: LedgerAlmanacLayout["monthRules"] = [];
  const ticks: number[] = [];
  const yearLabels: LedgerAlmanacLayout["yearLabels"] = [];
  let m = firstOfMonth(data.start);
  if (m < data.start) m = addMonths(m, 1);
  for (; m <= data.end; m = addMonths(m, 1)) {
    const mx = xOf(m);
    const january = m.slice(5, 7) === "01";
    monthRules.push({ x: mx, y1: rowTop, y2: rowBottom, width: january ? 0.7 : LEDGER_STROKE, color: january ? PALETTE.faint : PALETTE.grid });
    ticks.push(mx);
    if (january) yearLabels.push({ x: mx, y: BASELINE_Y - 5, text: m.slice(0, 4) });
  }
  // A ledger that starts mid-year still names its first year, unless January is close enough to carry it.
  const firstJan = yearLabels[0];
  if (data.start.slice(5) !== "01-01" && (!firstJan || firstJan.x - x0 > 40)) {
    yearLabels.unshift({ x: r2(x0), y: BASELINE_Y - 5, text: data.start.slice(0, 4) });
  }

  const inRange = data.today >= data.start && data.today <= data.end;
  const todayX = xOf(data.today);
  const today = inRange ? { x: todayX, y1: BASELINE_Y, y2: rowBottom, label: { x: r2(todayX + 3), y: BASELINE_Y - 5, text: "TODAY" } } : null;

  const mid = (x0 + x1) / 2;
  const rows: AlmanacRowLayout[] = window.map((row, i) => {
    const hero = row.id === heroId;
    const y = r2(rowTop + i * ROW_PITCH + ROW_PITCH / 2);
    const start = xOf(row.date);
    const segments: AlmanacSegment[] = [];
    if (row.state === "pending") {
      // Solid up to the earlier of deadline and today; dashed across the stretch still open.
      const near = row.deadline < data.today ? row.deadline : data.today;
      const far = row.deadline < data.today ? data.today : row.deadline;
      const nearX = xOf(near);
      const farX = xOf(far);
      if (nearX > start) segments.push({ x1: start, x2: nearX, dashed: false });
      if (farX > nearX) segments.push({ x1: nearX, x2: farX, dashed: true });
    } else {
      const endX = xOf(resolutionDate(row));
      if (endX > start) segments.push({ x1: start, x2: endX, dashed: false });
    }
    const cx = xOf(resolutionDate(row));
    const variant = VARIANT[row.state];
    const r = variant === "tiny" ? R_MIN : dotRadius(row.p);
    const label = hero
      ? cx > mid
        ? { x: r2(cx - r - 4), y: r2(y + 2.5), text: row.label, anchor: "end" as const }
        : { x: r2(cx + r + 4), y: r2(y + 2.5), text: row.label, anchor: "start" as const }
      : null;
    return {
      id: row.id,
      y,
      ledgerY: r2(rowTop + (i + 1) * ROW_PITCH),
      hero,
      affiliated: Boolean(row.affiliated),
      state: row.state,
      delay: i * DOT_STAGGER_MS,
      href: row.href ?? null,
      color: hero ? PALETTE.accent : LADDER[0],
      lineColor: hero ? "currentColor" : LADDER[4],
      lineWidth: hero ? HERO_ROW_STROKE : ROW_STROKE,
      date: { x: left, y: r2(y + 2.5), text: fmtDate(row.date).toUpperCase() },
      segments,
      dot: { cx, cy: y, r, variant },
      tag: row.affiliated ? { x: W - 10, y: r2(y + 2.3), text: "AFF" } : null,
      label,
      title: `${row.label} · ${row.state} · p ${fmtPct(row.p)}`,
    };
  });

  const noteParts = ["dot area = p", "hairline = said to due"];
  if (sorted.length > rowsRendered) noteParts.push(`rows ${offset + 1} to ${offset + rowsRendered} of ${sorted.length}`);
  return {
    W,
    H,
    rowsTotal: sorted.length,
    rowsRendered,
    offset,
    x0: r2(x0),
    x1: r2(x1),
    baseline: { x1: r2(x0), x2: r2(x1), y: BASELINE_Y, ticks },
    monthRules,
    yearLabels,
    today,
    rows,
    footnote: { x: left, y: H - 6, text: noteParts.join(" · ") },
  };
}
