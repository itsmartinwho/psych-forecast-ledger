// Trend lineage lanes (Lupi Editorial L11): one row per item on a shared time axis, as pure geometry.
// Rules the layout enforces: month hairlines behind everything; a top rail of 1px event ticks with labels only
// where they fit (most isolated events first, at most RAIL_LABEL_MAX); one today rule; the hero lane as the one
// accent group; and a height that grows with the lane count up to LANE_CAP so no row drops under ROW_MIN.
import { scaleLinear } from "d3-scale";
import type { State, TrendLanesData } from "@/components/charts/types";
import { addMonths, toUtc } from "@/lib/dates";
import { fmtDate, fmtPct } from "@/lib/format";
import { FONT, LADDER, sqrtRadius } from "@/lib/tokens";

export const LANE_CAP = 40;
export const RAIL_LABEL_MAX = 6;
export const ROW_MIN = 12;
export const ROW_MAX = 22;
/** Two value labels on one lane never sit closer than this. */
export const VALUE_GAP = 16;
/** Month hairlines stop after this many months so a bad range cannot flood the card. */
const MONTH_CAP = 240;
/** Uppercase Inter at 600 with 0.08em tracking is close to 0.68em per character. */
const CHAR_EM = 0.68;

export interface TrendLanesOpts {
  /** Lane id that takes the accent; defaults to the first lane flagged hero. */
  hero?: string;
  /** Text floor in px; defaults to the frame's floor. */
  floor?: number;
}

export type LaneMarkKind = "statement" | "restatement" | "resolution";
export type LaneMarkVariant = "solid" | "hollow" | "tiny";
export type LaneSegmentKind = "solid" | "pending" | "tail";

export interface LaneMarkLayout { x: number; y: number; r: number; variant: LaneMarkVariant; kind: LaneMarkKind; p: number | null; title: string; delay: number }
export interface LaneSegmentLayout { x1: number; x2: number; y: number; kind: LaneSegmentKind }
export interface LaneValueLayout { x: number; y: number; text: string }
export interface LaneLayout {
  id: string;
  label: string;
  href: string | null;
  y: number;
  hero: boolean;
  /** A ladder hex, or "currentColor" on the hero lane so the group carries the accent once. */
  tone: string;
  state: State;
  labelX: number;
  segments: LaneSegmentLayout[];
  marks: LaneMarkLayout[];
  values: LaneValueLayout[];
  delay: number;
}
export interface RailTickLayout { x: number; label: string | null; labelX: number; title: string; delay: number }
export interface MonthRuleLayout { x: number; year: boolean; label: string }

