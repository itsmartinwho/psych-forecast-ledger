// Tick donut (Lupi Basics F4): a dial of 100 ticks, or one tick per record when the total is 100 or less.
// Segments keep the data order and take the ladder color of their tone; one empty tick separates segments.
// Pure: numbers and strings only.
import { scaleLinear } from "d3-scale";
import type { DonutSegment, TickDonutData } from "@/components/charts/types";
import { fmtInt } from "@/lib/format";
import { LADDER, PALETTE } from "@/lib/tokens";

export const TICK_STROKE = 1.6;
export const R_INNER = 92;
export const R_OUTER = 120;
export const MAX_TICKS = 100;
export const LEADER_R = 124;
export const LABEL_R = 132;
/** Labels keep this many px from the frame edge and from the dial. */
export const EDGE_MARGIN = 6;
export const DIAL_GAP = 4;
export const TOTAL_SIZE = 22;
export const UNIT_SIZE = 7;
export const LABEL_SIZE = 7;
export const COUNT_SIZE = 8;
/** Labels on one side keep at least this many px between baselines. */
export const LABEL_GAP = 10;
/** Ticks enter one after another; the brief sets dots at 12ms. */
export const TICK_STAGGER_MS = 12;
export const LABEL_STAGGER_MS = 100;

export const TONE_COLOR: Record<DonutSegment["tone"], string> = {
  ink: LADDER[0],
  "gray-2": LADDER[1],
  "gray-3": LADDER[2],
  muted: LADDER[3],
  faint: LADDER[5],
  "gray-7": LADDER[6],
  accent: PALETTE.accent,
};
/** A second accent segment falls back to this step so the chart keeps one accent. */
const ACCENT_FALLBACK = LADDER[3];

export interface TickDonutOpts {
  /** Segment id that takes the accent; overrides the tone in the data. */
  hero?: string;
}

export interface DonutTick { x1: number; y1: number; x2: number; y2: number; angle: number; slot: number }
export interface DonutSegmentLayout {
  id: string;
  color: string;
  accent: boolean;
  count: number;
  ticks: DonutTick[];
  midAngle: number;
  side: "left" | "right";
  leader: { x1: number; y1: number; x2: number; y2: number };
  label: { x: number; y: number; text: string; anchor: "start" | "end" };
  countText: { x: number; y: number; text: string; anchor: "start" | "end" };
  delay: number;
}
export interface TickDonutLayout {
  W: number;
  H: number;
  cx: number;
  cy: number;
  slots: number;
  ticksTotal: number;
  /** True when every tick is one record. */
  oneTickPerRecord: boolean;
  segments: DonutSegmentLayout[];
  total: { x: number; y: number; text: string; delay: number };
  unit: { x: number; y: number; text: string };
  footnote: { x: number; y: number; text: string };
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
/** Rough Inter widths: spaced uppercase runs about 0.72em per glyph, bold digits about 0.65em. */
const labelWidth = (text: string): number => text.length * LABEL_SIZE * 0.72;
const countWidth = (text: string): number => text.length * COUNT_SIZE * 0.65;
const RAD = Math.PI / 180;
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [r2(cx + r * Math.sin(deg * RAD)), r2(cy - r * Math.cos(deg * RAD))];

/** Ticks per segment: exact counts when they fit in 100, else largest-remainder shares of 100. */
export function ticksPerSegment(counts: number[], total: number): number[] {
  const safe = counts.map((c) => Math.max(0, Math.round(c)));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum === 0) return safe.map(() => 0);
  if (Math.max(total, sum) <= MAX_TICKS) return safe;
  const raw = safe.map((c) => (c / sum) * MAX_TICKS);
  const floors = raw.map((v) => Math.floor(v));
  let left = MAX_TICKS - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    floors[o.i] += 1;
    left -= 1;
  }
  // A segment with records never disappears: it keeps one tick, taken from the largest segment.
  for (let i = 0; i < floors.length; i++) {
    if (safe[i] > 0 && floors[i] === 0) {
      const big = floors.indexOf(Math.max(...floors));
      if (floors[big] > 1) {
        floors[big] -= 1;
        floors[i] = 1;
      }
    }
  }
  return floors;
}

