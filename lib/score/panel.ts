import type { Thresholds } from "@/lib/data/schema";
import { bootstrapJoint, leaveOneOutMaxChange } from "./bootstrap";
import { brier as brierOf, mean } from "./brier";
import { clusterize } from "./items";
import type { Cluster, PairedSkill, PanelScores, ScoredItem, Tier } from "./model";
import { wilson } from "./wilson";

/** Mean over clusters of the mean over resolved items: one cluster = one observation. */
export function clusterMeanBrier(clusters: Cluster[]): number | null {
  const vals = clusters.filter((c) => c.brier !== null).map((c) => c.brier as number);
  return mean(vals);
}

/** Paired reference: only clusters with at least one resolved item carrying the reference probability. */
function pairedBriers(clusters: Cluster[], pick: (i: ScoredItem) => number | null): { own: number[]; ref: number[] } {
  const own: number[] = [], ref: number[] = [];
  for (const c of clusters) {
    const paired = c.resolved.filter((i) => pick(i) !== null);
    if (paired.length === 0) continue;
    own.push(mean(paired.map((i) => i.brier as number))!);
    ref.push(mean(paired.map((i) => brierOf(pick(i) as number, i.o as 0 | 1)))!);
  }
  return { own, ref };
}

export function tierFor(nClusters: number, th: Thresholds): { tier: Tier; label: PanelScores["label"] } {
  if (nClusters < th.min_clusters_headline) return { tier: "T0", label: "counts" };
  if (nClusters < th.provisional_below_clusters) return { tier: "T1", label: "provisional" };
  return { tier: "T2", label: "full" };
}

/** Cluster weights: w_i = 1 / (C * m_c) so every cluster carries one vote. */
export function itemWeights(clusters: Cluster[]): Map<string, number> {
  const w = new Map<string, number>();
  const C = clusters.filter((c) => c.resolved.length > 0).length;
  for (const c of clusters) for (const i of c.resolved) w.set(i.key, 1 / (C * c.resolved.length));
  return w;
}

export function hitRate(clusters: Cluster[]): { rate: ReturnType<typeof wilson>; hits: number; n: number } {
  const w = itemWeights(clusters);
  let num = 0, den = 0, hits = 0;
  const contributing = new Set<string>();
  for (const c of clusters) for (const i of c.resolved) {
    if (Math.abs(i.p - 0.5) < 1e-9) continue;
    const h = (i.p > 0.5 && i.o === 1) || (i.p < 0.5 && i.o === 0) ? 1 : 0;
    const wi = w.get(i.key) ?? 0;
    num += wi * h; den += wi; hits += h; contributing.add(c.id);
  }
  const n = contributing.size;
  if (den === 0 || n === 0) return { rate: null, hits: 0, n: 0 };
  const H = num / den;
  return { rate: wilson(H * n, n), hits, n };
}

export function computePanel(items: ScoredItem[], th: Thresholds, seed: number, minClusters = th.min_clusters_headline): PanelScores {
  const clusters = clusterize(items);
  const resolvedClusters = clusters.filter((c) => c.resolved.length > 0).sort((a, b) => (a.id < b.id ? -1 : 1));
  const C = resolvedClusters.length;
  const count = (s: ScoredItem["state"]) => items.filter((i) => i.state === s).length;
  const base: PanelScores = {
    n_clusters: C, n_items_resolved: items.filter((i) => i.o !== null).length,
    n_true: count("true"), n_false: count("false"), n_pending: count("pending"), n_known_true: count("known_true"), n_void: count("void"), n_unresolved: count("unresolved"),
    n_items_total: items.length,
    brier: null, loo_max_change: null, hit: { rate: null, hits: 0, n: 0 },
    skill_base: { value: null, n_clusters: 0, ref_brier: null, own_brier: null },
    skill_market: { value: null, n_clusters: 0, ref_brier: null, own_brier: null },
    ...tierFor(C, th),
  };
  if (C === 0) return base;
  const stats = {
    brier: (s: Cluster[]) => clusterMeanBrier(s),
    skill_base: (s: Cluster[]) => { const { own, ref } = pairedBriers(s, (i) => i.base_p); const o = mean(own), r = mean(ref); return o === null || r === null || r <= 0 ? null : 1 - o / r; },
    skill_market: (s: Cluster[]) => { const { own, ref } = pairedBriers(s, (i) => i.market_p); const o = mean(own), r = mean(ref); return o === null || r === null || r <= 0 ? null : 1 - o / r; },
  };
  const joint = bootstrapJoint(resolvedClusters, stats, { resamples: th.bootstrap_resamples, seed });
  const pb = pairedBriers(resolvedClusters, (i) => i.base_p);
  const pm = pairedBriers(resolvedClusters, (i) => i.market_p);
  const skillBase: PairedSkill = { value: pb.own.length >= minClusters ? joint.skill_base : null, n_clusters: pb.own.length, ref_brier: mean(pb.ref), own_brier: mean(pb.own) };
  const skillMarket: PairedSkill = { value: pm.own.length >= th.market_min_clusters ? joint.skill_market : null, n_clusters: pm.own.length, ref_brier: mean(pm.ref), own_brier: mean(pm.own) };
  const showHeadline = C >= minClusters;
  return {
    ...base,
    brier: showHeadline ? joint.brier : null,
    loo_max_change: showHeadline ? leaveOneOutMaxChange(resolvedClusters, stats.brier) : null,
    hit: showHeadline ? hitRate(resolvedClusters) : { ...hitRate(resolvedClusters), rate: null },
    skill_base: skillBase,
    skill_market: skillMarket,
  };
}

/** Point estimate only, for sensitivity runs and small subsets. */
export function pointBrier(items: ScoredItem[]): { brier: number | null; n_clusters: number } {
  const clusters = clusterize(items).filter((c) => c.resolved.length > 0);
  return { brier: clusterMeanBrier(clusters), n_clusters: clusters.length };
}
