// View-model checks on the live snapshot: donut totals, the admission funnel, reason rungs, rung units, ledger rows.
import { describe, expect, it } from "vitest";
import { loadDatasetUncached } from "@/lib/data/load";
import { STATE_RANK, STATE_WORD, admissionFunnel, ledgerRows, reasonRungBars, rungUnitFor, statusDonut } from "@/lib/data/derive";
import { computeScores } from "@/lib/score";

const ds = loadDatasetUncached();
const snap = computeScores(ds);
const hero = ds.forecasters.find((f) => f.hero)!;

describe("statusDonut", () => {
  it("total equals the sum of the segments and the centre label is the total", () => {
    for (const key of Object.keys(snap.status)) {
      for (const includeNotAdmitted of [false, true]) {
        const d = statusDonut(snap.status[key], { includeNotAdmitted });
        expect(d.total).toBe(d.segments.reduce((s, x) => s + x.count, 0));
        expect(d.centerLabel).toBe(d.total.toLocaleString("en-US"));
        expect(d.segments.every((s) => s.count > 0)).toBe(true);
      }
    }
  });
  it("lists not admitted only on request", () => {
    const c = snap.status[hero.slug];
    const items = statusDonut(c);
    expect(items.segments.map((s) => s.id)).toEqual(["true", "false", "known_true", "pending", "void"]);
    expect(items.segments.map((s) => s.label)).toEqual(["true", "false", "known true", "pending", "void"]);
    expect(items.total).toBe(c.true + c.false + c.known_true + c.pending + c.unresolved + c.void);
    expect(items.unit).toBe("items");
    const census = statusDonut(snap.status.all, { includeNotAdmitted: true });
    expect(census.segments.at(-1)).toMatchObject({ id: "not_admitted", label: "not admitted", count: snap.status.all.not_admitted });
    expect(census.total).toBe(statusDonut(snap.status.all).total + snap.status.all.not_admitted);
    expect(census.unit).toBe("statements");
  });
});

describe("rungUnitFor", () => {
  it("picks the smallest unit that keeps a ladder at 60 rungs or fewer", () => {
    expect(rungUnitFor(0)).toBe(1);
    expect(rungUnitFor(60)).toBe(1);
    expect(rungUnitFor(61)).toBe(5);
    expect(rungUnitFor(300)).toBe(5);
    expect(rungUnitFor(301)).toBe(10);
    expect(rungUnitFor(852)).toBe(25);
    expect(rungUnitFor(2495)).toBe(50);
    expect(rungUnitFor(6000)).toBe(100);
    expect(rungUnitFor(100000)).toBe(100);
  });
});

describe("admissionFunnel", () => {
  it("counts found, sincere, admitted (with void) and resolved for the census", () => {
    const f = admissionFunnel(ds, snap);
    expect(f.groups.map((g) => g.id)).toEqual(["found", "sincere", "admitted", "resolved"]);
    const c = Object.fromEntries(f.groups.map((g) => [g.id, g.count]));
    expect(c.found).toBe(ds.statements.length);
    expect(c.sincere).toBe(ds.forecasters.reduce((n, x) => n + snap.forecasters[x.slug].composition.sincere, 0));
    expect(c.admitted).toBe(ds.statements.filter((s) => s.status !== "not_admitted").length);
    expect(c.resolved).toBe(snap.items.filter((i) => i.o !== null).length);
    expect(c.found).toBeGreaterThanOrEqual(c.sincere);
    expect(c.sincere).toBeGreaterThanOrEqual(c.admitted);
    expect(c.admitted).toBeGreaterThanOrEqual(c.resolved);
    expect(f.rungUnit).toBe(rungUnitFor(c.found));
    expect(f.unit).toBe("statements");
  });
  it("narrows to one forecaster", () => {
    const f = admissionFunnel(ds, snap, hero.slug);
    const c = Object.fromEntries(f.groups.map((g) => [g.id, g.count]));
    expect(c.found).toBe(ds.statements.filter((s) => s.forecaster === hero.slug).length);
    expect(c.sincere).toBe(snap.forecasters[hero.slug].composition.sincere);
    expect(c.resolved).toBe(snap.items.filter((i) => i.o !== null && i.forecaster === hero.slug).length);
  });
});

describe("reasonRungBars", () => {
  it("sorts the reasons largest first with human labels and filtered links", () => {
    const r = reasonRungBars(ds);
    const counts = r.groups.map((g) => g.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts.reduce((s, x) => s + x, 0)).toBe(ds.statements.filter((s) => s.status === "not_admitted").length);
    const labels = new Map(ds.reason_codes.not_admitted.map((x) => [x.code, x.label]));
    for (const g of r.groups) {
      expect(g.label).toBe(labels.get(g.id as never));
      expect(g.href).toBe(`/predictions?scope=not&r=${g.id}`);
    }
    expect(r.rungUnit).toBe(rungUnitFor(counts[0]));
    const one = reasonRungBars(ds, hero.slug);
    expect(one.groups[0].href).toBe(`/predictions?scope=not&r=${one.groups[0].id}&f=${hero.slug}`);
    expect(one.groups.reduce((s, g) => s + g.count, 0)).toBe(snap.status[hero.slug].not_admitted);
  });
});

describe("ledger rows", () => {
  it("carry Brier, reason label, known-true deadline and state rank", () => {
    expect(STATE_WORD.known_true).toBe("Known true");
    const rows = ledgerRows(ds, snap);
    expect(rows.length).toBe(ds.statements.length);
    const scored = rows.find((r) => r.s === "true" || r.s === "false")!;
    expect(scored.b).not.toBeNull();
    expect(scored.kt).toBe("");
    const kt = rows.find((r) => r.s === "known_true")!;
    expect(kt.kt).toBe(kt.dl);
    expect(kt.b).toBeNull();
    const na = rows.find((r) => r.s === "not_admitted")!;
    expect(na.rl).toBe(ds.reason_codes.not_admitted.find((x) => x.code === na.r)!.label);
    expect(na.b).toBeNull();
    for (const r of rows) expect(r.sr).toBe(STATE_RANK[r.s]);
    expect([STATE_RANK.true, STATE_RANK.false, STATE_RANK.known_true, STATE_RANK.pending, STATE_RANK.void, STATE_RANK.not_admitted]).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
