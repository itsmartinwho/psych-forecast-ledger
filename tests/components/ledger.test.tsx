// Statements ledger: the pure helpers behind the scope chips, the facets, the sort and the paging, and the Facets markup.
import { describe, expect, it } from "vitest";
import { renderMarkup } from "@/lib/testing/markup";
import { Facets, SCOPE_LABEL, SEARCH_PLACEHOLDER, chipPopover, visibleOptions, type FacetRow } from "@/components/ledger/Facets";
import { PAGE_SIZE, buildFacets, filterRows, readQuery, scopeCounts, scopeQuery, showMoreHref, sortRows, stateGlyph, stateWord, yearsOf, type Active } from "@/components/ledger/Ledger";
import type { LedgerRow } from "@/lib/data/derive";
import { STATE_RANK } from "@/lib/data/derive";

const base: LedgerRow = { id: "S-0", f: "muir", fn: "Muir", d: "2024-01-01", y: 2024, a: "regulatory", s: "pending", r: "", rl: "", p: 0.7, b: null, pn: "dated", dl: "2025-01-01", kt: "", sr: STATE_RANK.pending, t: "Event", e: "E-1", q: "quote" };
const row = (o: Partial<LedgerRow>): LedgerRow => ({ ...base, ...o, sr: STATE_RANK[o.s ?? base.s] });

const rows: LedgerRow[] = [
  row({ id: "S-1", s: "true", d: "2023-06-01", y: 2023, b: 0.09 }),
  row({ id: "S-2", s: "false", d: "2024-02-01", a: "trials", pn: "undated" }),
  row({ id: "S-3", s: "known_true", d: "2024-03-01", kt: "2026-12-31" }),
  row({ id: "S-4", s: "pending", d: "2025-01-01", y: 2025, f: "doblin", fn: "Doblin" }),
  row({ id: "S-5", s: "void", d: "2025-02-01", y: 2025, r: "VOID_EVENT", rl: "Void event" }),
  row({ id: "S-6", s: "not_admitted", d: "2025-03-01", y: 2025, a: "", pn: "", r: "VAGUE", rl: "Vague or promotional", t: "", e: "", q: "hype" }),
  row({ id: "S-7", s: "not_admitted", d: "2022-03-01", y: 2022, a: "", pn: "", r: "CONTROL", rl: "Commitment (own venture)", t: "", e: "", f: "doblin", fn: "Doblin" }),
  row({ id: "S-8", s: "unresolved", d: "2024-04-01" }),
];

const none: Active = { f: "", a: "", s: "", p: "", y: "", r: "" };
const src = {
  forecasters: [
    { slug: "muir", short: "Muir" },
    { slug: "doblin", short: "Doblin" },
  ],
  areas: [
    { slug: "regulatory", short: "Regulatory" },
    { slug: "trials", short: "Trials" },
    { slug: "payer", short: "Payer" },
  ],
  reasons: [
    { code: "VAGUE", label: "Vague or promotional" },
    { code: "CONTROL", label: "Commitment (own venture)" },
    { code: "OUT_OF_AREA", label: "Outside the five areas" },
  ],
  years: yearsOf(rows),
};
const facetOf = (list: FacetRow[], key: string) => list.find((f) => f.key === key);
const countOf = (list: FacetRow[], key: string, id: string) => facetOf(list, key)?.options.find((o) => o.id === id)?.count;

describe("readQuery", () => {
  it("defaults to the admitted scope, the first page and the said sort", () => {
    const q = readQuery(new URLSearchParams(""));
    expect(q.scope).toBe("admitted");
    expect(q.limit).toBe(PAGE_SIZE);
    expect(q.sortState).toBe(false);
    expect(q.active).toEqual(none);
  });
  it("reads scope, facets, search, sort and paging", () => {
    const q = readQuery(new URLSearchParams("scope=all&f=muir&s=true&a=trials&p=dated&y=2024&q=fda&sort=state&n=400"));
    expect(q.scope).toBe("all");
    expect(q.active).toEqual({ f: "muir", a: "trials", s: "true", p: "dated", y: "2024", r: "" });
    expect(q.q).toBe("fda");
    expect(q.sortState).toBe(true);
    expect(q.limit).toBe(400);
  });
  it("maps the old s=not_admitted to scope=not and drops it as a state facet", () => {
    const q = readQuery(new URLSearchParams("s=not_admitted"));
    expect(q.scope).toBe("not");
    expect(q.active.s).toBe("");
  });
  it("puts a reason code in the not scope", () => {
    expect(readQuery(new URLSearchParams("r=VAGUE")).scope).toBe("not");
    expect(readQuery(new URLSearchParams("scope=all&r=VAGUE")).scope).toBe("not");
  });
  it("ignores a page size under one page or not a number", () => {
    expect(readQuery(new URLSearchParams("n=50")).limit).toBe(PAGE_SIZE);
    expect(readQuery(new URLSearchParams("n=abc")).limit).toBe(PAGE_SIZE);
  });
});

