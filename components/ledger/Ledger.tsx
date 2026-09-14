"use client";
// The Statements ledger: scope chips, facets with conditional counts, one sortable column, 200-row paging.
// URL state: scope=not|all (absent = admitted), f, a, s, p, y, q, r (reason code; implies scope=not), sort=state, n.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type MouseEvent } from "react";
import { Facets, type FacetRow, type Scope } from "@/components/ledger/Facets";
import { ReasonChip } from "@/components/ui/ReasonChip";
import { StateMark } from "@/components/ui/StateMark";
import { Term } from "@/components/ui/Term";
import { STATE_WORD, type LedgerRow, type LedgerState } from "@/lib/data/derive";
import { fmtDate, fmtInt } from "@/lib/format";

export interface LedgerProps {
  rows: LedgerRow[];
  forecasters: { slug: string; short: string }[];
  areas: { slug: string; short: string }[];
  reasons: { code: string; label: string }[];
  /** Months of the undated window, for the chip on undated rows. */
  undatedMonths: number;
}

export const PAGE_SIZE = 200;

/** Facet states in rank order. "pending" also covers unresolved items. */
const STATE_FACET: { id: string; label: string; term?: string }[] = [
  { id: "true", label: STATE_WORD.true },
  { id: "false", label: STATE_WORD.false },
  { id: "known_true", label: STATE_WORD.known_true, term: "known true" },
  { id: "pending", label: STATE_WORD.pending, term: "pending" },
  { id: "void", label: STATE_WORD.void, term: "void" },
  { id: "not_admitted", label: STATE_WORD.not_admitted, term: "not admitted" },
];

const stateMatches = (r: LedgerRow, s: string) => (s === "pending" ? r.s === "pending" || r.s === "unresolved" : r.s === s);
const glyph = (s: LedgerState): "true" | "false" | "pending" | "void" => (s === "true" ? "true" : s === "false" ? "false" : s === "void" ? "void" : "pending");

