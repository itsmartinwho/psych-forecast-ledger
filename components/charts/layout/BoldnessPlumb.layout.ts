// Boldness plumb scatter (Lupi Basics F8): x is how far a forecaster's probabilities sit from the base rate,
// y is the Brier score, and a thin plumb ties every forecaster dot to the y rule (coin flip by default).
// Pure geometry: the chart component only draws what comes back. Faint tiny dots show single items when given.
import { scaleLinear } from "d3-scale";
import type { BoldnessData } from "@/components/charts/types";
import { fmtBrier } from "@/lib/format";
import { FONT, ladderForBrier } from "@/lib/tokens";

export const POINT_RADIUS = 4.6;
export const ITEM_RADIUS = 1.1;
export const PLUMB_WIDTH = 0.55;
export const DEFAULT_Y_RULE = 0.25;
/** Uppercase Inter at 800 is close to 0.7em per character. */
const CHAR_EM = 0.7;

export interface BoldnessOpts {
  /** Point id that takes the accent; defaults to the first point flagged hero. */
  hero?: string;
  floor?: number;
}

export interface BoldnessPointLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  hero: boolean;
  /** A ladder hex from the Brier score, or "currentColor" on the hero so its group carries the accent once. */
  tone: string;
  plumb: { y1: number; y2: number } | null;
  title: string;
  delay: number;
}
export interface BoldnessLabelLayout { id: string; x: number; y: number; anchor: "start" | "end"; text: string; hero: boolean }

