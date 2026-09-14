import { monthsBetween, quarterOf, yearOf } from "@/lib/dates";
import type { Bin, Item, Lexicon, Statement, Thresholds } from "@/lib/data/schema";
import { bootstrap } from "./bootstrap";
import { mean, median, quantile } from "./brier";
import { calibrationByBin, murphy } from "./calibration";
import { clusterize, nearestBin, type BinMap } from "./items";
import type { CalibrationReport, Composition, ForecasterScores, ScoredItem, SeriesPoint, TimingReport } from "./model";
import { itemWeights, pointBrier } from "./panel";
import { wilson } from "./wilson";

export function calibrationReport(items: ScoredItem[], map: BinMap, th: Thresholds): CalibrationReport {
  const clusters = clusterize(items).filter((c) => c.resolved.length > 0);
  const w = itemWeights(clusters);
  const rows = clusters.flatMap((c) => c.resolved.map((i) => ({ p: i.p, o: i.o as 0 | 1, w: w.get(i.key) ?? 0, bin: (i.bin ?? nearestBin(i.p, map)) as string })));
  const bins = calibrationByBin(rows, map, th.calibration_min_per_bin);
  const shown = clusters.length >= th.calibration_min_clusters;
  const murphyShown = clusters.length >= th.murphy_min_clusters;
  return { shown, n_clusters: clusters.length, bins, murphy: murphyShown ? murphy(rows, bins) : null, murphy_shown: murphyShown };
}

export function composition(statements: Statement[], items: Item[], scored: ScoredItem[], th: Thresholds): Composition {
  const found = statements.length;
  const sincere = statements.filter((s) => s.extraction.sincere && s.extraction.own_claim && s.extraction.forward_looking).length;
  const admitted = statements.filter((s) => s.status === "admitted").length;
  const dated = items.filter((i) => i.panel === "dated").length;
  const undated = items.filter((i) => i.panel === "undated").length;
  const voidN = statements.filter((s) => s.status === "void").length;
  const notAdmitted = statements.filter((s) => s.status === "not_admitted").length;
  const byReason: Record<string, number> = {};
  for (const s of statements) if (s.status === "not_admitted" && s.reason_code) byReason[s.reason_code] = (byReason[s.reason_code] ?? 0) + 1;
  const voidByReason: Record<string, number> = {};
  for (const s of statements) if (s.status === "void" && s.void_reason) voidByReason[s.void_reason] = (voidByReason[s.void_reason] ?? 0) + 1;
  for (const i of scored) if (i.state === "void" && i.void_reason) voidByReason[i.void_reason] = (voidByReason[i.void_reason] ?? 0) + 1;
  const clusters = clusterize(scored);
  const resolvedClusters = clusters.filter((c) => c.resolved.length > 0);
  const resolvedItems = scored.filter((i) => i.o !== null);
  const perEvent = new Map<string, number>();
  for (const i of resolvedItems) perEvent.set(i.event_id, (perEvent.get(i.event_id) ?? 0) + 1);
  const totalResolved = [...perEvent.values()].reduce((s, v) => s + v, 0);
  const concentration = totalResolved > 0 ? Math.max(...perEvent.values()) / totalResolved : null;
  const affiliated = items.filter((i) => i.tags.includes("affiliated")).length;
  const extreme = items.filter((i) => i.bin === "A" || i.bin === "E").length;
  const leads = items.filter((i) => i.panel === "dated" && i.deadline).map((i) => monthsBetween(i.statement_date, i.deadline as string));
  const prospective = items.filter((i) => i.tags.includes("prospective")).length;
  const byArea: Record<string, number> = {};
  for (const i of items) byArea[i.area] = (byArea[i.area] ?? 0) + 1;
  const byYear: Record<string, number> = {};
  for (const s of statements) { const y = String(yearOf(s.statement_date)); byYear[y] = (byYear[y] ?? 0) + 1; }
  void th;
  return {
    found, sincere, admitted, dated, undated, void: voidN, not_admitted: notAdmitted,
    not_admitted_by_reason: byReason, void_by_reason: voidByReason,
    clusters_headline: clusters.length, resolved_headline: resolvedClusters.length,
    pending_headline: scored.filter((i) => i.state === "pending").length, known_true_headline: scored.filter((i) => i.state === "known_true").length,
    scoreable_share: sincere > 0 ? wilson(dated, sincere) : null,
    undated_share: admitted > 0 ? undated / admitted : null,
    affiliated_share: admitted > 0 ? affiliated / admitted : null,
    extreme_bin_share: admitted > 0 ? extreme / admitted : null,
    concentration,
    redated_clusters: clusters.filter((c) => c.deadlines > 1).length,
    max_deadlines_in_cluster: clusters.reduce((m, c) => Math.max(m, c.deadlines), 0),
    median_lead_months: median(leads),
    prospective_share: admitted > 0 ? prospective / admitted : null,
    by_area: byArea, by_year: byYear,
  };
}

