"use client";
// The Statements ledger: scope chips, facets with conditional counts, one sortable column, 200-row paging.
// URL state: scope=not|all (absent = admitted), f, a, s, p, y, q, r (reason code; implies scope=not), sort=state, n.
// The pure helpers are exported so tests can run them without a router.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type MouseEvent } from "react";
import { Facets, type FacetRow, type Scope } from "@/components/ledger/Facets";
import { ReasonChip } from "@/components/ui/ReasonChip";
import { StateMark } from "@/components/ui/StateMark";
import { Term } from "@/components/ui/Term";
import { STATE_WORD, type LedgerRow, type LedgerState } from "@/lib/data/derive";
import { fmtBrier, fmtDate, fmtInt } from "@/lib/format";
import styles from "./ledger.module.css";

export interface LedgerProps {
  rows: LedgerRow[];
  forecasters: { slug: string; short: string }[];
  areas: { slug: string; short: string }[];
  reasons: { code: string; label: string }[];
  /** Months of the undated window, for the chip on undated rows. */
  undatedMonths: number;
}

export const PAGE_SIZE = 200;

export type FacetKey = "f" | "a" | "s" | "p" | "y" | "r";
export const FACET_KEYS: FacetKey[] = ["f", "a", "s", "p", "y", "r"];
export type Active = Record<FacetKey, string>;

export interface LedgerQuery {
  scope: Scope;
  active: Active;
  q: string;
  sortState: boolean;
  limit: number;
}

interface ParamReader { get(key: string): string | null }

/** Reads the URL state. Old URLs: s=not_admitted means scope=not; r means scope=not. */
export function readQuery(sp: ParamReader): LedgerQuery {
  const r = sp.get("r") ?? "";
  const legacy = sp.get("s") === "not_admitted";
  const scopeParam = sp.get("scope");
  const scope: Scope = r || legacy || scopeParam === "not" ? "not" : scopeParam === "all" ? "all" : "admitted";
  const active: Active = { f: sp.get("f") ?? "", a: sp.get("a") ?? "", s: legacy ? "" : (sp.get("s") ?? ""), p: sp.get("p") ?? "", y: sp.get("y") ?? "", r };
  const n = Number(sp.get("n"));
  return { scope, active, q: sp.get("q") ?? "", sortState: sp.get("sort") === "state", limit: Number.isFinite(n) && n > PAGE_SIZE ? Math.floor(n) : PAGE_SIZE };
}

/** Facet states in rank order. "pending" also covers unresolved items. */
export const STATE_FACET: { id: string; label: string; term?: string }[] = [
  { id: "true", label: STATE_WORD.true },
  { id: "false", label: STATE_WORD.false },
  { id: "known_true", label: STATE_WORD.known_true, term: "known true" },
  { id: "pending", label: STATE_WORD.pending, term: "pending" },
  { id: "void", label: STATE_WORD.void, term: "void" },
  { id: "not_admitted", label: STATE_WORD.not_admitted, term: "not admitted" },
];

export const stateMatches = (row: LedgerRow, s: string): boolean => (s === "pending" ? row.s === "pending" || row.s === "unresolved" : row.s === s);

/** The word in the State cell. Unresolved folds into Pending. */
export const stateWord = (s: LedgerState): string => (s === "unresolved" ? STATE_WORD.pending : STATE_WORD[s]);

/** The glyph beside the word. Known true shows the solid mark: the event has happened. */
export const stateGlyph = (s: LedgerState): "true" | "false" | "pending" | "void" => (s === "true" || s === "known_true" ? "true" : s === "false" ? "false" : s === "void" ? "void" : "pending");

export const inScope = (row: LedgerRow, scope: Scope): boolean => (scope === "all" ? true : scope === "not" ? row.s === "not_admitted" : row.s !== "not_admitted");

export const matchesSearch = (row: LedgerRow, needle: string): boolean => !needle || `${row.q} ${row.t} ${row.rl} ${row.e}`.toLowerCase().includes(needle);

const facetTest = (row: LedgerRow, k: FacetKey, v: string): boolean =>
  k === "f" ? row.f === v : k === "a" ? row.a === v : k === "s" ? stateMatches(row, v) : k === "p" ? row.pn === v : k === "y" ? String(row.y) === v : row.r === v;

/** Whether a row matches every active facet, with one facet left out. */
export function facetMatch(row: LedgerRow, active: Active, except: FacetKey | null): boolean {
  return FACET_KEYS.every((k) => !active[k] || k === except || facetTest(row, k, active[k]));
}

