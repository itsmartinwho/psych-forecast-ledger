import { addMonths, monthsBetween, daysBetween } from "@/lib/dates";
import type { Bin, Item, Outcome, Thresholds, MarketRef, Lexicon } from "@/lib/data/schema";
import { brier } from "./brier";
import type { Cluster, ItemState, ScoredItem, StatementPart } from "./model";

export type BinMap = Record<Bin, number>;

export function binMapOf(lexicon: Lexicon): BinMap {
  const m = {} as BinMap;
  for (const b of lexicon.bins) m[b.bin] = b.p;
  return m;
}

export function nearestBin(p: number, map: BinMap): Bin {
  let best: Bin = "C", dist = Infinity;
  for (const k of Object.keys(map) as Bin[]) {
    const d = Math.abs(map[k] - p);
    if (d < dist) { dist = d; best = k; }
  }
  return best;
}

export function effectiveDeadline(item: Item, undatedMonths: number): string {
  return item.panel === "headline" && item.deadline ? item.deadline : addMonths(item.statement_date, undatedMonths);
}

/** p(E) for one statement under a bin map; stated numbers override the map. */
export function pUnderMap(part: StatementPart, map: BinMap): number {
  if (part.p_stated !== null) return part.p_stated;
  if (!part.bin) return part.p;
  const v = map[part.bin];
  return part.denial ? 1 - v : v;
}

/** Time-weighted mean: each value stands until the next statement or the deadline. */
export function timeWeightedP(parts: { date: string; p: number }[], deadline: string): number {
  const sorted = [...parts].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let wsum = 0, psum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1].date : deadline;
    const w = Math.max(1, daysBetween(sorted[i].date, next));
    wsum += w; psum += w * sorted[i].p;
  }
  return wsum > 0 ? psum / wsum : sorted[0]?.p ?? 0.5;
}

/** Last market quote up to `lookbackDays` before the statement, on a question whose deadline is within tolerance. */
export function marketPriceAt(ref: MarketRef | undefined, statementDate: string, deadline: string, th: Thresholds): number | null {
  if (!ref) return null;
  if (ref.deadline) {
    const gap = Math.abs(monthsBetween(ref.deadline, deadline));
    if (gap > th.market_deadline_tolerance_quarters * 3) return null;
  }
  const from = addMonths(statementDate, 0);
  let best: { date: string; p: number } | null = null;
  for (const q of ref.prices) {
    if (q.date > from) continue;
    if (daysBetween(q.date, statementDate) > th.market_lookback_days) continue;
    if (!best || q.date > best.date) best = q;
  }
  return best ? best.p : null;
}

export interface ResolveResult { state: ItemState; void_reason: ScoredItem["void_reason"]; o: 0 | 1 | null; event_date: string | null; timing_months: number | null }

/** Rule 8: an item enters the score only after its deadline; TRUE if the event occurred on or before it. */
export function resolveState(deadline: string, asOf: string, outcome: Outcome | undefined, condition: Outcome | undefined | null, conditional: boolean): ResolveResult {
  const none: ResolveResult = { state: "pending", void_reason: null, o: null, event_date: outcome?.state === "occurred" ? outcome.date : null, timing_months: null };
  if (conditional) {
    if (condition === undefined) return { ...none, state: deadline > asOf ? "pending" : "unresolved" };
    if (condition && condition.state === "occurred" && condition.date && condition.date <= deadline) {
      // condition met: fall through to B
    } else if (condition && condition.state === "not_occurred" && condition.checked_through >= deadline) {
      return { ...none, state: "void", void_reason: "CONDITION_UNMET" };
    } else if (condition && condition.state === "unresolvable") {
      return { ...none, state: "void", void_reason: "UNRESOLVABLE" };
    } else if (condition && condition.state === "occurred" && condition.date && condition.date > deadline) {
      return { ...none, state: deadline > asOf ? "pending" : "void", void_reason: deadline > asOf ? null : "CONDITION_UNMET" };
    } else {
      return { ...none, state: deadline > asOf ? "pending" : "unresolved" };
    }
  }
  if (deadline > asOf) {
    const known = outcome?.state === "occurred" && outcome.date !== null && outcome.date <= deadline;
    return { ...none, state: known ? "known_true" : "pending" };
  }
  if (!outcome) return { ...none, state: "unresolved" };
  if (outcome.state === "unresolvable") return { ...none, state: "void", void_reason: "UNRESOLVABLE" };
  if (outcome.state === "occurred") {
    const happened = outcome.date !== null && outcome.date <= deadline;
    return { ...none, state: happened ? "true" : "false", o: happened ? 1 : 0, timing_months: happened ? null : monthsBetween(deadline, outcome.date!) };
  }
  // not_occurred
  if (outcome.checked_through >= deadline) return { ...none, state: "false", o: 0 };
  return { ...none, state: "unresolved" };
}