describe("scope and filters", () => {
  it("counts admitted rows as status admitted or void", () => {
    expect(scopeCounts(rows)).toEqual({ admitted: 6, not: 2, all: 8 });
  });
  it("keeps only the scope's rows, then the active facets", () => {
    expect(filterRows(rows, { scope: "admitted", q: "", active: none }).map((r) => r.id)).toEqual(["S-1", "S-2", "S-3", "S-4", "S-5", "S-8"]);
    expect(filterRows(rows, { scope: "not", q: "", active: none }).map((r) => r.id)).toEqual(["S-6", "S-7"]);
    expect(filterRows(rows, { scope: "all", q: "", active: { ...none, f: "doblin" } }).map((r) => r.id)).toEqual(["S-4", "S-7"]);
    expect(filterRows(rows, { scope: "admitted", q: "", active: { ...none, s: "pending" } }).map((r) => r.id)).toEqual(["S-4", "S-8"]);
  });
  it("searches the quote, the event title, the event id and the reason label", () => {
    expect(filterRows(rows, { scope: "all", q: "HYPE", active: none }).map((r) => r.id)).toEqual(["S-6"]);
    expect(filterRows(rows, { scope: "not", q: "own venture", active: none }).map((r) => r.id)).toEqual(["S-7"]);
    expect(filterRows(rows, { scope: "admitted", q: "e-1", active: none })).toHaveLength(6);
  });
});

describe("buildFacets", () => {
  it("shows Forecaster, State, Area, Panel and Year in the admitted scope, no Reason", () => {
    const list = buildFacets(filterRows(rows, { scope: "admitted", q: "", active: none }), none, "admitted", src);
    expect(list.map((f) => f.key)).toEqual(["f", "s", "a", "p", "y"]);
    expect(list.map((f) => f.label)).toEqual(["Forecaster", "State", "Area", "Panel", "Year"]);
    expect(facetOf(list, "s")?.options.map((o) => o.id)).toEqual(["true", "false", "known_true", "pending", "void"]);
    expect(countOf(list, "s", "pending")).toBe(2);
    expect(countOf(list, "a", "payer")).toBe(0);
    expect(countOf(list, "p", "undated")).toBe(1);
  });
  it("shows Forecaster, Reason and Year in the not-admitted scope", () => {
    const list = buildFacets(filterRows(rows, { scope: "not", q: "", active: none }), none, "not", src);
    expect(list.map((f) => f.key)).toEqual(["f", "r", "y"]);
    expect(countOf(list, "r", "VAGUE")).toBe(1);
    expect(countOf(list, "r", "OUT_OF_AREA")).toBe(0);
    expect(facetOf(list, "r")?.options[0].reason).toBe(true);
  });
  it("adds Not admitted to the State facet in the all scope", () => {
    const list = buildFacets(rows, none, "all", src);
    expect(countOf(list, "s", "not_admitted")).toBe(2);
    expect(facetOf(list, "r")).toBeUndefined();
  });
  it("counts each facet on the rows that match every other active facet", () => {
    const active = { ...none, f: "doblin" };
    const scoped = rows.filter((r) => r.s !== "not_admitted");
    const list = buildFacets(scoped, active, "admitted", src);
    expect(countOf(list, "f", "muir")).toBe(5);
    expect(countOf(list, "f", "doblin")).toBe(1);
    expect(countOf(list, "s", "pending")).toBe(1);
    expect(countOf(list, "y", "2024")).toBe(0);
    expect(countOf(list, "y", "2025")).toBe(1);
  });
  it("lists years newest first", () => {
    expect(yearsOf(rows)).toEqual([2025, 2024, 2023, 2022]);
  });
});