export interface TrendLanesLayout {
  W: number;
  H: number;
  floor: number;
  plot: { x0: number; x1: number; top: number; bottom: number };
  months: MonthRuleLayout[];
  rail: { y: number; tickTop: number; labelY: number; labelSize: number; ticks: RailTickLayout[] };
  baseline: { y: number; labelSize: number; ticks: { x: number; label: string }[] };
  today: { x: number; y1: number; y2: number; labelX: number; labelY: number; anchor: "start" | "end"; label: string } | null;
  lanes: LaneLayout[];
  laneLabelSize: number;
  valueSize: number;
  /** Lanes dropped past LANE_CAP. */
  clipped: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const STATE_WORD: Record<State, string> = { true: "hit", false: "miss", pending: "pending", void: "void" };

/** Lane tone by state on the gray ladder: resolved lanes darkest, pending mid, void light. */
function toneFor(state: State): string {
  if (state === "true") return LADDER[0];
  if (state === "false") return LADDER[1];
  if (state === "pending") return LADDER[3];
  return LADDER[4];
}

function truncate(label: string, max: number): string {
  const up = label.toUpperCase();
  return up.length <= max ? up : `${up.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function layoutTrendLanes(data: TrendLanesData, W: number, frameH: number, opts: TrendLanesOpts = {}): TrendLanesLayout {
  const half = W < 600;
  const floor = opts.floor ?? (half ? FONT.floorHalf : FONT.floorWide);
  const labelCol = half ? 78 : 96;
  const x0 = labelCol;
  const x1 = W - (half ? 10 : 14);
  const railY = 30;
  const railTickTop = 24;
  const railLabelSize = Math.max(floor, half ? 6.5 : 6);
  const laneLabelSize = 7;
  const valueSize = 7;
  const top = 44;
  // 12px of air under the last lane, then 26px for the baseline and its year labels.
  const bottomPad = 38;

  const lanesIn = data.lanes.slice(0, LANE_CAP);
  const n = lanesIn.length;
  const span0 = frameH - top - bottomPad;
  const rowH = n === 0 ? ROW_MIN : Math.min(ROW_MAX, Math.max(ROW_MIN, span0 / n));
  const H = Math.max(frameH, Math.ceil(top + n * rowH + bottomPad));
  const baselineY = H - 26;

  const xs = scaleLinear().domain([toUtc(data.start), toUtc(data.end)]).range([x0, x1]);
  const xOf = (d: string): number => r2(Math.min(x1, Math.max(x0, xs(toUtc(d)))));

  // Month rules from the first month start inside the range to the end.
  const months: MonthRuleLayout[] = [];
  let cursor = `${data.start.slice(0, 7)}-01`;
  if (cursor < data.start) cursor = addMonths(cursor, 1);
  while (cursor <= data.end && months.length < MONTH_CAP) {
    months.push({ x: xOf(cursor), year: cursor.slice(5, 7) === "01", label: cursor.slice(0, 4) });
    cursor = addMonths(cursor, 1);
  }
  const years = months.filter((m) => m.year);
  const yearStep = years.length > 8 ? 2 : 1;
  const baselineTicks = years.filter((_, i) => i % yearStep === 0).map((m) => ({ x: m.x, label: m.label }));

  // Event rail: every event gets a tick; labels go to the most isolated events first, without overlap.
  const events = [...data.events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((e, i) => ({ ...e, x: xOf(e.date), i }));
  const isolation = events.map((e, i) => {
    const left = i > 0 ? e.x - events[i - 1].x : Infinity;
    const right = i < events.length - 1 ? events[i + 1].x - e.x : Infinity;
    return Math.min(left, right);
  });
  const order = events.map((_, i) => i).sort((a, b) => isolation[b] - isolation[a] || a - b);
  const placed: { a: number; b: number }[] = [];
  const labelXs = new Map<number, number>();
  for (const i of order) {
    if (placed.length >= RAIL_LABEL_MAX) break;
    const e = events[i];
    const w = e.label.length * railLabelSize * CHAR_EM + 6;
    const lx = Math.min(x1 - w / 2, Math.max(x0 + w / 2, e.x));
    const box = { a: lx - w / 2, b: lx + w / 2 };
    if (placed.some((p) => box.a < p.b && p.a < box.b)) continue;
    placed.push(box);
    labelXs.set(i, r2(lx));
  }
  const railTicks: RailTickLayout[] = events.map((e, i) => ({
    x: e.x,
    label: labelXs.has(i) ? e.label.toUpperCase() : null,
    labelX: labelXs.get(i) ?? e.x,
    title: `${fmtDate(e.date)} · ${e.label}`,
    delay: i * 12,
  }));

  // Today rule, only when today falls inside the range.
  const todayIn = data.today >= data.start && data.today <= data.end;
  const todayX = xOf(data.today);
  const todayFlip = todayX > x1 - 34;
  const today = todayIn
    ? { x: todayX, y1: railY, y2: baselineY, labelX: r2(todayFlip ? todayX - 3 : todayX + 3), labelY: r2(baselineY - 4), anchor: (todayFlip ? "end" : "start") as "start" | "end", label: "TODAY" }
    : null;

  const heroId = opts.hero ?? lanesIn.find((l) => l.hero)?.id ?? null;
  const maxChars = Math.floor((labelCol - 12) / (laneLabelSize * 0.64));
  let heroTaken = false;
  let markIndex = 0;
  const lanes: LaneLayout[] = lanesIn.map((lane, li) => {
    const y = r2(top + rowH * (li + 0.5));
    const hero = !heroTaken && heroId !== null && lane.id === heroId;
    if (hero) heroTaken = true;
    const xStart = xOf(lane.start);
    const xDead = xOf(lane.deadline);
    const xRes = lane.resolved ? xOf(lane.resolved) : null;

    const segments: LaneSegmentLayout[] = [];
    if (lane.state === "pending") {
      // Solid up to today (or the deadline if that came first), dashed across the open remainder.
      const split = Math.min(todayX, xDead);
      const far = Math.max(todayX, xDead);
      segments.push({ x1: xStart, x2: Math.max(xStart, split), y, kind: "solid" });
      if (far > split) segments.push({ x1: Math.max(xStart, split), x2: far, y, kind: "pending" });
    } else {
      // Solid to the resolution, then a faint tail over the unused window to the deadline.
      const end = xRes ?? xDead;
      segments.push({ x1: xStart, x2: Math.max(xStart, end), y, kind: "solid" });
      if (xDead > end) segments.push({ x1: end, x2: xDead, y, kind: "tail" });
    }

    const marks: LaneMarkLayout[] = [];
    marks.push({ x: xStart, y, r: 3, variant: "solid", kind: "statement", p: null, title: `${lane.label} · stated ${fmtDate(lane.start)}`, delay: markIndex++ * 12 });
    const restatements = [...(lane.restatements ?? [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const rs of restatements) {
      marks.push({ x: xOf(rs.date), y, r: r2(sqrtRadius(rs.p, 1, 2.6, 1)), variant: "solid", kind: "restatement", p: rs.p, title: `${lane.label} · restated ${fmtDate(rs.date)} · p ${fmtPct(rs.p)}`, delay: markIndex++ * 12 });
    }
    if (lane.state !== "pending") {
      // The closing mark carries the site code: solid hit, hollow miss, tiny void.
      const variant: LaneMarkVariant = lane.state === "true" ? "solid" : lane.state === "false" ? "hollow" : "tiny";
      marks.push({ x: xRes ?? xDead, y, r: 3, variant, kind: "resolution", p: null, title: `${lane.label} · ${STATE_WORD[lane.state]} ${fmtDate(lane.resolved ?? lane.deadline)}`, delay: markIndex++ * 12 });
    }

    // Only the hero lane gets value labels: its restatement probabilities, spaced by VALUE_GAP.
    const values: LaneValueLayout[] = [];
    if (hero) {
      let lastX = -Infinity;
      for (const m of marks) {
        if (m.kind !== "restatement" || m.p === null) continue;
        if (m.x - lastX < VALUE_GAP) continue;
        values.push({ x: m.x, y: r2(y - m.r - 3), text: fmtPct(m.p) });
        lastX = m.x;
      }
    }

    return {
      id: lane.id,
      label: truncate(lane.label, maxChars),
      href: lane.href ?? null,
      y,
      hero,
      tone: hero ? "currentColor" : toneFor(lane.state),
      state: lane.state,
      labelX: x0 - 8,
      segments,
      marks,
      values,
      delay: li * 30,
    };
  });

  return {
    W,
    H,
    floor,
    plot: { x0, x1, top, bottom: r2(baselineY - 12) },
    months,
    rail: { y: railY, tickTop: railTickTop, labelY: 20, labelSize: railLabelSize, ticks: railTicks },
    baseline: { y: baselineY, labelSize: 8, ticks: baselineTicks },
    today,
    lanes,
    laneLabelSize,
    valueSize,
    clipped: Math.max(0, data.lanes.length - LANE_CAP),
  };
}
