import { describe, expect, it } from "vitest";
import { loadDatasetUncached } from "@/lib/data/load";
import type { Dataset, Item, Outcome, RegistryEvent, Statement } from "@/lib/data/schema";
import { buildScoredItems, binMapOf, timeWeightedP, computePanel, computeScores, clusterize } from "@/lib/score";

const AS_OF = "2026-09-13";

function base(): Dataset {
  const ds = loadDatasetUncached();
  return { ...ds, version: { ...ds.version, as_of: AS_OF }, statements: [], items: [], coder_b: [], registry: [], timeline: [], outcomes: [], rechecks: [], market_refs: [], corrections: [] };
}
function ev(id: string, over: Partial<RegistryEvent> = {}): RegistryEvent {
  return { id, template: "drug_approval", area: "regulatory", asset: "X", entity: "FDA", title: `FDA approves ${id}`, proposition: `FDA approves ${id}.`, criterion: "Approval letter dated.", resolution_source: { name: "Drugs@FDA" }, base_rate_class: null, market_ref_id: null, quantity: null, readings: [], created_by: "test", created_at: "2026-09-13", version: "1.0.0", ...over };
}
let n = 0;
function stmt(forecaster: Statement["forecaster"], date: string, over: Partial<Statement> = {}): Statement {
  n++;
  const id = `${forecaster}-${String(n).padStart(4, "0")}`;
  return { id, forecaster, statement_date: date, quote: `Quote number ${n} about the future.`, source: { url: "https://example.com/p", title: "t", type: "substack_post" }, extraction: { run: "t", sincere: true, own_claim: true, normative: false, forward_looking: true }, status: "admitted", ...over };
}
function item(s: Statement, event_id: string, deadline: string | null, p: number, over: Partial<Item> = {}): Item {
  const undated = deadline === null;
  return {
    id: s.id, forecaster: s.forecaster, statement_date: s.statement_date, quote: s.quote, source: s.source, area: "regulatory", event_id, condition_event_id: null, asserts: true,
    deadline, deadline_origin: undated ? null : "anchor", deadline_text: undated ? null : "by year end", panel: undated ? "undated" : "headline",
    p, p_origin: "lexicon", bin: p >= 0.8 ? "A" : p >= 0.6 ? "B" : p >= 0.4 ? "C" : p >= 0.2 ? "D" : "E", phrase: "will", stated_number: null, tags: ["retrospective"], base_rate: null, market_ref_id: null,
    coder: "A", rule_version: "1.0.0", intake_at: "2026-09-13", hindsight_scan: "clean", version: 1, history: [], ...over,
  };
}
const notOccurred = (event_id: string): Outcome => ({ event_id, state: "not_occurred", date: null, checked_through: AS_OF, realized_value: null, evidence: [{ url: "https://example.com/e", title: "check", accessed: AS_OF }], note: "not yet", resolver: "R", resolved_at: AS_OF, version: 1 });
const occurred = (event_id: string, date: string): Outcome => ({ event_id, state: "occurred", date, checked_through: AS_OF, realized_value: null, evidence: [{ url: "https://example.com/e", title: "letter", date, accessed: AS_OF }], note: "done", resolver: "R", resolved_at: AS_OF, version: 1 });

describe("time-weighted p", () => {
  it("weights each value by the days it stood", () => {
    const p = timeWeightedP([{ date: "2024-01-01", p: 0.9 }, { date: "2024-07-01", p: 0.5 }], "2024-12-31");
    expect(p).toBeCloseTo((182 * 0.9 + 183 * 0.5) / 365, 6);
  });
  it("a single statement keeps its p", () => {
    expect(timeWeightedP([{ date: "2024-01-01", p: 0.7 }], "2024-12-31")).toBe(0.7);
  });
});