export function Ledger({ rows, forecasters, areas, reasons, undatedMonths }: LedgerProps) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const r = sp.get("r") ?? "";
  const scopeParam = sp.get("scope");
  const legacy = sp.get("s") === "not_admitted";
  const scope: Scope = r || scopeParam === "not" || legacy ? "not" : scopeParam === "all" ? "all" : "admitted";
  const active: Record<string, string> = { f: sp.get("f") ?? "", a: sp.get("a") ?? "", s: legacy ? "" : (sp.get("s") ?? ""), p: sp.get("p") ?? "", y: sp.get("y") ?? "", r };
  const q = sp.get("q") ?? "";
  const sortState = sp.get("sort") === "state";
  const limit = Math.max(PAGE_SIZE, Number(sp.get("n")) || PAGE_SIZE);

  const replace = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete("n");
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const setParam = (k: string, v: string | null) =>
    replace((next) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
  const setScope = (s: Scope) =>
    replace((next) => {
      if (s === "admitted") next.delete("scope");
      else next.set("scope", s);
      if (s !== "not") next.delete("r");
      if (s === "not") for (const k of ["s", "a", "p"]) next.delete(k);
    });
  const showMore = () => {
    const next = new URLSearchParams(sp.toString());
    next.set("n", String(limit + PAGE_SIZE));
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const inScope = useMemo(() => {
    const test = (row: LedgerRow) => (scope === "all" ? true : scope === "not" ? row.s === "not_admitted" : row.s !== "not_admitted");
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => test(row) && (!needle || `${row.q} ${row.t} ${row.rl} ${row.e}`.toLowerCase().includes(needle)));
  }, [rows, scope, q]);

  const facetMatch = (row: LedgerRow, except: string | null) =>
    Object.entries(active).every(([k, v]) => !v || k === except || (k === "f" ? row.f === v : k === "a" ? row.a === v : k === "s" ? stateMatches(row, v) : k === "p" ? row.pn === v : k === "y" ? String(row.y) === v : row.r === v));

  const shown = useMemo(() => {
    const list = inScope.filter((row) => facetMatch(row, null));
    return sortState ? [...list].sort((x, z) => x.sr - z.sr || (x.d > z.d ? -1 : x.d < z.d ? 1 : 0)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inScope, sortState, active.f, active.a, active.s, active.p, active.y, active.r]);

  const count = (key: string, pick: (row: LedgerRow) => boolean) => inScope.filter((row) => facetMatch(row, key) && pick(row)).length;
  const years = [...new Set(rows.map((row) => row.y))].sort((x, z) => z - x);
  const facets: FacetRow[] = [
    { key: "f", label: "Forecaster", value: active.f || null, options: forecasters.map((f) => ({ id: f.slug, label: f.short, count: count("f", (row) => row.f === f.slug) })) },
    ...(scope !== "not"
      ? [{ key: "s", label: "State", value: active.s || null, options: STATE_FACET.filter((s) => scope === "all" || s.id !== "not_admitted").map((s) => ({ id: s.id, label: s.label, term: s.term, count: count("s", (row) => stateMatches(row, s.id)) })) }]
      : []),
    ...(scope !== "admitted" ? [{ key: "r", label: "Reason", value: active.r || null, options: reasons.map((x) => ({ id: x.code, label: x.label, reason: true, count: count("r", (row) => row.r === x.code) })) }] : []),
    ...(scope !== "not"
      ? [
          { key: "a", label: "Area", value: active.a || null, options: areas.map((a) => ({ id: a.slug, label: a.short, count: count("a", (row) => row.a === a.slug) })) },
          {
            key: "p",
            label: "Panel",
            value: active.p || null,
            options: [
              { id: "dated", label: "Dated", term: "dated view", count: count("p", (row) => row.pn === "dated") },
              { id: "undated", label: "Undated", term: "undated panel", count: count("p", (row) => row.pn === "undated") },
            ],
          },
        ]
      : []),
    { key: "y", label: "Year", value: active.y || null, options: years.map((y) => ({ id: String(y), label: String(y), count: count("y", (row) => row.y === y) })) },
  ];
  const scopeCounts: Record<Scope, number> = {
    admitted: rows.filter((row) => row.s !== "not_admitted").length,
    not: rows.filter((row) => row.s === "not_admitted").length,
    all: rows.length,
  };

  const open = (e: MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(`/predictions/${id}`);
  };
  const page = shown.slice(0, limit);
  const notLayout = scope === "not";

  return (
    <div>
      <Facets scope={scope} scopeCounts={scopeCounts} facets={facets} q={q} onScope={setScope} onFacet={setParam} onSearch={(v) => setParam("q", v)} />
      <p className="count-line">{fmtInt(shown.length)} shown</p>
      <table className="ledger">
        <thead>
          <tr>
            {notLayout ? null : (
              <th className={sortState ? "ledger-state is-sorted" : "ledger-state"}>
                <Term t="outcome" plain>State</Term>
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
                <Term t="reason code" side="end">Reason</Term>
              </th>
            ) : (
              <>
                <th className="ledger-due">
                  <Term t="deadline">Due</Term>
                </th>
                <th className="ledger-p">
                  <Term t="lexicon" side="end">P</Term>
                </th>
                <th className="ledger-brier">
                  <Term t="Brier score" side="end">Brier</Term>
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
              <tr key={row.id} className={out ? "ledger-row ledger-row--out" : "ledger-row"} onClick={(e) => open(e, row.id)}>
                {notLayout ? null : (
                  <td className="ledger-state">
                    {out ? (
                      STATE_WORD.not_admitted
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <StateMark state={glyph(row.s)} /> {STATE_WORD[row.s]}
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
                          {row.pn === "undated" ? (
                            <span className="chip chip--hollow" style={{ marginLeft: 6 }}>
                              {fmtInt(undatedMonths)} m
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="ledger-p">{out || row.p === null ? null : row.p.toFixed(2)}</td>
                    <td className="ledger-brier">{out ? null : row.b === null ? "–" : row.b.toFixed(2)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown.length > limit ? (
        <p style={{ marginTop: 12 }}>
          <button type="button" className="chip chip--hollow" onClick={showMore}>
            Show {fmtInt(PAGE_SIZE)} more
          </button>
        </p>
      ) : null}
    </div>
  );
}