/** Push labels on one side apart until each pair is LABEL_GAP apart, staying inside [lo, hi]. */
function spread(ys: number[], lo: number, hi: number): number[] {
  const idx = ys.map((y, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = ys.slice();
  let prev = -Infinity;
  for (const i of idx) {
    out[i] = Math.max(out[i], prev + LABEL_GAP, lo);
    prev = out[i];
  }
  let next = Infinity;
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    out[i] = Math.min(out[i], next - LABEL_GAP, hi);
    next = out[i];
  }
  return out.map(r2);
}

export function layoutTickDonut(data: TickDonutData, W: number, H: number, opts: TickDonutOpts = {}): TickDonutLayout {
  const cx = W / 2;
  const cy = H / 2 - 4;
  const counts = data.segments.map((s) => s.count);
  const ticks = ticksPerSegment(counts, data.total);
  const ticksTotal = ticks.reduce((a, b) => a + b, 0);
  const oneTickPerRecord = ticksTotal === counts.reduce((a, b) => a + Math.max(0, Math.round(b)), 0);
  const live = ticks.filter((t) => t > 0).length;
  const slots = live > 1 ? ticksTotal + live : Math.max(1, ticksTotal);
  const angle = scaleLinear().domain([0, slots]).range([0, 360]);

  // One segment carries the accent: the hero by id, else the first with tone "accent".
  const heroId = opts.hero ?? data.segments.find((s) => s.tone === "accent")?.id ?? null;

  const segments: DonutSegmentLayout[] = [];
  let slot = 0;
  let tickIndex = 0;
  data.segments.forEach((s, j) => {
    const n = ticks[j];
    if (n <= 0) return;
    const accent = s.id === heroId;
    const color = accent ? PALETTE.accent : s.tone === "accent" ? ACCENT_FALLBACK : TONE_COLOR[s.tone];
    const first = slot;
    const segTicks: DonutTick[] = [];
    for (let k = 0; k < n; k++) {
      const a = r2(angle(slot + 0.5));
      const [x1, y1] = polar(cx, cy, R_INNER, a);
      const [x2, y2] = polar(cx, cy, R_OUTER, a);
      segTicks.push({ x1, y1, x2, y2, angle: a, slot });
      slot += 1;
      tickIndex += 1;
    }
    const midAngle = r2(angle((first + slot) / 2));
    slot += 1; // the empty tick between segments
    const side: "left" | "right" = Math.sin(midAngle * RAD) >= 0 ? "right" : "left";
    const [lx, ly] = polar(cx, cy, LEADER_R, midAngle);
    const [ax, ay] = polar(cx, cy, LABEL_R, midAngle);
    segments.push({
      id: s.id,
      color,
      accent,
      count: s.count,
      ticks: segTicks,
      midAngle,
      side,
      leader: { x1: lx, y1: ly, x2: ax, y2: ay },
      label: { x: ax, y: ay, text: s.label.toUpperCase(), anchor: side === "right" ? "start" : "end" },
      countText: { x: ax, y: ay, text: fmtInt(s.count), anchor: side === "right" ? "start" : "end" },
      delay: TICK_STAGGER_MS * tickIndex + LABEL_STAGGER_MS * j,
    });
  });

  // A label block that would leave the frame slides back inside, then moves up or down until the dial no longer
  // reaches it: the dial is narrower away from its horizontal middle, so a short vertical nudge frees the room.
  for (const s of segments) {
    const blockW = labelWidth(s.label.text) + 4 + countWidth(s.countText.text);
    let ax = s.label.x;
    let ay = s.label.y;
    if (s.side === "right" && ax + blockW > W - EDGE_MARGIN) ax = W - EDGE_MARGIN - blockW;
    if (s.side === "left" && ax - blockW < EDGE_MARGIN) ax = EDGE_MARGIN + blockW;
    const reach = (s.side === "right" ? ax - cx : cx - ax) - DIAL_GAP;
    if (reach < R_OUTER) {
      const dyMin = Math.sqrt(R_OUTER * R_OUTER - reach * reach);
      if (Math.abs(ay - cy) < dyMin) ay = cy + (ay >= cy ? dyMin : -dyMin);
    }
    s.label = { ...s.label, x: r2(ax), y: r2(ay) };
    s.countText = { ...s.countText, x: r2(ax), y: r2(ay) };
  }

  // Labels on each side spread apart vertically; the leader then follows the label.
  const lo = 12;
  const hi = H - 18;
  for (const side of ["left", "right"] as const) {
    const group = segments.filter((s) => s.side === side);
    const ys = spread(group.map((s) => s.label.y), lo, hi);
    group.forEach((s, i) => {
      const y = ys[i];
      const labelW = labelWidth(s.label.text);
      const countW = countWidth(s.countText.text);
      if (side === "right") {
        s.label = { ...s.label, y: r2(y + 2.5) };
        s.countText = { ...s.countText, x: r2(s.label.x + labelW + 4), y: r2(y + 2.8) };
        s.leader = { ...s.leader, x2: r2(s.label.x - 3), y2: y };
      } else {
        s.countText = { ...s.countText, y: r2(y + 2.8) };
        s.label = { ...s.label, x: r2(s.countText.x - countW - 4), y: r2(y + 2.5) };
        s.leader = { ...s.leader, x2: r2(s.countText.x + 3), y2: y };
      }
    });
  }

  const footText = oneTickPerRecord ? `${data.centerLabel} · 1 tick = 1 of ${fmtInt(data.total)}` : `${data.centerLabel} · 1 tick = 1% of ${fmtInt(data.total)}`;
  return {
    W,
    H,
    cx: r2(cx),
    cy: r2(cy),
    slots,
    ticksTotal,
    oneTickPerRecord,
    segments,
    total: { x: r2(cx), y: r2(cy + 5), text: fmtInt(data.total), delay: TICK_STAGGER_MS * ticksTotal },
    unit: { x: r2(cx), y: r2(cy + 17), text: data.unit.toUpperCase() },
    footnote: { x: 14, y: H - 8, text: footText },
  };
}
