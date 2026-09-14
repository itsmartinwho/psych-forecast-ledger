// Every takeaway function on a small fixture and on the live snapshot. A takeaway is one sentence, under
// 20 words, with no chart words. Titles and phrases are checked against the copy sheet.
import { describe, expect, it } from "vitest";
import { loadDatasetUncached } from "@/lib/data/load";
import { admissionFunnel, eventViews, forecasterView, reasonRungBars, predictionDetail, boldnessData } from "@/lib/data/derive";
import {
  admissionTakeaway, areasTakeaway, boardRows, boldnessTakeaway, brierBand, calibrationTakeaway, claimsTakeaway, coveragePhrase, groundTruthTakeaway,
  horizonTakeaway, lanesTakeaway, leaderboardTakeaway, matrixTakeaway, metricNeed, overTimeTakeaway, reasonsTakeaway, recentTakeaway, registryTakeaway,
  scoreRange, scoreSub, scoreValue, scoreboardVerdict, sensitivityTakeaway, sharedTakeaway, statementTitle, statusTakeaway, timingTakeaway,
} from "@/lib/data/text";
import { computeScores, type ForecasterScores, type PanelScores, type ScoredItem } from "@/lib/score";

const CHART_WORDS = /\b(dot|dots|bar|bars|cell|cells|row|rows|chart|charts)\b/i;