/** Rows in the scope and the search that match every active facet. */
export function filterRows(rows: LedgerRow[], query: Pick<LedgerQuery, "scope" | "q" | "active">): LedgerRow[] {
  const needle = query.q.trim().toLowerCase();
  return rows.filter((row) => inScope(row, query.scope) && matchesSearch(row, needle) && facetMatch(row, query.active, null));
}

const saidDesc = (x: LedgerRow, z: LedgerRow): number => (x.d > z.d ? -1 : x.d < z.d ? 1 : x.id < z.id ? -1 : x.id > z.id ? 1 : 0);

/** State rank (true, false, known true, pending, void, not admitted), then said date descending. */
export function sortRows(list: LedgerRow[], sortState: boolean): LedgerRow[] {
  return sortState ? [...list].sort((x, z) => x.sr - z.sr || saidDesc(x, z)) : list;
}

export interface FacetSource {
  forecasters: { slug: string; short: string }[];
  areas: { slug: string; short: string }[];
  reasons: { code: string; label: string }[];
  years: number[];
}

/** Facet rows for a scope. Counts run on the rows in scope and in the search that match every other active facet. */
export function buildFacets(scoped: LedgerRow[], active: Active, scope: Scope, src: FacetSource): FacetRow[] {
  const count = (key: FacetKey, pick: (row: LedgerRow) => boolean) => scoped.filter((row) => facetMatch(row, active, key) && pick(row)).length;
  const rows: FacetRow[] = [{ key: "f", label: "Forecaster", value: active.f || null, options: src.forecasters.map((f) => ({ id: f.slug, label: f.short, count: count("f", (row) => row.f === f.slug) })) }];
  if (scope !== "not") {
    const states = STATE_FACET.filter((s) => scope === "all" || s.id !== "not_admitted");
    rows.push({ key: "s", label: "State", value: active.s || null, options: states.map((s) => ({ id: s.id, label: s.label, term: s.term, count: count("s", (row) => stateMatches(row, s.id)) })) });
  }
  if (scope === "not") {
    rows.push({ key: "r", label: "Reason", value: active.r || null, options: src.reasons.map((x) => ({ id: x.code, label: x.label, reason: true, count: count("r", (row) => row.r === x.code) })) });
  }
  if (scope !== "not") {
    rows.push({ key: "a", label: "Area", value: active.a || null, options: src.areas.map((a) => ({ id: a.slug, label: a.short, count: count("a", (row) => row.a === a.slug) })) });
    rows.push({
      key: "p",
      label: "Panel",
      value: active.p || null,
      options: [
        { id: "dated", label: "Dated", term: "dated view", count: count("p", (row) => row.pn === "dated") },
        { id: "undated", label: "Undated", term: "undated panel", count: count("p", (row) => row.pn === "undated") },
      ],
    });
  }
  rows.push({ key: "y", label: "Year", value: active.y || null, options: src.years.map((y) => ({ id: String(y), label: String(y), count: count("y", (row) => row.y === y) })) });
  return rows;
}

/** Row totals behind the three scope chips. */
export function scopeCounts(rows: LedgerRow[]): Record<Scope, number> {
  const not = rows.filter((row) => row.s === "not_admitted").length;
  return { admitted: rows.length - not, not, all: rows.length };
}

/** Years present in the rows, newest first. */
export function yearsOf(rows: LedgerRow[]): number[] {
  return [...new Set(rows.map((row) => row.y))].sort((x, z) => z - x);
}

/** The href of the "Show 200 more" chip: the same query with n raised by one page. */
export function showMoreHref(pathname: string, sp: ParamReader & { toString(): string }, limit: number): string {
  const next = new URLSearchParams(sp.toString());
  next.set("n", String(limit + PAGE_SIZE));
  return `${pathname}?${next}`;
}

/** The query after a scope change: r only in the not scope; s, a and p never in the not scope; n reset. */
export function scopeQuery(sp: { toString(): string }, scope: Scope): string {
  const next = new URLSearchParams(sp.toString());
  if (scope === "admitted") next.delete("scope");
  else next.set("scope", scope);
  if (scope !== "not") next.delete("r");
  if (scope === "not") for (const k of ["s", "a", "p"]) next.delete(k);
  next.delete("n");
  return next.toString();
}

