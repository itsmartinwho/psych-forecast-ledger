import type { AreaSlug, Bin, ForecasterSlug, Tag, VoidReason } from "@/lib/data/schema";
import type { Interval } from "./wilson";
import type { CalibrationBin, Murphy } from "./calibration";

export type Panel = "headline" | "undated";
/** unresolved: the window has closed but the registry has no outcome yet (a listed data gap). */
export type ItemState = "true" | "false" | "pending" | "known_true" | "void" | "unresolved";

export interface StatementPart {
  id: string;
  date: string;
  bin: Bin | null;
  p_stated: number | null;
  denial: boolean;
  p: number;             // p(E) as recorded at intake
}

export interface ScoredItem {
  key: string;                       // forecaster|event|deadline
  forecaster: ForecasterSlug;
  event_id: string;
  area: AreaSlug;
  panel: Panel;
  deadline: string;                  // effective deadline (undated items: statement date + window)
  statement_ids: string[];
  first_date: string;
  last_date: string;
  parts: StatementPart[];
  p: number;
  p_origin: "stated" | "lexicon" | "mixed";
  bin: Bin | null;                   // bin of the first statement (stated numbers: nearest bin)
  base_p: number | null;
  market_p: number | null;
  affiliated: boolean;
  conditional: boolean;
  tags: Tag[];
  state: ItemState;
  void_reason: VoidReason | null;
  o: 0 | 1 | null;
  brier: number | null;
  event_date: string | null;
  timing_months: number | null;
}

export interface Cluster {
  id: string;                        // forecaster|event
  forecaster: ForecasterSlug;
  event_id: string;
  area: AreaSlug;
  items: ScoredItem[];               // all items of the cluster in this panel
  resolved: ScoredItem[];            // state true or false
  brier: number | null;              // mean of resolved item briers
  deadlines: number;                 // distinct deadlines (re-dating count)
  affiliated: boolean;
}

export type Tier = "T0" | "T1" | "T2";

export interface PairedSkill { value: Interval | null; n_clusters: number; ref_brier: number | null; own_brier: number | null }

export interface PanelScores {
  n_clusters: number;                // resolved clusters
  n_items_resolved: number;
  n_true: number;
  n_false: number;
  n_pending: number;
  n_known_true: number;
  n_void: number;
  n_unresolved: number;
  n_items_total: number;
  brier: Interval | null;
  loo_max_change: number | null;
  hit: { rate: Interval | null; hits: number; n: number } ;
  skill_base: PairedSkill;
  skill_market: PairedSkill;
  tier: Tier;
  label: "counts" | "provisional" | "full";
}

export interface CalibrationReport { shown: boolean; n_clusters: number; bins: CalibrationBin[]; murphy: Murphy | null; murphy_shown: boolean }

export interface Composition {
  found: number; sincere: number; admitted: number; dated: number; undated: number; void: number; not_admitted: number;
  not_admitted_by_reason: Record<string, number>; void_by_reason: Record<string, number>;
  clusters_headline: number; resolved_headline: number; pending_headline: number; known_true_headline: number;
  scoreable_share: Interval | null; undated_share: number | null; affiliated_share: number | null; extreme_bin_share: number | null;
  concentration: number | null; redated_clusters: number; max_deadlines_in_cluster: number; median_lead_months: number | null; prospective_share: number | null;
  by_area: Record<string, number>; by_year: Record<string, number>;
}

export interface TimingReport { n: number; median: number | null; q1: number | null; q3: number | null; values: { key: string; months: number; event_id: string }[] }

export interface SeriesPoint { period: string; n: number; brier: number; cumulative: number; cumulative_n: number }

export interface ForecasterScores {
  slug: ForecasterSlug;
  coverage_tier: "A" | "B" | "C";
  headline: PanelScores;
  headline_non_affiliated: PanelScores | null;
  undated: PanelScores;
  undated_36: PanelScores;
  calibration: CalibrationReport;
  composition: Composition;
  timing: TimingReport;
  by_area: Record<string, { n_clusters: number; brier: Interval | null; n_items: number }>;
  over_time: SeriesPoint[];
  boldness: { mean_abs_p_minus_b: number | null; n: number; mean_abs_p_minus_half: number | null };
  sensitivity: Record<string, { brier: number | null; n_clusters: number; note: string }>;
}