/** One sentence, under 20 words, no chart words. */
function expectTakeaway(s: string) {
  expect(s).toMatch(/^[A-Z0-9"].*\.$/);
  expect(s.slice(0, -1)).not.toMatch(/[.!?]\s/);
  expect(s.split(/\s+/).length).toBeLessThan(20);
  expect(s).not.toMatch(CHART_WORDS);
}

// ---- fixture -----------------------------------------------------------------------------------
const interval = (point: number, lo: number, hi: number, n: number) => ({ point, lo, hi, n });

function panel(over: Partial<PanelScores> = {}): PanelScores {
  return {
    n_clusters: 13, n_items_resolved: 16, n_true: 5, n_false: 11, n_pending: 23, n_known_true: 5, n_void: 1, n_unresolved: 0, n_items_total: 45,
    brier: interval(0.198, 0.064, 0.364, 13), loo_max_change: 0.05, hit: { rate: interval(0.79, 0.5, 0.94, 11), hits: 10, n: 11 },
    skill_base: { value: null, n_clusters: 2, ref_brier: 0.1, own_brier: 0.15 }, skill_market: { value: null, n_clusters: 0, ref_brier: null, own_brier: null },
    tier: "T1", label: "provisional", ...over,
  };
}

function scores(over: Partial<ForecasterScores> = {}): ForecasterScores {
  return {
    slug: "owen", coverage_tier: "A", headline: panel(), headline_non_affiliated: panel(), dated: panel({ brier: null, n_clusters: 2, tier: "T0", label: "counts" }), undated: panel(), undated_36: panel(),
    calibration: { shown: false, n_clusters: 13, bins: [{ bin: "A", f: 0.54, observed: 0.276, n: 8, merged_from: ["A"], weight: 0.56 }], murphy: null, murphy_shown: false },
    composition: { found: 2429, sincere: 2118, admitted: 50, dated: 15, undated: 35, void: 2, not_admitted: 2377, not_admitted_by_reason: {}, void_by_reason: {}, clusters_headline: 39, resolved_headline: 13, pending_headline: 23, known_true_headline: 5, scoreable_share: interval(0.007, 0.004, 0.012, 2118), undated_share: 0.7, affiliated_share: 0.04, extreme_bin_share: 0.62, concentration: 0.25, redated_clusters: 3, max_deadlines_in_cluster: 5, median_lead_months: 11, prospective_share: 0, by_area: {}, by_year: {} },
    timing: { n: 1, median: 5, q1: 5, q3: 5, values: [{ key: "k", months: 5, event_id: "E-0001" }] },
    by_area: { regulatory: { n_clusters: 8, brier: interval(0.18, 0.04, 0.38, 8), n_items: 23 }, clinical_trial: { n_clusters: 3, brier: null, n_items: 6 }, payer_policy: { n_clusters: 2, brier: null, n_items: 10 } },
    over_time: [{ period: "2023-Q2", n: 1, brier: 0.017, cumulative: 0.017, cumulative_n: 1 }, { period: "2026-Q3", n: 2, brier: 0.01, cumulative: 0.198, cumulative_n: 13 }],
    boldness: { mean_abs_p_minus_b: 0.248, n: 5, mean_abs_p_minus_half: 0.273 },
    sensitivity: { baseline: { brier: 0.198, n_clusters: 13, note: "" }, map_flat75: { brier: 0.175, n_clusters: 13, note: "" }, dated_only: { brier: null, n_clusters: 2, note: "" } },
    ...over,
  };
}

function item(over: Partial<ScoredItem>): ScoredItem {
  return { key: "owen|E-0001|2024-12-31", forecaster: "owen", event_id: "E-0001", area: "regulatory", panel: "dated", deadline: "2024-12-31", statement_ids: ["owen-0001"], first_date: "2023-01-01", last_date: "2023-01-01", parts: [], p: 0.7, p_origin: "lexicon", bin: "B", base_p: null, market_p: null, affiliated: false, conditional: false, tags: [], state: "false", void_reason: null, o: 0, brier: 0.49, event_date: null, timing_months: null, ...over };
}

const AREAS = [{ slug: "regulatory", name: "Regulatory decisions" }, { slug: "clinical_trial", name: "Trial outcomes" }, { slug: "payer_policy", name: "Payer and policy" }];

describe("scoreboard text on a fixture", () => {
  it("verdict bands follow the Brier point and the tier", () => {
    expect(brierBand(0.1)).toBe("Well ahead of a coin flip");
    expect(brierBand(0.2)).toBe("Ahead of a coin flip");
    expect(brierBand(0.3)).toBe("No better than a coin flip");
    expect(brierBand(0.5)).toBe("Worse than a coin flip");
    expect(scoreboardVerdict(panel(), 10)).toBe("Ahead of a coin flip, provisional.");
    expect(scoreboardVerdict(panel({ tier: "T2", label: "full" }), 10)).toBe("Ahead of a coin flip.");
    expect(scoreboardVerdict(panel({ tier: "T0", label: "counts", brier: null, n_true: 1, n_false: 1 }), 10)).toBe("A score needs 10 resolved events.");
    expect(scoreboardVerdict(panel({ tier: "T0", label: "counts", brier: null, n_true: 0, n_false: 0 }), 10)).toBe("No claim has come due yet.");
  });
  it("value, range and meta line", () => {
    expect(scoreValue(panel())).toBe("0.20");
    expect(scoreValue(panel({ brier: null, n_true: 1, n_false: 2 }))).toBe("1 of 3");
    expect(scoreRange(panel())).toBe("95% 0.06 to 0.36");
    expect(scoreRange(panel({ brier: null }))).toBeNull();
    expect(scoreSub(panel())).toBe("Brier · 95% 0.06 to 0.36 · provisional");
    expect(scoreSub(panel({ brier: null }))).toBe("Resolved claims came true");
  });
  it("metricNeed reads needs N unit · M now", () => {
    expect(metricNeed(10, 2, "paired events")).toBe("needs 10 paired events · 2 now");
    expect(metricNeed(5, 0, "events with a market quote")).toBe("needs 5 events with a market quote · 0 now");
    expect(metricNeed(1000, 12, "items")).toBe("needs 1,000 items · 12 now");
  });
});

describe("takeaways on a fixture", () => {
  const rowsT0 = [{ label: "Muir", value: null, n: 2, tier: "T0" as const }, { label: "Doblin", value: null, n: 2, tier: "T0" as const }, { label: "Base rate", value: null, n: 5, tier: "T0" as const, reference: true }];
  const rowsOne = [{ label: "Muir", value: 0.198, lo: 0.064, hi: 0.364, n: 13, tier: "T1" as const }, ...rowsT0.slice(1)];
  const rowsApart = [{ label: "Muir", value: 0.1, lo: 0.05, hi: 0.15, n: 30, tier: "T2" as const }, { label: "Doblin", value: 0.5, lo: 0.4, hi: 0.6, n: 30, tier: "T2" as const }];
  const rowsOverlap = [{ label: "Muir", value: 0.1, lo: 0.05, hi: 0.45, n: 30, tier: "T2" as const }, { label: "Doblin", value: 0.5, lo: 0.4, hi: 0.6, n: 30, tier: "T2" as const }];

  it("leaderboard: the four branches", () => {
    expect(leaderboardTakeaway(rowsT0, 10)).toBe("No forecaster has 10 resolved events yet.");
    expect(leaderboardTakeaway(rowsOne, 10)).toBe("Muir is the only forecaster with a score: 0.20 on 13 events, provisional.");
    expect(leaderboardTakeaway(rowsApart, 10)).toBe("Muir leads; the intervals do not overlap.");
    expect(leaderboardTakeaway(rowsOverlap, 10)).toBe("The intervals overlap; no ranking yet.");
    expect(leaderboardTakeaway(rowsApart.map((r) => ({ ...r, rank: null })), 10)).toBe("The intervals overlap; no ranking yet.");
    for (const rows of [rowsT0, rowsOne, rowsApart, rowsOverlap]) expectTakeaway(leaderboardTakeaway(rows, 10));
  });
  it("over time, areas, calibration, timing, sensitivity", () => {
    const f = scores();
    expect(overTimeTakeaway(f)).toBe("Cumulative Brier 0.20 after 13 events, up from 0.02 in 2023 Q2.");
    expect(overTimeTakeaway(scores({ over_time: f.over_time.slice(0, 1) }))).toBe("Cumulative Brier 0.02 after 1 event.");
    expect(areasTakeaway(f.by_area, AREAS)).toBe("Regulatory decisions holds 8 of 13 resolved events.");
    expect(calibrationTakeaway("Muir", f)).toBe('When Muir says "will", it happens 28% of the time.');
    expect(calibrationTakeaway("Muir", scores({ calibration: { ...f.calibration, bins: [] } }))).toBe("Muir's stated confidence against what happened.");
    expect(timingTakeaway(f)).toBe("Median miss 5 months late on 1 claim.");
    expect(timingTakeaway(scores({ timing: { n: 0, median: null, q1: null, q3: null, values: [] } }))).toBe("No false claim has later come true.");
    expect(sensitivityTakeaway(f)).toBe("Other rules move the headline by at most 0.02.");
    for (const s of [overTimeTakeaway(f), areasTakeaway(f.by_area, AREAS), calibrationTakeaway("Muir", f), timingTakeaway(f), sensitivityTakeaway(f)]) expectTakeaway(s);
  });
  it("admission and reasons", () => {
    const funnel = { groups: [{ id: "found", label: "Found", count: 2495 }, { id: "sincere", label: "Sincere", count: 2200 }, { id: "admitted", label: "Admitted", count: 71 }, { id: "resolved", label: "Resolved", count: 27 }], unit: "statements" };
    expect(admissionTakeaway(funnel)).toBe("1 in 35 statements is a checkable claim; 27 are resolved.");
    const groups = [{ id: "VAGUE", label: "Vague or promotional", count: 852 }, { id: "CONTROL", label: "Commitment (own venture)", count: 525 }, { id: "REPORT", label: "Report or scoop", count: 1047 }];
    expect(reasonsTakeaway(groups)).toBe("Report or scoop accounts for 1,047 of 2,424 statements not admitted.");
    expectTakeaway(admissionTakeaway(funnel));
    expectTakeaway(reasonsTakeaway(groups));
  });
  it("ledgers, lanes, horizon, shared, status", () => {
    const items = [item({ o: 1, state: "true" }), item({ o: 0 }), item({ o: null, state: "pending", first_date: "2021-05-01" }), item({ o: null, state: "known_true" }), item({ o: null, state: "void" })];
    expect(recentTakeaway(items)).toBe("1 of the last 2 came true.");
    expect(claimsTakeaway(items)).toBe("5 claims since 2021; 2 resolved, 2 pending.");
    expect(lanesTakeaway(items, new Array(217))).toBe("5 claims against 217 events in the field.");
    expect(horizonTakeaway("Doblin", "MDMA-assisted therapy approved by FDA", 8, null)).toBe("Doblin promised MDMA-assisted therapy approved by FDA 8 times; it has not happened.");
    expect(horizonTakeaway("Muir", "X", 1, "2025-03-04")).toBe("Muir promised X 1 time; it happened on 4 Mar 2025.");
    expect(sharedTakeaway([{ event_id: "E-0001", forecasters: [] }])).toBe("1 event has claims from more than one forecaster.");
    expect(sharedTakeaway([{ event_id: "E-0001", forecasters: [] }, { event_id: "E-0002", forecasters: [] }])).toBe("2 events have claims from more than one forecaster.");
    expect(statusTakeaway({ true: 5, false: 11 })).toBe("5 of 16 resolved claims came true.");
    expect(statusTakeaway({ true: 0, false: 0 })).toBe("No claim has come due yet.");
    expect(boldnessTakeaway({ points: [{ id: "owen", label: "Muir", x: 0.248, y: 0.198, n: 13, hero: true }], xLabel: "", yLabel: "" })).toBe("Muir sits 0.25 from the base rate on average, at Brier 0.20.");
  });
  it("events", () => {
    const outcome = (state: "occurred" | "not_occurred") => ({ event_id: "E-0001", state, date: null, checked_through: "2026-09-13", realized_value: null, evidence: [], note: "", resolver: "", resolved_at: "2026-09-13", version: 1 });
    expect(registryTakeaway([{ outcome: outcome("occurred") }, { outcome: outcome("not_occurred") }, { outcome: null }])).toBe("1 of 3 events have occurred; 1 are open.");
    expect(groundTruthTakeaway([{ date: "2026-07-02" }, { date: "2026-08-15" }, { date: "2025-01-01" }])).toBe("2 events in 2026 Q3.");
  });
  it("coverage phrases", () => {
    expect(coveragePhrase("A")).toBe("Full archive (tier A)");
    expect(coveragePhrase("B")).toBe("Archive plus search (tier B)");
    expect(coveragePhrase("C")).toBe("Ad hoc collection (tier C)");
  });
});

describe("takeaways on the live snapshot", () => {
  const ds = loadDatasetUncached();
  const snap = computeScores(ds);
  const hero = ds.forecasters.find((f) => f.hero)!;
  const owen = snap.forecasters[hero.slug];
  const view = forecasterView(ds, snap, hero.slug)!;
  const minN = ds.thresholds.min_clusters_headline;

  it("every takeaway is one short sentence", () => {
    const all = [
      scoreboardVerdict(owen.headline, minN),
      ...ds.forecasters.map((f) => scoreboardVerdict(snap.forecasters[f.slug].headline, minN)),
      leaderboardTakeaway(boardRows(snap.leaderboard, ds.forecasters), minN),
      overTimeTakeaway(owen),
      admissionTakeaway(admissionFunnel(ds, snap)),
      admissionTakeaway(admissionFunnel(ds, snap, hero.slug)),
      reasonsTakeaway(reasonRungBars(ds).groups),
      reasonsTakeaway(reasonRungBars(ds, hero.slug).groups),
      areasTakeaway(owen.by_area, ds.areas),
      calibrationTakeaway(hero.short, owen),
      matrixTakeaway(snap, ds),
      boldnessTakeaway(boldnessData(ds, snap)),
      timingTakeaway(owen),
      recentTakeaway(snap.items.filter((i) => i.o !== null).sort((a, b) => (a.deadline > b.deadline ? -1 : 1)).slice(0, 12)),
      claimsTakeaway(view.items),
      lanesTakeaway(view.items, ds.timeline),
      horizonTakeaway("Doblin", "MDMA-assisted therapy approved by FDA", 8, null),
      sharedTakeaway(snap.shared_events),
      sensitivityTakeaway(owen),
      statusTakeaway(snap.status[hero.slug]),
      registryTakeaway(eventViews(ds, snap)),
      groundTruthTakeaway(ds.timeline),
    ];
    for (const s of all) expectTakeaway(s);
  });

  it("matches the live values", () => {
    expect(scoreboardVerdict(owen.headline, minN)).toBe("Ahead of a coin flip, provisional.");
    expect(scoreboardVerdict(snap.forecasters.angermayer.headline, minN)).toBe("A score needs 10 resolved events.");
    expect(leaderboardTakeaway(boardRows(snap.leaderboard, ds.forecasters), minN)).toBe("Muir is the only forecaster with a score: 0.20 on 13 events, provisional.");
    expect(overTimeTakeaway(owen)).toBe("Cumulative Brier 0.20 after 13 events, up from 0.02 in 2023 Q2.");
    expect(admissionTakeaway(admissionFunnel(ds, snap))).toBe("1 in 35 statements is a checkable claim; 27 are resolved.");
    expect(reasonsTakeaway(reasonRungBars(ds).groups)).toBe("Vague or promotional accounts for 852 of 2,424 statements not admitted.");
    expect(areasTakeaway(owen.by_area, ds.areas)).toBe("Regulatory decisions holds 8 of 13 resolved events.");
    expect(calibrationTakeaway(hero.short, owen)).toBe('When Muir says "will", it happens 28% of the time.');
    expect(timingTakeaway(owen)).toBe("Median miss 5 months late on 1 claim.");
    expect(claimsTakeaway(view.items)).toBe("45 claims since 2022; 16 resolved, 28 pending.");
    expect(sharedTakeaway(snap.shared_events)).toBe("1 event has claims from more than one forecaster.");
    expect(sensitivityTakeaway(owen)).toBe("Other rules move the headline by at most 0.02.");
    expect(statusTakeaway(snap.status[hero.slug])).toBe("5 of 16 resolved claims came true.");
    expect(scoreRange(owen.headline)).toBe("95% 0.06 to 0.36");
  });

  it("statement titles follow the six H1 forms", () => {
    const codes = ds.reason_codes;
    const title = (id: string) => statementTitle(predictionDetail(ds, snap, id)!, codes);
    expect(title("owen-0070")).toMatch(/^True · Brier 0\.\d\d$/);
    expect(title("owen-2022")).toBe("Known true · enters 31 Dec 2026");
    expect(title("owen-1137")).toBe("Void · Coders disagree");
    expect(title("owen-0001")).toBe("Not admitted · Commitment (own venture)");
    const falseId = snap.items.find((i) => i.state === "false")!.statement_ids[0];
    expect(title(falseId)).toMatch(/^False · Brier 0\.\d\d$/);
    const pendingId = snap.items.find((i) => i.state === "pending")!.statement_ids[0];
    expect(title(pendingId)).toMatch(/^Pending · due \d{1,2} [A-Z][a-z]{2} \d{4}$/);
  });
});