export interface BoldnessLayout {
  W: number;
  H: number;
  floor: number;
  plot: { x0: number; x1: number; y0: number; y1: number };
  baseline: { y: number; labelSize: number; ticks: { x: number; label: string }[] };
  yGuides: { y: number; label: string; labelX: number; x1: number; x2: number }[];
  yRule: { y: number; x1: number; x2: number; value: number; label: string; labelX: number; labelY: number };
  yLabel: { x: number; y: number; text: string };
  floorLabels: { hedged: { x: number; y: number; text: string }; bold: { x: number; y: number; text: string }; xLabel: { x: number; y: number; text: string } };
  items: { x: number; y: number; r: number; delay: number }[];
  points: BoldnessPointLayout[];
  labels: BoldnessLabelLayout[];
  labelSize: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const axisTick = (v: number): string => (v === 0 ? "0" : String(r2(v)).replace(/^0\./, "."));

export function layoutBoldnessPlumb(data: BoldnessData, W: number, H: number, opts: BoldnessOpts = {}): BoldnessLayout {
  const half = W < 600;
  const floor = opts.floor ?? (half ? FONT.floorHalf : FONT.floorWide);
  const labelSize = Math.max(floor, half ? 7.5 : 7);
  const margin = half ? { l: 36, r: 16, t: 30, b: 44 } : { l: 48, r: 28, t: 28, b: 40 };
  const x0 = margin.l;
  const x1 = W - margin.r;
  const y0 = margin.t;
  const y1 = H - margin.b;
  const xDom = data.xDomain ?? [0, 0.5];
  const yDom = data.yDomain ?? [0, 0.8];
  const xs = scaleLinear().domain(xDom).range([x0, x1]);
  const ys = scaleLinear().domain(yDom).range([y1, y0]);
  const xOf = (v: number): number => r2(xs(clamp(v, xDom[0], xDom[1])));
  const yOf = (v: number): number => r2(ys(clamp(v, yDom[0], yDom[1])));

  const baselineTicks = xs.ticks(5).map((v) => ({ x: xOf(v), label: axisTick(v) }));
  // Horizontal guides replace a y spine: one hairline per major step, labelled at the left, none at zero.
  const yGuides = ys
    .ticks(4)
    .filter((v) => v > yDom[0])
    .map((v) => ({ y: yOf(v), label: axisTick(v), labelX: x0 - 5, x1: x0, x2: x1 }));

  const ruleValue = data.yRule ?? DEFAULT_Y_RULE;
  const ruleY = yOf(ruleValue);
  const yRule = {
    y: ruleY,
    x1: x0,
    x2: x1,
    value: ruleValue,
    label: ruleValue === DEFAULT_Y_RULE ? `COIN FLIP ${fmtBrier(ruleValue)}` : `RULE ${fmtBrier(ruleValue)}`,
    labelX: x1,
    labelY: r2(ruleY - 3),
  };

  const heroId = opts.hero ?? data.points.find((p) => p.hero)?.id ?? null;
  let heroTaken = false;
  let itemIndex = 0;
  const items = data.points.flatMap((p) =>
    (p.items ?? []).map((it) => ({ x: xOf(it.x), y: yOf(it.y), r: ITEM_RADIUS, delay: itemIndex++ * 4 })),
  );

  // Hero draws last so it sits on top of the others.
  const ordered = data.points.map((p, i) => ({ p, i })).sort((a, b) => Number(a.p.id === heroId) - Number(b.p.id === heroId) || a.i - b.i);
  const points: BoldnessPointLayout[] = ordered.map(({ p, i }) => {
    const hero = !heroTaken && heroId !== null && p.id === heroId;
    if (hero) heroTaken = true;
    const x = xOf(p.x);
    const y = yOf(p.y);
    const r = POINT_RADIUS;
    // The plumb starts at the dot's edge on the side facing the rule and stops at the rule.
    const gap = ruleY - y;
    const plumb = Math.abs(gap) > r + 0.5 ? { y1: r2(y + Math.sign(gap) * r), y2: ruleY } : null;
    return {
      id: p.id,
      label: p.label,
      x,
      y,
      r,
      hero,
      tone: hero ? "currentColor" : ladderForBrier(p.y),
      plumb,
      title: `${p.label} · ${data.xLabel} ${r2(p.x)} · Brier ${fmtBrier(p.y)} · n ${p.n}`,
      delay: i * 12,
    };
  });

  // Labels go to the hero, then the best and then the worst of the rest, each only where it does not collide.
  // rest sorts by SVG y ascending, so rest[0] is the highest Brier (worst) and the last entry the lowest (best).
  const rest = points.filter((p) => !p.hero).sort((a, b) => a.y - b.y);
  const wanted = [...points.filter((p) => p.hero), ...(rest.length ? [rest[rest.length - 1]] : []), ...(rest.length > 1 ? [rest[0]] : [])];
  const labels: BoldnessLabelLayout[] = [];
  const boxes: { a: number; b: number; top: number; bottom: number }[] = [];
  for (const p of wanted) {
    const text = `${p.label.toUpperCase()} ${fmtBrier(data.points.find((d) => d.id === p.id)?.y ?? null)}`;
    const w = text.length * labelSize * CHAR_EM;
    const flip = p.x + p.r + 4 + w > x1;
    const lx = r2(flip ? p.x - p.r - 4 : p.x + p.r + 4);
    const a = flip ? lx - w : lx;
    const candidates = [p.y + labelSize / 3, p.y - p.r - 3, p.y + p.r + labelSize];
    let placed = false;
    for (const ly of candidates) {
      const box = { a, b: a + w, top: ly - labelSize, bottom: ly };
      if (boxes.some((o) => box.a < o.b && o.a < box.b && box.top < o.bottom && o.top < box.bottom)) continue;
      boxes.push(box);
      labels.push({ id: p.id, x: lx, y: r2(ly), anchor: flip ? "end" : "start", text, hero: p.hero });
      placed = true;
      break;
    }
    if (!placed) continue;
  }

  const floorY = H - 6;
  return {
    W,
    H,
    floor,
    plot: { x0, x1, y0, y1 },
    baseline: { y: y1, labelSize: 7.5, ticks: baselineTicks },
    yGuides,
    yRule,
    yLabel: { x: 8, y: 13, text: data.yLabel.toUpperCase() },
    floorLabels: {
      hedged: { x: x0, y: floorY, text: "HEDGED" },
      bold: { x: x1, y: floorY, text: "BOLD" },
      xLabel: { x: r2((x0 + x1) / 2), y: floorY, text: data.xLabel.toUpperCase() },
    },
    items,
    points,
    labels,
    labelSize,
  };
}
