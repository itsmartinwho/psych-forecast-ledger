// Display minimums: the n a chart needs before it renders. Rule minimums come from thresholds.json;
// the display-only minimums live here. Pure: no I/O, no clock.
import T from "@/data/rules/thresholds.json";
import type { ForecasterScores, ScoreSnapshot } from "@/lib/score";

export const DISPLAY = { over_time_min_periods: 3, matrix_min_cells: 2, boldness_min_forecasters: 2 } as const;

export type LockKey = "calibration" | "over_time" | "matrix" | "boldness" | "timing" | "sensitivity";

export const LOCK_KEYS: readonly LockKey[] = ["calibration", "over_time", "matrix", "boldness", "timing", "sensitivity"] as const;

export interface LockState {
  key: LockKey;
  /** The chart name, a noun phrase. */
  name: string;
  /** Glossary term the row name links to, when one exists. */
  term?: string;
  now: number;
  need: number;
  /** Uppercased by CSS after "{now} of {need}". */
  unit: string;
  shown: boolean;
  href: string;
}

export interface LockContext { f?: ForecasterScores; snap: ScoreSnapshot }

const METRICS = "/methodology#metrics";

function nowNeed(key: LockKey, ctx: LockContext): { name: string; term?: string; now: number; need: number; unit: string; href: string } {
  const f = ctx.f;
  switch (key) {
    case "calibration":
      return { name: "Calibration", term: "calibration", now: f?.headline.n_clusters ?? 0, need: T.calibration_min_clusters, unit: "resolved events", href: METRICS };
    case "over_time":
      return { name: "Brier over time", now: f?.over_time.length ?? 0, need: DISPLAY.over_time_min_periods, unit: "quarters with resolutions", href: METRICS };
    case "matrix":
      return { name: "Forecasters by area", now: ctx.snap.matrix.filter((c) => c.shown).length, need: DISPLAY.matrix_min_cells, unit: `cells with ${T.calibration_min_per_bin} resolved events`, href: METRICS };
    case "boldness":
      return { name: "Boldness and accuracy", now: ctx.snap.leaderboard.filter((r) => r.kind === "person" && r.brier !== null).length, need: DISPLAY.boldness_min_forecasters, unit: "forecasters with a score", href: METRICS };
    case "timing":
      return { name: "Timing", term: "timing", now: f?.timing.n ?? 0, need: T.timing_min, unit: "false claims that later came true", href: METRICS };
    case "sensitivity":
      return { name: "Sensitivity", term: "sensitivity panel", now: f?.headline.n_clusters ?? 0, need: T.min_clusters_headline, unit: "resolved events", href: "/methodology#sensitivity" };
  }
}

/** Whether one chart shows, and the progress toward its minimum when it does not. */
export function lockState(key: LockKey, ctx: LockContext): LockState {
  const s = nowNeed(key, ctx);
  return { key, ...s, shown: s.now >= s.need };
}

/** The lock states of several charts, in the order given. */
export function lockStates(keys: readonly LockKey[], ctx: LockContext): LockState[] {
  return keys.map((k) => lockState(k, ctx));
}

/** The charts among `keys` that do not show yet, for the Waiting for data card. */
export function lockedRows(keys: readonly LockKey[], ctx: LockContext): LockState[] {
  return lockStates(keys, ctx).filter((s) => !s.shown);
}