describe("resolution and clusters", () => {
  const ds = base();
  const map = binMapOf(ds.lexicon);
  const opts = { asOf: AS_OF, thresholds: ds.thresholds, map };

  it("Doblin worked case: six dated misses, one cluster, Brier 0.757", () => {
    const s = ["2017-09-05", "2018-06-01", "2021-01-15", "2022-02-01", "2023-06-20", "2024-06-06"].map((d) => stmt("doblin", d));
    const deadlines = ["2021-12-31", "2022-12-31", "2023-06-30", "2023-12-31", "2024-05-31", "2024-08-31"];
    const items = s.map((st, i) => item(st, "E-0001", deadlines[i], i === 5 ? 0.7 : 0.9));
    const scored = buildScoredItems(items, new Map([["E-0001", notOccurred("E-0001")]]), new Map(), opts);
    expect(scored).toHaveLength(6);
    expect(scored.every((i) => i.state === "false")).toBe(true);
    const clusters = clusterize(scored);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].brier!).toBeCloseTo((5 * 0.81 + 0.49) / 6, 9);
    expect(clusters[0].deadlines).toBe(6);
  });

  it("window-close rule: a known outcome stays out of the score until the deadline", () => {
    const st = stmt("owen", "2026-01-01");
    const scored = buildScoredItems([item(st, "E-0002", "2026-12-31", 0.9)], new Map([["E-0002", occurred("E-0002", "2026-02-10")]]), new Map(), opts);
    expect(scored[0].state).toBe("known_true");
    expect(scored[0].o).toBeNull();
    expect(scored[0].brier).toBeNull();
  });

  it("an event after the deadline is FALSE with a timing error", () => {
    const st = stmt("owen", "2023-01-01");
    const scored = buildScoredItems([item(st, "E-0003", "2023-12-31", 0.9)], new Map([["E-0003", occurred("E-0003", "2024-03-15")]]), new Map(), opts);
    expect(scored[0].state).toBe("false");
    expect(scored[0].brier!).toBeCloseTo(0.81, 9);
    expect(scored[0].timing_months).toBe(3);
  });

  it("restatements of the same deadline merge into one item with time-weighted p", () => {
    const a = stmt("owen", "2024-01-01"), b = stmt("owen", "2024-07-01");
    const items = [item(a, "E-0004", "2024-12-31", 0.9), item(b, "E-0004", "2024-12-31", 0.5, { bin: "C", phrase: "may" })];
    const scored = buildScoredItems(items, new Map([["E-0004", occurred("E-0004", "2024-10-01")]]), new Map(), opts);
    expect(scored).toHaveLength(1);
    expect(scored[0].statement_ids).toHaveLength(2);
    expect(scored[0].p).toBeCloseTo((182 * 0.9 + 183 * 0.5) / 365, 6);
    expect(scored[0].state).toBe("true");
  });

  it("a denial takes p(E) = 1 - bin and is punished when the event happens", () => {
    const st = stmt("owen", "2023-01-01");
    const it = item(st, "E-0005", "2023-12-31", 0.1, { asserts: false, tags: ["denial", "retrospective"], bin: "A" });
    const scored = buildScoredItems([it], new Map([["E-0005", occurred("E-0005", "2023-06-01")]]), new Map(), opts);
    expect(scored[0].state).toBe("true");
    expect(scored[0].brier!).toBeCloseTo(0.81, 9);
  });

  it("conditional items void when the condition did not occur", () => {
    const st = stmt("owen", "2023-01-01");
    const it = item(st, "E-0006", "2023-12-31", 0.9, { condition_event_id: "E-0007", tags: ["conditional", "retrospective"] });
    const outcomes = new Map([["E-0006", occurred("E-0006", "2023-05-01")], ["E-0007", notOccurred("E-0007")]]);
    const scored = buildScoredItems([it], outcomes, new Map(), opts);
    expect(scored[0].state).toBe("void");
    expect(scored[0].void_reason).toBe("CONDITION_UNMET");
  });

  it("undated items get a 24-month window and score at window close", () => {
    const st = stmt("owen", "2023-03-15");
    const it = item(st, "E-0008", null, 0.9);
    const scored = buildScoredItems([it], new Map([["E-0008", occurred("E-0008", "2024-06-01")]]), new Map(), opts);
    expect(scored[0].deadline).toBe("2025-03-15");
    expect(scored[0].panel).toBe("undated");
    expect(scored[0].state).toBe("true");
    const later = buildScoredItems([it], new Map([["E-0008", occurred("E-0008", "2025-06-01")]]), new Map(), opts);
    expect(later[0].state).toBe("false");
  });

  it("a window that closed without a registry outcome is listed as unresolved, not scored", () => {
    const st = stmt("owen", "2022-01-01");
    const scored = buildScoredItems([item(st, "E-0009", "2022-12-31", 0.9)], new Map(), new Map(), opts);
    expect(scored[0].state).toBe("unresolved");
  });
});

