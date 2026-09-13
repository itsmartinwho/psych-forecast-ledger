// Rung bars (Lupi Basics F1): one horizontal ladder per group and one rung per unit of count, so a bar is countable.
// Pure: numbers and strings only. Rung jitter comes from the seeded PRNG keyed on the group id, never from a clock.
import { scaleLinear } from "d3-scale";
import type { RungBarsData } from "@/components/charts/types";
import { fmtBrier, fmtInt } from "@/lib/format";
import { LADDER, PALETTE, hashSeed, mulberry32 } from "@/lib/tokens";

/** A rung is a 0.9px hairline; its length wobbles inside a 3px band and its opacity inside 0.75 to 1. */
export const RUNG_STROKE = 0.9;
export const RUNG_LENGTH = 9;
export const RUNG_JITTER = 3;
export const RUNG_OPACITY_MIN = 0.75;
/** A faint counting dot sits under every fifth rung. */
export const DOT_EVERY = 5;
export const DOT_RADIUS = 0.7;
/** Groups below the minimum n are drawn faint and carry no value. */
export const FAINT_OPACITY = 0.4;
/** Ladders enter one after another; the brief sets bars at 100ms. */
export const BAR_STAGGER_MS = 100;
export const LABEL_SIZE = 8;
export const COUNT_SIZE = 9;
export const VALUE_SIZE = 7.5;
const PITCH_MIN = 1.5;
const PITCH_MAX = 4.5;
const ROW_PITCH_MAX = 36;

export interface RungBarsOpts {
  /** Group id that takes the accent; falls back to the first group flagged hero. */
  hero?: string;
}

export interface TextPrimitive { x: number; y: number; text: string; size: number; anchor: "start" | "middle" | "end" }
export interface RungPrimitive { x: number; y1: number; y2: number; opacity: number }
export interface DotPrimitive { cx: number; cy: number; r: number }

export interface RungRowLayout {
  id: string;
  hero: boolean;
  faint: boolean;
  /** Whole-row opacity: 1, or FAINT_OPACITY for a group below the minimum n. */
  opacity: number;
  /** Rung and count color: the accent for the hero, a ladder step otherwise. */
  color: string;
  labelColor: string;
  delay: number;
  href: string | null;
  label: TextPrimitive;
  rungs: RungPrimitive[];
  dots: DotPrimitive[];
  count: TextPrimitive;
  value: TextPrimitive | null;
}

export interface RungBarsLayout {
  W: number;
  H: number;
  ladder: { x0: number; x1: number; pitch: number; maxCount: number };
  rows: RungRowLayout[];
  footnote: TextPrimitive;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** Rough Inter width for an uppercase or numeric run; only used to place labels, never to clip. */
const textWidth = (text: string, size: number): number => text.length * size * 0.62;

export function layoutAreaRungBars(data: RungBarsData, W: number, H: number, opts: RungBarsOpts = {}): RungBarsLayout {
  const groups = data.groups;
  const heroId = opts.hero ?? groups.find((g) => g.hero)?.id ?? null;
  const left = 14;
  const right = 14;
  const top = 12;
  const bottom = 24;
  // Reserve after the ladder for the count and the small value label.
  const reserve = 58;
  const widestLabel = groups.reduce((w, g) => Math.max(w, textWidth(g.label.toUpperCase(), LABEL_SIZE)), 0);
  const labelW = Math.min(W * 0.34, widestLabel + 12);
  const x0 = left + labelW;
  const x1 = W - right - reserve;
  const maxCount = Math.max(1, ...groups.map((g) => g.count));
  const pitch = clamp((x1 - x0) / maxCount, PITCH_MIN, PITCH_MAX);
  const x = scaleLinear().domain([0, maxCount]).range([x0, x0 + maxCount * pitch]);
  const n = Math.max(1, groups.length);
  const rowPitch = Math.min(ROW_PITCH_MAX, (H - top - bottom) / n);
  // With few rows the block sits in the middle of the frame instead of hugging the title.
  const blockTop = top + (H - top - bottom - rowPitch * n) / 2;

  const rows: RungRowLayout[] = groups.map((g, i) => {
    const hero = g.id === heroId;
    const faint = Boolean(g.faint);
    const rowY = blockTop + rowPitch * (i + 0.5);
    const rnd = mulberry32(hashSeed(g.id));
    const rungs: RungPrimitive[] = [];
    const dots: DotPrimitive[] = [];
    for (let k = 0; k < g.count; k++) {
      const len = RUNG_LENGTH + (rnd() - 0.5) * RUNG_JITTER;
      const opacity = RUNG_OPACITY_MIN + rnd() * (1 - RUNG_OPACITY_MIN);
      const rx = r2(x(k + 0.5));
      rungs.push({ x: rx, y1: r2(rowY - len / 2), y2: r2(rowY + len / 2), opacity: r2(opacity) });
      if ((k + 1) % DOT_EVERY === 0) dots.push({ cx: rx, cy: r2(rowY + RUNG_LENGTH / 2 + 3), r: DOT_RADIUS });
    }
    const countText = fmtInt(g.count);
    const countX = r2(x(g.count) + 6);
    const count: TextPrimitive = { x: countX, y: r2(rowY + 3.2), text: countText, size: COUNT_SIZE, anchor: "start" };
    const showValue = !faint && g.value !== null && g.value !== undefined && !Number.isNaN(g.value);
    const value: TextPrimitive | null = showValue
      ? { x: r2(countX + textWidth(countText, COUNT_SIZE) + 5), y: r2(rowY + 3), text: fmtBrier(g.value), size: VALUE_SIZE, anchor: "start" }
      : null;
    return {
      id: g.id,
      hero,
      faint,
      opacity: faint ? FAINT_OPACITY : 1,
      color: hero ? PALETTE.accent : faint ? LADDER[3] : LADDER[1],
      labelColor: hero ? LADDER[0] : LADDER[2],
      delay: i * BAR_STAGGER_MS,
      href: g.href ?? null,
      label: { x: left, y: r2(rowY + 3), text: g.label.toUpperCase(), size: LABEL_SIZE, anchor: "start" },
      rungs,
      dots,
      count,
      value,
    };
  });

  const footText = [data.unit, data.valueLabel ? `${data.valueLabel} after the count` : null].filter(Boolean).join(" · ");
  return {
    W,
    H,
    ladder: { x0: r2(x0), x1: r2(x1), pitch: r2(pitch), maxCount },
    rows,
    footnote: { x: left, y: H - 8, text: footText, size: 7, anchor: "start" },
  };
}
