// Tick donut (Lupi Basics F4): a dial of 100 ticks, or one tick per record when the total is 100 or less.
// Segments keep the data order and take the ladder color of their tone; one empty tick separates segments.
// Labels never sit on the dial. They form a key column at the right: one row per segment, in data order.
// Pure: numbers and strings only.
import { scaleLinear } from "d3-scale";
import type { DonutSegment, TickDonutData } from "@/components/charts/types";
import { fmtInt } from "@/lib/format";
import { FONT, LADDER, PALETTE } from "@/lib/tokens";

export const TICK_STROKE = 1.6;
export const R_INNER = 92;
export const R_OUTER = 120;
export const MAX_TICKS = 100;
export const LEADER_R = 124;
/** Text keeps this many px from the frame edge. */
export const EDGE_MARGIN = 6;
/** Gap between the dial and the key column. */
export const KEY_GAP = 12;
/** Key column width: half frame (W under 600) and wide frame. */
export const KEY_W_HALF = 118;
export const KEY_W_WIDE = 150;
/** Distance between key rows. */
export const KEY_PITCH = 13;
/** A leader ties a right-side segment to its key row only from this many ticks. */
export const LEADER_MIN_TICKS = 3;
/** Key labels are cut to this many characters; the full text goes in a title. */
export const LABEL_MAX_CHARS = 14;
export const TOTAL_SIZE = 22;
/** Every text in the donut is 8px or more, so the half frame stays above the 6.5px floor at 368px. */
export const UNIT_SIZE = 8;
export const LABEL_SIZE = FONT.keyLabel.size;
export const COUNT_SIZE = FONT.keyCount.size;
export const FOOTNOTE_SIZE = 8;
/** Ticks enter one after another; the brief sets dots at 12ms. */
export const TICK_STAGGER_MS = 12;
export const LABEL_STAGGER_MS = 100;
export const FOOTNOTE_PER_RECORD = "1 tick = 1 item";

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
  /** Dotted tie from the dial to the key row. Drawn only when hasLeader. */
  leader: { x1: number; y1: number; x2: number; y2: number };
  hasLeader: boolean;
  /** Short vertical line in the segment color at the start of the key row. */
  swatch: { x: number; y1: number; y2: number };
  /** Key label, cut to LABEL_MAX_CHARS; full carries the whole text for a title. */
  label: { x: number; y: number; text: string; full: string; anchor: "start" | "end" };
  countText: { x: number; y: number; text: string; anchor: "start" | "end" };
  delay: number;
}
export interface TickDonutLayout {
  W: number;
  H: number;
  cx: number;
  cy: number;
  /** Left edge of the key column. */
  keyX: number;
  keyW: number;
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
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const RAD = Math.PI / 180;
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [r2(cx + r * Math.sin(deg * RAD)), r2(cy - r * Math.cos(deg * RAD))];

/** Key column width for a frame width. */
export function keyWidth(W: number): number {
  return W < 600 ? KEY_W_HALF : KEY_W_WIDE;
}

/** A key label cut to LABEL_MAX_CHARS with an ellipsis. */
export function truncateLabel(text: string, max = LABEL_MAX_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Footnote: the unit of one tick. */
export function donutFootnote(oneTickPerRecord: boolean, total: number): string {
  return oneTickPerRecord ? FOOTNOTE_PER_RECORD : `1 tick = 1% of ${fmtInt(total)}`;
}

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

export function layoutTickDonut(data: TickDonutData, W: number, H: number, opts: TickDonutOpts = {}): TickDonutLayout {
  const keyW = keyWidth(W);
  const keyX = W - keyW;
  const cx = (W - keyW - KEY_GAP) / 2;
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

  // The key column sits level with the dial's centre and stays inside the frame.
  const n = live;
  const keyTop = clamp(cy - (n * KEY_PITCH) / 2 + 4, 12, H - 18 - n * KEY_PITCH);
  const countX = W - EDGE_MARGIN;

  const segments: DonutSegmentLayout[] = [];
  let slot = 0;
  let tickIndex = 0;
  let row = 0;
  data.segments.forEach((s, j) => {
    const count = ticks[j];
    if (count <= 0) return;
    const accent = s.id === heroId;
    const color = accent ? PALETTE.accent : s.tone === "accent" ? ACCENT_FALLBACK : TONE_COLOR[s.tone];
    const first = slot;
    const segTicks: DonutTick[] = [];
    for (let k = 0; k < count; k++) {
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
    const y = r2(keyTop + row * KEY_PITCH);
    row += 1;
    const [lx, ly] = polar(cx, cy, LEADER_R, midAngle);
    const full = s.label.toUpperCase();
    segments.push({
      id: s.id,
      color,
      accent,
      count: s.count,
      ticks: segTicks,
      midAngle,
      side,
      leader: { x1: lx, y1: ly, x2: r2(keyX - 5), y2: y },
      hasLeader: side === "right" && segTicks.length >= LEADER_MIN_TICKS,
      swatch: { x: keyX, y1: r2(y - 3), y2: r2(y + 5) },
      label: { x: keyX + 8, y: r2(y + 3), text: truncateLabel(full), full, anchor: "start" },
      countText: { x: countX, y: r2(y + 3), text: fmtInt(s.count), anchor: "end" },
      delay: TICK_STAGGER_MS * tickIndex + LABEL_STAGGER_MS * j,
    });
  });

  return {
    W,
    H,
    cx: r2(cx),
    cy: r2(cy),
    keyX,
    keyW,
    slots,
    ticksTotal,
    oneTickPerRecord,
    segments,
    total: { x: r2(cx), y: r2(cy + 5), text: fmtInt(data.total), delay: TICK_STAGGER_MS * ticksTotal },
    unit: { x: r2(cx), y: r2(cy + 17), text: data.unit.toUpperCase() },
    footnote: { x: 14, y: H - 8, text: donutFootnote(oneTickPerRecord, data.total) },
  };
}
