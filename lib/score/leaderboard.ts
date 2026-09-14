import type { Forecaster, Thresholds } from "@/lib/data/schema";
import { bootstrap } from "./bootstrap";
import { brier as brierOf, mean } from "./brier";
import { clusterize } from "./items";
import type { Cluster, ForecasterScores, ScoredItem, Tier } from "./model";
import type { Interval } from "./wilson";

export interface LeaderboardRow {
  slug: string;
  name: string;
  kind: "person" | "reference";
  coverage_tier: "A" | "B" | "C" | null;
  tier: Tier;
  label: "counts" | "provisional" | "full";
  n_clusters: number;
  n_true: number;
  n_false: number;
  n_pending: number;
  brier: Interval | null;
  hit: { hits: number; n: number; rate: Interval | null };
  rank: number | null;
  note: string | null;
}

/** Reference row: the base rate (or market) scored on every paired resolved cluster across all forecasters. */
export function referenceRow(all: ScoredItem[], pick: (i: ScoredItem) => number | null, th: Thresholds, seed: number, minClusters: number): { brier: Interval | null; n_clusters: number; n_true: number; n_false: number } {
  const clusters = clusterize(all).filter((c) => c.resolved.some((i) => pick(i) !== null));
  const units = clusters.map((c) => {
    const paired = c.resolved.filter((i) => pick(i) !== null);
    return mean(paired.map((i) => brierOf(pick(i) as number, i.o as 0 | 1))) as number;
  });
  const b = units.length >= minClusters ? bootstrap(units, (s) => mean(s), { resamples: th.bootstrap_resamples, seed }) : null;
  const resolved = clusters.flatMap((c) => c.resolved.filter((i) => pick(i) !== null));
  return { brier: b, n_clusters: units.length, n_true: resolved.filter((i) => i.o === 1).length, n_false: resolved.filter((i) => i.o === 0).length };
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.lo <= b.hi && b.lo <= a.hi;
}

/** Rule 11: rank two forecasters only when both are at T1 or above, share a coverage tier, and their intervals do not overlap. */
export function assignRanks(rows: LeaderboardRow[]): LeaderboardRow[] {
  const persons = rows.filter((r) => r.kind === "person");
  const ranked = persons.filter((r) => r.brier && r.tier !== "T0");
  for (const r of persons) r.rank = null;
  const groups = new Map<string, LeaderboardRow[]>();
  for (const r of ranked) (groups.get(r.coverage_tier ?? "C") ?? groups.set(r.coverage_tier ?? "C", []).get(r.coverage_tier ?? "C")!).push(r);
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => (a.brier!.point - b.brier!.point));
    // a rank is assigned only when a row is separated from every other row in its group
    for (let i = 0; i < sorted.length; i++) {
      const separated = sorted.every((o, j) => j === i || !overlaps(sorted[i].brier!, o.brier!));
      sorted[i].rank = separated ? i + 1 : null;
    }
  }
  return rows;
}

export function leaderboard(forecasters: Forecaster[], scores: Record<string, ForecasterScores>, all: ScoredItem[], th: Thresholds, seed: number): LeaderboardRow[] {
  const rows: LeaderboardRow[] = forecasters.map((f) => {
    const s = scores[f.slug];
    const h = s.headline;
    return {
      slug: f.slug, name: f.name, kind: "person", coverage_tier: f.coverage.tier, tier: h.tier, label: h.label,
      n_clusters: h.n_clusters, n_true: h.n_true, n_false: h.n_false, n_pending: h.n_pending + h.n_known_true,
      brier: h.brier, hit: h.hit, rank: null,
      note: f.coverage.tier === "C" ? "Ad hoc corpus: rows only, never ranked" : h.tier === "T0" ? "Fewer than 10 resolved events" : h.tier === "T1" ? "Provisional: fewer than 30 resolved events" : null,
    };
  });
  const base = referenceRow(all, (i) => i.base_p, th, seed, th.min_clusters_headline);
  const market = referenceRow(all, (i) => i.market_p, th, seed, th.market_min_clusters);
  const tierOf = (n: number): Tier => (n < th.min_clusters_headline ? "T0" : n < th.provisional_below_clusters ? "T1" : "T2");
  rows.push({ slug: "base-rate", name: "Base rate", kind: "reference", coverage_tier: null, tier: tierOf(base.n_clusters), label: base.n_clusters < th.min_clusters_headline ? "counts" : base.n_clusters < th.provisional_below_clusters ? "provisional" : "full", n_clusters: base.n_clusters, n_true: base.n_true, n_false: base.n_false, n_pending: 0, brier: base.brier, hit: { hits: 0, n: 0, rate: null }, rank: null, note: "Published base rates on the same events, fixed at intake" });
  rows.push({ slug: "market", name: "Prediction markets", kind: "reference", coverage_tier: null, tier: tierOf(market.n_clusters), label: market.n_clusters < th.market_min_clusters ? "counts" : "provisional", n_clusters: market.n_clusters, n_true: market.n_true, n_false: market.n_false, n_pending: 0, brier: market.brier, hit: { hits: 0, n: 0, rate: null }, rank: null, note: "Last market quote before each statement; indicative" });
  assignRanks(rows);
  // display order: ranked persons by rank, then unranked persons alphabetically, then references
  return rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "person" ? -1 : 1;
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return a.name.localeCompare(b.name);
  });
}

export interface MatrixCell { forecaster: string; area: string; n_clusters: number; brier: number | null; shown: boolean }
export function matrix(all: ScoredItem[], forecasters: string[], areas: string[], minCell: number): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const f of forecasters) for (const a of areas) {
    const clusters = clusterize(all.filter((i) => i.forecaster === f && i.area === a)).filter((c) => c.resolved.length > 0);
    const b = mean(clusters.map((c) => c.brier as number));
    cells.push({ forecaster: f, area: a, n_clusters: clusters.length, brier: clusters.length >= minCell ? b : null, shown: clusters.length >= minCell });
  }
  return cells;
}

export type { Cluster };