export function Ledger({ rows, forecasters, areas, reasons, undatedMonths }: LedgerProps) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => readQuery(sp), [sp]);
  const { scope, active, q, sortState, limit } = query;

  const go = (search: string) => router.replace(`${pathname}${search ? `?${search}` : ""}`, { scroll: false });
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("n");
    go(next.toString());
  };
  const setScope = (s: Scope) => go(scopeQuery(sp, s));

  const scoped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => inScope(row, scope) && matchesSearch(row, needle));
  }, [rows, scope, q]);
  const shown = useMemo(() => sortRows(scoped.filter((row) => facetMatch(row, active, null)), sortState), [scoped, active, sortState]);
  const facets = buildFacets(scoped, active, scope, { forecasters, areas, reasons, years: yearsOf(rows) });
  const totals = useMemo(() => scopeCounts(rows), [rows]);

  const open = (e: MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(`/predictions/${id}`);
  };
  const page = shown.slice(0, limit);
  const notLayout = scope === "not";

  return (
    <div>
      <Facets scope={scope} scopeCounts={totals} facets={facets} q={q} onScope={setScope} onFacet={setParam} onSearch={(v) => setParam("q", v)} />
      <p className="count-line">{fmtInt(shown.length)} shown</p>
      <table className="ledger">
        <thead>
          <tr>
            {notLayout ? null : (
              <th className={sortState ? "ledger-state is-sorted" : "ledger-state"}>
                <Term t="outcome">State</Term>
                <button type="button" className="sort" aria-pressed={sortState} aria-label="Sort by state" onClick={() => setParam("sort", sortState ? null : "state")}>
                  {sortState ? "▾" : "▿"}
                </button>
              </th>
            )}
            <th className="ledger-said">Said</th>
            <th className="ledger-who">Who</th>
            <th className="ledger-quote">Statement</th>
            {notLayout ? (
              <th className="ledger-reason">
                <Term t="reason code" side="end">
                  Reason
                </Term>
              </th>
            ) : (
              <>
                <th className="ledger-due">
                  <Term t="deadline">Due</Term>
                </th>
                <th className="ledger-p">
                  <Term t="lexicon" side="end">
                    P
                  </Term>
                </th>
                <th className="ledger-brier">
                  <Term t="Brier score" side="end">
                    Brier
                  </Term>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {page.map((row) => {
            const out = row.s === "not_admitted";
            const href = `/predictions/${row.id}`;
            return (
              <tr key={row.id} className={`ledger-row ${out ? "ledger-row--out " : ""}${styles.row}`} onClick={(e) => open(e, row.id)}>
                {notLayout ? null : (
                  <td className="ledger-state">
                    {out ? (
                      STATE_WORD.not_admitted
                    ) : (
                      <span className={styles.stateCell}>
                        <StateMark state={stateGlyph(row.s)} /> {stateWord(row.s)}
                      </span>
                    )}
                    {row.kt ? <span className="ledger-kt">Due {fmtDate(row.kt)}</span> : null}
                  </td>
                )}
                <td className="ledger-said">{fmtDate(row.d)}</td>
                <td className="ledger-who">
                  <Link href={`/forecasters/${row.f}`}>{row.fn}</Link>
                </td>
                <td className="ledger-quote">
                  <Link className={notLayout ? "clamp clamp--1" : "clamp"} href={href}>
                    &ldquo;{row.q}&rdquo;
                  </Link>
                  {row.t ? (
                    <span className="ledger-event">
                      <Link href={`/events#${row.e}`}>{row.t}</Link> · {row.e}
                    </span>
                  ) : null}
                  {out && !notLayout && row.r ? (
                    <span className="ledger-event">
                      <ReasonChip code={row.r} />
                    </span>
                  ) : null}
                </td>
                {notLayout ? (
                  <td className="ledger-reason">{row.r ? <ReasonChip code={row.r} /> : null}</td>
                ) : (
                  <>
                    <td className="ledger-due">
                      {out ? null : (
                        <>
                          {fmtDate(row.dl)}
                          {row.pn === "undated" ? <span className={`chip chip--hollow ${styles.undated}`}>{fmtInt(undatedMonths)} m</span> : null}
                        </>
                      )}
                    </td>
                    <td className="ledger-p">{out || row.p === null ? null : row.p.toFixed(2)}</td>
                    <td className="ledger-brier">{out ? null : fmtBrier(row.b)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown.length > limit ? (
        <p className={styles.more}>
          <Link className="chip chip--hollow" href={showMoreHref(pathname, sp, limit)} scroll={false} replace>
            Show {fmtInt(PAGE_SIZE)} more
          </Link>
        </p>
      ) : null}
    </div>
  );
}
