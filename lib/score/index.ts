import type { AreaSlug, Dataset, Item, Statement } from "@/lib/data/schema";
import { agreement, type AgreementReport } from "./agreement";
import { binMapOf, buildScoredItems, type BinMap } from "./items";
import { leaderboard, matrix, type LeaderboardRow, type MatrixCell } from "./leaderboard";
import type { ForecasterScores, ScoredItem } from "./model";
import { computePanel } from "./panel";
import { pairwise, sharedEvents, type PairwiseRow, type SharedEventRow } from "./shared";
import { boldness, byArea, calibrationReport, composition, overTime, sensitivity, timingReport } from "./summary";

export * from "./model";
export * from "./items";
export * from "./panel";
export * from "./brier";
export * from "./wilson";
export * from "./bootstrap";
export * from "./calibration";
export * from "./kappa";
export * from "./leaderboard";
export * from "./shared";
export * from "./agreement";
export * from "./summary";

export interface StatusCounts { true: number; false: number; pending: number; known_true: number; void: number; unresolved: number; not_admitted: number; undated: number }

export interface ScoreSnapshot {
  as_of: string;
  rules_version: string;
  seed: number;
  forecasters: Record<string, ForecasterScores>;
  leaderboard: LeaderboardRow[];
  matrix: MatrixCell[];
  shared_events: SharedEventRow[];
  pairwise: PairwiseRow[];
  status: Record<string, StatusCounts>;      // per forecaster and "all"
  agreement: AgreementReport;
  items: ScoredItem[];                        // every scored item (headline and undated), the ledger's scored view
  events_with_items: Record<string, number>;  // registry event id -> number of items citing it
}

export function computeScores(ds: Dataset): ScoreSnapshot {
  const th = ds.thresholds;
  const asOf = ds.version.as_of;
  const seed = th.bootstrap_seed;
  const map = binMapOf(ds.lexicon);
  const outcomes = new Map(ds.outcomes.map((o) => [o.event_id, o]));
  const marketRefs = new Map(ds.market_refs.map((m) => [m.id, m]));
  const areas = ds.areas.map((a) => a.slug);

  const build = (items: Item[], opts: { map?: BinMap; undatedMonths?: number; useMapForP?: boolean; panel: "dated" | "undated" | "all" }) =>
    buildScoredItems(items, outcomes, marketRefs, { asOf, thresholds: th, map: opts.map ?? map, undatedMonths: opts.undatedMonths, useMapForP: opts.useMapForP, panel: opts.panel });

  const allScored = build(ds.items, { panel: "all" });
  const forecasters: Record<string, ForecasterScores> = {};
  const status: Record<string, StatusCounts> = {};
  const countStatus = (scored: ScoredItem[], statements: Statement[], items: Item[]): StatusCounts => ({
    true: scored.filter((i) => i.state === "true").length,
    false: scored.filter((i) => i.state === "false").length,
    pending: scored.filter((i) => i.state === "pending").length,
    known_true: scored.filter((i) => i.state === "known_true").length,
    void: scored.filter((i) => i.state === "void").length + statements.filter((s) => s.status === "void").length,
    unresolved: scored.filter((i) => i.state === "unresolved").length,
    not_admitted: statements.filter((s) => s.status === "not_admitted").length,
    undated: items.filter((i) => i.panel === "undated").length,
  });

  for (const f of ds.forecasters) {
    const items = ds.items.filter((i) => i.forecaster === f.slug);
    const statements = ds.statements.filter((s) => s.forecaster === f.slug);
    // rules 1.1.0: the headline scores every admitted item; dated and undated are views of the same panel
    const scored = allScored.filter((i) => i.forecaster === f.slug);
    const dated = scored.filter((i) => i.panel === "dated");
    const undated = scored.filter((i) => i.panel === "undated");
    const headlinePanel = computePanel(scored, th, seed);
    const nonAff = scored.filter((i) => !i.affiliated);
    const nonAffPanel = nonAff.length < scored.length ? computePanel(nonAff, th, seed) : null;
    const undated36 = build(items, { undatedMonths: th.undated_sensitivity_months, panel: "all" });
    forecasters[f.slug] = {
      slug: f.slug,
      coverage_tier: f.coverage.tier,
      headline: headlinePanel,
      headline_non_affiliated: nonAffPanel && nonAffPanel.n_clusters >= th.affiliated_split_min_clusters && headlinePanel.n_clusters >= th.affiliated_split_min_clusters ? nonAffPanel : nonAffPanel ? { ...nonAffPanel, brier: null, hit: { ...nonAffPanel.hit, rate: null } } : null,
      dated: computePanel(dated, th, seed),
      undated: computePanel(undated, th, seed),
      undated_36: computePanel(undated36, th, seed),
      calibration: calibrationReport(scored, map, th),
      composition: composition(statements, items, scored, th),
      timing: timingReport(scored),
      by_area: byArea(scored, areas, th, seed),
      over_time: overTime(scored),
      boldness: boldness(scored),
      sensitivity: sensitivity({ recompute: (o) => build(items, o), lexicon: ds.lexicon, all: scored, dated, undated }, th),
    };
    status[f.slug] = countStatus(scored, statements, items);
  }
  status.all = countStatus(allScored, ds.statements, ds.items);

  const eventsWithItems: Record<string, number> = {};
  for (const i of ds.items) eventsWithItems[i.event_id] = (eventsWithItems[i.event_id] ?? 0) + 1;

  return {
    as_of: asOf,
    rules_version: ds.version.version,
    seed,
    forecasters,
    leaderboard: leaderboard(ds.forecasters, forecasters, allScored, th, seed),
    matrix: matrix(allScored, ds.forecasters.map((f) => f.slug), areas as AreaSlug[], th.timing_min),
    shared_events: sharedEvents(allScored),
    pairwise: pairwise(allScored, ds.forecasters.map((f) => f.slug), th, seed),
    status,
    agreement: agreement(ds.statements, ds.items, ds.coder_b, ds.rechecks, th),
    items: allScored,
    events_with_items: eventsWithItems,
  };
}