describe("panel scores and tiers", () => {
  const ds = base();
  const map = binMapOf(ds.lexicon);
  const opts = { asOf: AS_OF, thresholds: ds.thresholds, map };

  function synthetic(count: number, hitEvery: number) {
    const items: Item[] = [];
    const outcomes = new Map<string, Outcome>();
    for (let i = 0; i < count; i++) {
      const id = `E-${String(100 + i).padStart(4, "0")}`;
      const st = stmt("owen", "2022-01-10");
      items.push(item(st, id, "2022-12-31", 0.9, { base_rate: { class: "nda_submitted_to_approval", p_raw: 0.906, p: 0.906, halved: false, median_months: 10 } }));
      outcomes.set(id, i % hitEvery === 0 ? occurred(id, "2022-06-01") : notOccurred(id));
    }
    return { items, outcomes };
  }

  it("fewer than 10 clusters shows counts only", () => {
    const { items, outcomes } = synthetic(6, 2);
    const panel = computePanel(buildScoredItems(items, outcomes, new Map(), opts), ds.thresholds, 1);
    expect(panel.tier).toBe("T0");
    expect(panel.brier).toBeNull();
    expect(panel.n_true + panel.n_false).toBe(6);
  });

  it("12 clusters is provisional with an interval that contains the point", () => {
    const { items, outcomes } = synthetic(12, 3);
    const scored = buildScoredItems(items, outcomes, new Map(), opts);
    const panel = computePanel(scored, ds.thresholds, ds.thresholds.bootstrap_seed);
    expect(panel.tier).toBe("T1");
    expect(panel.label).toBe("provisional");
    expect(panel.brier).not.toBeNull();
    expect(panel.brier!.lo).toBeLessThanOrEqual(panel.brier!.point);
    expect(panel.brier!.hi).toBeGreaterThanOrEqual(panel.brier!.point);
    expect(panel.brier!.point).toBeCloseTo((4 * 0.01 + 8 * 0.81) / 12, 9);
    expect(panel.hit.hits).toBe(4);
    expect(panel.skill_base.n_clusters).toBe(12);
    expect(panel.skill_base.value).not.toBeNull();
    expect(panel.skill_base.ref_brier!).toBeCloseTo((4 * 0.094 ** 2 + 8 * 0.906 ** 2) / 12, 9);
    const again = computePanel(scored, ds.thresholds, ds.thresholds.bootstrap_seed);
    expect(again).toEqual(panel);
  });

  it("computeScores runs end to end and builds reference rows", () => {
    const { items, outcomes } = synthetic(12, 3);
    const statements = items.map((it) => stmt("owen", it.statement_date, { id: it.id, quote: it.quote }));
    const dsFull: Dataset = { ...ds, statements, items, registry: [...outcomes.keys()].map((id) => ev(id)), outcomes: [...outcomes.values()] };
    const snap = computeScores(dsFull);
    expect(snap.forecasters.owen.headline.tier).toBe("T1");
    const rows = snap.leaderboard;
    expect(rows.find((r) => r.slug === "base-rate")!.n_clusters).toBe(12);
    expect(rows.find((r) => r.slug === "owen")!.rank).toBeNull();
    expect(snap.status.owen.true).toBe(4);
    expect(snap.forecasters.owen.composition.scoreable_share!.point).toBe(1);
  });
});