export interface BuildOptions {
  asOf: string;
  thresholds: Thresholds;
  map: BinMap;                      // bin map in force (lexicon or a sensitivity map)
  undatedMonths?: number;
  useMapForP?: boolean;             // false: use recorded p; true: recompute from bins under `map`
  panel?: "headline" | "undated" | "all";
}

/** Merge admitted statements into scored items (rule 7) and resolve each against the registry (rule 8). */
export function buildScoredItems(
  items: Item[],
  outcomes: Map<string, Outcome>,
  marketRefs: Map<string, MarketRef>,
  opts: BuildOptions,
): ScoredItem[] {
  const undatedMonths = opts.undatedMonths ?? opts.thresholds.undated_window_months;
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    if (opts.panel && opts.panel !== "all" && it.panel !== opts.panel) continue;
    const d = effectiveDeadline(it, undatedMonths);
    const key = `${it.forecaster}|${it.event_id}|${d}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
  }
  const out: ScoredItem[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => (a.statement_date < b.statement_date ? -1 : a.statement_date > b.statement_date ? 1 : a.id < b.id ? -1 : 1));
    const first = sorted[0];
    const deadline = effectiveDeadline(first, undatedMonths);
    const parts: StatementPart[] = sorted.map((s) => ({
      id: s.id, date: s.statement_date, bin: s.bin,
      p_stated: s.p_origin === "stated" ? s.p : null,
      denial: s.tags.includes("denial"), p: s.p,
    }));
    const pParts = parts.map((pt) => ({ date: pt.date, p: opts.useMapForP ? pUnderMap(pt, opts.map) : pt.p }));
    const p = Math.min(opts.thresholds.probability_clamp[1], Math.max(opts.thresholds.probability_clamp[0], timeWeightedP(pParts, deadline)));
    const origins = new Set(sorted.map((s) => s.p_origin));
    const conditional = first.condition_event_id !== null;
    const res = resolveState(deadline, opts.asOf, outcomes.get(first.event_id), conditional ? outcomes.get(first.condition_event_id!) : null, conditional);
    const marketRef = first.market_ref_id ? marketRefs.get(first.market_ref_id) : undefined;
    const tags = [...new Set(sorted.flatMap((s) => s.tags))];
    out.push({
      key, forecaster: first.forecaster, event_id: first.event_id, area: first.area, panel: first.panel, deadline,
      statement_ids: sorted.map((s) => s.id), first_date: first.statement_date, last_date: sorted[sorted.length - 1].statement_date,
      parts, p, p_origin: origins.size > 1 ? "mixed" : (first.p_origin as "stated" | "lexicon"),
      bin: first.bin ?? nearestBin(first.p, opts.map),
      base_p: first.base_rate ? first.base_rate.p : null,
      market_p: marketPriceAt(marketRef, first.statement_date, deadline, opts.thresholds),
      affiliated: tags.includes("affiliated"), conditional, tags,
      state: res.state, void_reason: res.void_reason, o: res.o,
      brier: res.o === null ? null : brier(p, res.o),
      event_date: res.event_date, timing_months: res.timing_months,
    });
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}

export function clusterize(items: ScoredItem[]): Cluster[] {
  const groups = new Map<string, ScoredItem[]>();
  for (const it of items) {
    const id = `${it.forecaster}|${it.event_id}`;
    (groups.get(id) ?? groups.set(id, []).get(id)!).push(it);
  }
  const clusters: Cluster[] = [];
  for (const [id, its] of groups) {
    const resolved = its.filter((i) => i.state === "true" || i.state === "false");
    const b = resolved.length ? resolved.reduce((s, i) => s + (i.brier ?? 0), 0) / resolved.length : null;
    clusters.push({ id, forecaster: its[0].forecaster, event_id: its[0].event_id, area: its[0].area, items: its, resolved, brier: b, deadlines: new Set(its.map((i) => i.deadline)).size, affiliated: its.some((i) => i.affiliated) });
  }
  return clusters.sort((a, b) => (a.id < b.id ? -1 : 1));
}