export function timingReport(items: ScoredItem[]): TimingReport {
  const rows = items.filter((i) => i.state === "false" && i.timing_months !== null).map((i) => ({ key: i.key, months: i.timing_months as number, event_id: i.event_id }));
  const v = rows.map((r) => r.months);
  return { n: rows.length, median: median(v), q1: quantile(v, 0.25), q3: quantile(v, 0.75), values: rows };
}

/** Cumulative cluster-mean Brier by the quarter in which items entered the score (their deadline). */
export function overTime(items: ScoredItem[]): SeriesPoint[] {
  const resolved = items.filter((i) => i.o !== null);
  const periods = [...new Set(resolved.map((i) => quarterOf(i.deadline)))].sort();
  const out: SeriesPoint[] = [];
  for (const period of periods) {
    const upTo = resolved.filter((i) => quarterOf(i.deadline) <= period);
    const inPeriod = resolved.filter((i) => quarterOf(i.deadline) === period);
    const cum = pointBrier(upTo);
    const now = pointBrier(inPeriod);
    out.push({ period, n: now.n_clusters, brier: now.brier ?? 0, cumulative: cum.brier ?? 0, cumulative_n: cum.n_clusters });
  }
  return out;
}

export function byArea(items: ScoredItem[], areas: string[], th: Thresholds, seed: number): ForecasterScores["by_area"] {
  const out: ForecasterScores["by_area"] = {};
  for (const a of areas) {
    const sub = items.filter((i) => i.area === a);
    const clusters = clusterize(sub).filter((c) => c.resolved.length > 0);
    const b = clusters.length >= th.timing_min ? bootstrap(clusters, (s) => mean(s.map((c) => c.brier as number)), { resamples: th.bootstrap_resamples, seed }) : null;
    out[a] = { n_clusters: clusters.length, brier: b, n_items: sub.length };
  }
  return out;
}

export function boldness(items: ScoredItem[]): ForecasterScores["boldness"] {
  const resolved = items.filter((i) => i.o !== null);
  const withB = resolved.filter((i) => i.base_p !== null);
  return {
    mean_abs_p_minus_b: mean(withB.map((i) => Math.abs(i.p - (i.base_p as number)))),
    n: withB.length,
    mean_abs_p_minus_half: mean(resolved.map((i) => Math.abs(i.p - 0.5))),
  };
}

export interface SensitivityInputs {
  recompute: (opts: { map?: BinMap; undatedMonths?: number; useMapForP?: boolean; panel: "dated" | "undated" | "all" }) => ScoredItem[];
  lexicon: Lexicon;
  /** The headline panel: every admitted item. */
  all: ScoredItem[];
  dated: ScoredItem[];
  undated: ScoredItem[];
}

export function sensitivity(inp: SensitivityInputs, th: Thresholds): ForecasterScores["sensitivity"] {
  const out: ForecasterScores["sensitivity"] = {};
  // every variant reports null below the headline cluster minimum, as the methodology page states
  const gate = <T extends { brier: number | null; n_clusters: number }>(r: T): T => ({ ...r, brier: r.n_clusters >= th.min_clusters_headline ? r.brier : null });
  const base = gate(pointBrier(inp.all));
  out.baseline = { ...base, note: "Headline as published: every admitted item, lexicon v" + inp.lexicon.version };
  for (const [name, map] of Object.entries(inp.lexicon.sensitivity_maps)) {
    const items = inp.recompute({ map: map as BinMap, useMapForP: true, panel: "all" });
    out[`map_${name}`] = { ...gate(pointBrier(items)), note: `Lexicon replaced by the ${name} map (${(["A", "B", "C", "D", "E"] as Bin[]).map((b) => (map as BinMap)[b]).join(" / ")})` };
  }
  out.non_affiliated = { ...gate(pointBrier(inp.all.filter((i) => !i.affiliated))), note: "Affiliated items removed" };
  out.prospective_only = { ...gate(pointBrier(inp.all.filter((i) => i.tags.includes("prospective")))), note: "Items frozen before their outcome was public" };
  out.dated_only = { ...gate(pointBrier(inp.dated)), note: "Dated items only: undated items removed (the rules 1.0 headline)" };
  out.undated_36 = { ...gate(pointBrier(inp.recompute({ undatedMonths: th.undated_sensitivity_months, panel: "all" }))), note: `Undated window at ${th.undated_sensitivity_months} months instead of ${th.undated_window_months}` };
  return out;
}
