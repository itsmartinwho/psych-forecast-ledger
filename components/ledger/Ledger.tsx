"use client";
// The filterable ledger: every statement in the census, filters in the URL, links to each row's page.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { LedgerRow, LedgerState } from "@/lib/data/derive";
import { StateMark } from "@/components/ui/StateMark";

export interface LedgerProps {
  rows: LedgerRow[];
  forecasters: { slug: string; name: string }[];
  areas: { slug: string; name: string }[];
}

const STATES: { id: LedgerState | "all"; label: string }[] = [
  { id: "all", label: "all" }, { id: "true", label: "true" }, { id: "false", label: "false" }, { id: "pending", label: "pending" }, { id: "known_true", label: "known true" }, { id: "void", label: "void" }, { id: "unresolved", label: "awaiting resolution" }, { id: "not_admitted", label: "not admitted" },
];

const chartState = (s: LedgerState): "true" | "false" | "pending" | "void" => (s === "true" ? "true" : s === "false" ? "false" : s === "void" || s === "not_admitted" ? "void" : "pending");

export function Ledger({ rows, forecasters, areas }: LedgerProps) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const f = sp.get("f") ?? "all", a = sp.get("a") ?? "all", s = sp.get("s") ?? "all", y = sp.get("y") ?? "all", pn = sp.get("p") ?? "all", q = (sp.get("q") ?? "").toLowerCase();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v === "all" || v === "") next.delete(k); else next.set(k, v);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const years = useMemo(() => [...new Set(rows.map((r) => r.y))].sort((x, z) => z - x), [rows]);
  const shown = useMemo(() => rows.filter((r) => (f === "all" || r.f === f) && (a === "all" || r.a === a) && (s === "all" || r.s === s) && (y === "all" || String(r.y) === y) && (pn === "all" || r.pn === pn) && (!q || `${r.q} ${r.t} ${r.r}`.toLowerCase().includes(q))), [rows, f, a, s, y, pn, q]);
  const counts = useMemo(() => ({ true: shown.filter((r) => r.s === "true").length, false: shown.filter((r) => r.s === "false").length, pending: shown.filter((r) => r.s === "pending" || r.s === "known_true" || r.s === "unresolved").length, void: shown.filter((r) => r.s === "void").length, not: shown.filter((r) => r.s === "not_admitted").length }), [shown]);
  const sel = (label: string, value: string, opts: { id: string; label: string }[], key: string) => (
    <label className="eyebrow" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      {label}
      <select value={value} onChange={(e) => set(key, e.target.value)} style={{ font: "inherit", fontSize: 11.5, letterSpacing: 0, textTransform: "none", padding: "4px 6px", background: "transparent", border: "0.8px solid var(--color-grid)", borderRadius: 8, color: "inherit" }}>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 14 }}>
        {sel("forecaster", f, [{ id: "all", label: "all" }, ...forecasters.map((x) => ({ id: x.slug, label: x.name }))], "f")}
        {sel("area", a, [{ id: "all", label: "all" }, ...areas.map((x) => ({ id: x.slug, label: x.name }))], "a")}
        {sel("state", s, STATES, "s")}
        {sel("panel", pn, [{ id: "all", label: "all" }, { id: "headline", label: "dated (headline)" }, { id: "undated", label: "undated panel" }], "p")}
        {sel("year", y, [{ id: "all", label: "all" }, ...years.map((yy) => ({ id: String(yy), label: String(yy) }))], "y")}
        <label className="eyebrow" style={{ display: "inline-flex", flexDirection: "column", gap: 4, flex: "1 1 180px" }}>
          text
          <input value={sp.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} placeholder="quote, event or reason" style={{ font: "inherit", fontSize: 11.5, letterSpacing: 0, textTransform: "none", padding: "4px 8px", background: "transparent", border: "0.8px solid var(--color-grid)", borderRadius: 8, color: "inherit" }} />
        </label>
      </div>
      <p className="sub">{shown.length} of {rows.length} statements · {counts.true} true · {counts.false} false · {counts.pending} pending · {counts.void} void · {counts.not} not admitted</p>
      <div className="scroll-x">
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11.5 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              {["date", "forecaster", "statement", "event", "deadline", "p", "state"].map((h) => <th key={h} className="eyebrow" style={{ padding: "6px 8px 6px 0", borderBottom: "0.8px solid var(--color-ink)", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 600).map((r) => (
              <tr key={r.id} className="ledger-line">
                <td className="mono" style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap", verticalAlign: "top" }}><Link href={`/predictions/${r.id}`}>{r.d}</Link></td>
                <td style={{ padding: "6px 8px 6px 0", verticalAlign: "top" }}><Link href={`/forecasters/${r.f}`}>{r.fn}</Link></td>
                <td style={{ padding: "6px 8px 6px 0", maxWidth: 420, verticalAlign: "top" }}><Link href={`/predictions/${r.id}`}>&ldquo;{r.q}&rdquo;</Link></td>
                <td style={{ padding: "6px 8px 6px 0", maxWidth: 220, verticalAlign: "top", color: "var(--color-gray-2)" }}>{r.t || (r.r ? <span className="chip chip--hollow">{r.r}</span> : null)}</td>
                <td className="mono" style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap", verticalAlign: "top" }}>{r.dl}{r.pn === "undated" ? <span className="chip chip--hollow" style={{ marginLeft: 6 }}>24m</span> : null}</td>
                <td className="mono" style={{ padding: "6px 8px 6px 0", verticalAlign: "top" }}>{r.p === null ? "" : r.p.toFixed(2)}</td>
                <td style={{ padding: "6px 8px 6px 0", whiteSpace: "nowrap", verticalAlign: "top" }}>{r.s === "not_admitted" ? <span className="chip">not admitted</span> : <StateMark state={chartState(r.s)} withLabel />}{r.s === "known_true" ? <span className="chip chip--hollow" style={{ marginLeft: 6 }}>known, pending</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > 600 ? <p className="sub">Showing the first 600 rows; narrow the filters to see the rest.</p> : null}
      </div>
    </div>
  );
}