describe("visibleOptions", () => {
  it("hides a zero count unless it is the selected value", () => {
    const facet: FacetRow = { key: "a", label: "Area", value: "payer", options: [{ id: "trials", label: "Trials", count: 0 }, { id: "payer", label: "Payer", count: 0 }, { id: "regulatory", label: "Regulatory", count: 3 }] };
    expect(visibleOptions(facet).map((o) => o.id)).toEqual(["payer", "regulatory"]);
  });
});

describe("sortRows", () => {
  it("ranks true, false, known true, pending, void, not admitted, then said date descending", () => {
    const sorted = sortRows(rows, true).map((r) => r.id);
    expect(sorted).toEqual(["S-1", "S-2", "S-3", "S-4", "S-8", "S-5", "S-6", "S-7"]);
  });
  it("keeps the given order without the state sort", () => {
    expect(sortRows(rows, false)).toBe(rows);
  });
});

describe("state cell", () => {
  it("folds unresolved into Pending and shows the solid mark on known true", () => {
    expect(stateWord("unresolved")).toBe("Pending");
    expect(stateWord("known_true")).toBe("Known true");
    expect(stateGlyph("known_true")).toBe("true");
    expect(stateGlyph("unresolved")).toBe("pending");
  });
});

describe("paging and scope URLs", () => {
  it("raises n by one page and keeps the rest of the query", () => {
    expect(showMoreHref("/predictions", new URLSearchParams("scope=all&f=muir"), PAGE_SIZE)).toBe("/predictions?scope=all&f=muir&n=400");
    expect(showMoreHref("/predictions", new URLSearchParams("n=400"), 400)).toBe("/predictions?n=600");
  });
  it("drops n and the facets that do not apply when the scope changes", () => {
    expect(scopeQuery(new URLSearchParams("scope=not&r=VAGUE&n=400"), "admitted")).toBe("");
    expect(scopeQuery(new URLSearchParams("s=true&a=trials&p=dated&y=2024"), "not")).toBe("y=2024&scope=not");
    expect(scopeQuery(new URLSearchParams("r=VAGUE"), "all")).toBe("scope=all");
  });
});

describe("Facets markup", () => {
  const list = buildFacets(filterRows(rows, { scope: "admitted", q: "", active: none }), { ...none, s: "pending" }, "admitted", src);
  const m = renderMarkup(<Facets scope="admitted" scopeCounts={scopeCounts(rows)} facets={list} q="" onScope={() => {}} onFacet={() => {}} onSearch={() => {}} />);
  it("renders the three scope chips with counts and the search box", () => {
    expect(m).toContain(`${SCOPE_LABEL.admitted} 6`);
    expect(m).toContain(`${SCOPE_LABEL.not} 2`);
    expect(m).toContain(`${SCOPE_LABEL.all} 8`);
    expect(m).toContain(`placeholder="${SEARCH_PLACEHOLDER}"`);
  });
  it("marks the selected chip and puts no link inside a button", () => {
    expect(m).toMatch(/<button[^>]*class="chip chip--on term-link"[^>]*aria-pressed="true"[^>]*>Pending 2<\/button>/);
    expect(m).toMatch(/<button[^>]*class="chip chip--on term-link"[^>]*>Admitted 6<\/button>/);
    expect(m).toMatch(/<button[^>]*class="chip chip--hollow"[^>]*>All 8<\/button>/);
    expect(m).not.toMatch(/<button[^>]*>[^<]*<a /);
  });
  it("hides zero-count chips and keeps the facet labels", () => {
    expect(m).not.toContain("Payer");
    expect(m).toContain('class="facet-label">Forecaster<');
    expect(m).toContain('class="facet-label">Panel<');
  });
  it("gives a term chip a popover with the Method link", () => {
    expect(m).toContain('href="/methodology#g-admitted"');
    expect(m).toContain('href="/methodology#g-known-true"');
    expect(m).toContain('role="tooltip"');
  });
});

describe("chipPopover", () => {
  it("resolves a glossary term and a reason code, and throws on unknown ones", () => {
    expect(chipPopover({ id: "admitted", term: "admitted" })?.href).toBe("/methodology#g-admitted");
    expect(chipPopover({ id: "VAGUE", reason: true })?.href).toBe("/methodology#rc-VAGUE");
    expect(chipPopover({ id: "x" })).toBeNull();
    expect(() => chipPopover({ id: "x", term: "no such term" })).toThrow();
    expect(() => chipPopover({ id: "NOPE", reason: true })).toThrow();
  });
});
