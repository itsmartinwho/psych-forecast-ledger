// Design tokens (lieflat Mono ladder plus one Wire accent). Source of truth for SVG attributes;
// app/globals.css mirrors these values in @theme and a test asserts parity.
export const PALETTE = {
  paper: "#F0EFEB",
  ink: "#1C1C1A",
  muted: "#8F8E88",
  faint: "#C6C5BF",
  grid: "#DEDDD6",
  hairline: "#E3E2DB",
  accent: "#F5572F",
  darkCard: "#1C1C1A",
  darkInk: "#F0EFEB",
  darkGrid: "#2E2D29",
} as const;

/** Seven-step gray ladder, darkest = most important. */
export const LADDER = ["#1C1C1A", "#4A4944", "#6A6963", "#8F8E88", "#B0AFA9", "#C6C5BF", "#D8D7D1"] as const;

export const FONT = {
  family: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  h2: { size: 16.5, weight: 700, tracking: "-0.02em" },
  h2Big: { size: 19, weight: 700, tracking: "-0.02em" },
  sub: { size: 11.5, weight: 400 },
  src: { size: 9.5, weight: 500, tracking: "0.08em" },
  axis: { size: 9.5, weight: 600 },
  value: { weight: 800, min: 9, max: 11 },
  rowLabel: { size: 8, weight: 700 },
  footnote: { size: 7, weight: 600, tracking: "0.12em" },
  /** Donut key column: one row per segment. */
  keyLabel: { size: 8, weight: 600 },
  keyCount: { size: 9, weight: 800 },
  floorHalf: 6.5,
  floorWide: 5.5,
} as const;

export const MOTION = {
  entryMs: 900,
  entryBigMs: 1200,
  ease: "cubic-bezier(0.165, 0.84, 0.44, 1)", // quarticOut
  staggerDotMs: 10,
  staggerBarMs: 100,
  observerThreshold: 0.3,
} as const;

export const STROKE = {
  hairline: 0.6,
  hairlineMax: 0.9,
  baseline: 0.8,
  whisker: 0.8,
  path: 1,
  zero: 1.5,
} as const;

/** Chart frames: half card 400x320, wide card 800x300. */
export const FRAME = { half: { w: 400, h: 320 }, wide: { w: 800, h: 300 } } as const;

/** mulberry32: small seeded PRNG shared by chart jitter and the bootstrap. Never Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit hash of a string, for per-record jitter seeds. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Radius from a count: area encodes the value (never radius from raw value). */
export function sqrtRadius(value: number, max: number, rMax: number, rMin = 1.2): number {
  if (max <= 0 || value <= 0) return rMin;
  return Math.max(rMin, rMax * Math.sqrt(value / max));
}

/** Ladder step for a Brier score: darkest = best. Five steps across [0, 0.5]. */
export function ladderForBrier(b: number | null): string {
  if (b === null || Number.isNaN(b)) return LADDER[6];
  const idx = Math.min(4, Math.max(0, Math.floor(b / 0.1)));
  return LADDER[idx];
}

export const HALO = { stroke: PALETTE.paper, width: 3 } as const;
