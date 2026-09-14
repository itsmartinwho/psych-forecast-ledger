import type { Thresholds } from "@/lib/data/schema";
import { bootstrap } from "./bootstrap";
import { mean } from "./brier";
import { clusterize } from "./items";
import type { ScoredItem } from "./model";
import type { Interval } from "./wilson";

export interface SharedEventRow {
  event_id: string;
  forecasters: { slug: string; items: { deadline: string; p: number; state: ScoredItem["state"]; brier: number | null; first_date: string; market_p: number | null }[]; cluster_brier: number | null }[];
}

/** Registry events that two or more forecasters spoke about (every admitted item). */
export function sharedEvents(all: ScoredItem[]): SharedEventRow[] {
  const byEvent = new Map<string, ScoredItem[]>();
  for (const i of all) (byEvent.get(i.event_id) ?? byEvent.set(i.event_id, []).get(i.event_id)!).push(i);
  const rows: SharedEventRow[] = [];
  for (const [event_id, items] of byEvent) {
    const slugs = [...new Set(items.map((i) => i.forecaster))];
    if (slugs.length < 2) continue;
    const clusters = clusterize(items);
    rows.push({
      event_id,
      forecasters: slugs.sort().map((slug) => {
        const c = clusters.find((x) => x.forecaster === slug)!;
        return { slug, cluster_brier: c.brier, items: c.items.sort((a, b) => (a.deadline < b.deadline ? -1 : 1)).map((i) => ({ deadline: i.deadline, p: i.p, state: i.state, brier: i.brier, first_date: i.first_date, market_p: i.market_p })) };
      }),
    });
  }
  return rows.sort((a, b) => (a.event_id < b.event_id ? -1 : 1));
}

export interface PairwiseRow { a: string; b: string; n_events: number; mean_diff: Interval | null; a_better: number; b_better: number; ties: number; shown: boolean }

/** M10: for every pair, d_j = BS_c(a, j) - BS_c(b, j) over shared resolved events; negative favours a. */
export function pairwise(all: ScoredItem[], forecasters: string[], th: Thresholds, seed: number): PairwiseRow[] {
  const clusters = clusterize(all).filter((c) => c.resolved.length > 0);
  const out: PairwiseRow[] = [];
  for (let i = 0; i < forecasters.length; i++) for (let j = i + 1; j < forecasters.length; j++) {
    const a = forecasters[i], b = forecasters[j];
    const diffs: number[] = [];
    let aBetter = 0, bBetter = 0, ties = 0;
    const events = new Set(clusters.filter((c) => c.forecaster === a).map((c) => c.event_id));
    for (const e of events) {
      const ca = clusters.find((c) => c.forecaster === a && c.event_id === e);
      const cb = clusters.find((c) => c.forecaster === b && c.event_id === e);
      if (!ca || !cb || ca.brier === null || cb.brier === null) continue;
      const d = ca.brier - cb.brier;
      diffs.push(d);
      if (d < -1e-12) aBetter++; else if (d > 1e-12) bBetter++; else ties++;
    }
    const shown = diffs.length >= th.shared_event_min;
    out.push({ a, b, n_events: diffs.length, mean_diff: shown ? bootstrap(diffs, (s) => mean(s), { resamples: th.bootstrap_resamples, seed }) : null, a_better: aBetter, b_better: bBetter, ties, shown });
  }
  return out;
}
