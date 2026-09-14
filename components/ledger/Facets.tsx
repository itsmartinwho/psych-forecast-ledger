"use client";
// Scope control, search box and facet rows of the Statements page. Pure presentation: the Ledger owns the URL state.
import { ReasonChip } from "@/components/ui/ReasonChip";
import { Term } from "@/components/ui/Term";
import { fmtInt } from "@/lib/format";

export type Scope = "admitted" | "not" | "all";

export interface FacetOption {
  id: string;
  label: string;
  count: number;
  /** Glossary term for the chip text, when one exists. */
  term?: string;
  /** Reason code: the chip is a ReasonChip. */
  reason?: boolean;
}

export interface FacetRow {
  key: string;
  label: string;
  options: FacetOption[];
  value: string | null;
}

export interface FacetsProps {
  scope: Scope;
  scopeCounts: Record<Scope, number>;
  facets: FacetRow[];
  q: string;
  onScope: (s: Scope) => void;
  onFacet: (key: string, id: string | null) => void;
  onSearch: (q: string) => void;
}

export const SCOPE_LABEL: Record<Scope, string> = { admitted: "Admitted", not: "Not admitted", all: "All" };
export const SCOPES: Scope[] = ["admitted", "not", "all"];
export const SEARCH_PLACEHOLDER = "quote, event or reason";

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" className={on ? "chip chip--on" : "chip chip--hollow"} aria-pressed={on} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export function Facets({ scope, scopeCounts, facets, q, onScope, onFacet, onSearch }: FacetsProps) {
  return (
    <div className="facets">
      <div className="scope">
        <div className="scope-chips">
          {SCOPES.map((s) => (
            <Chip key={s} on={scope === s} onClick={() => onScope(s)}>
              {s === "admitted" ? <Term t="admitted" plain>{SCOPE_LABEL[s]}</Term> : s === "not" ? <Term t="not admitted" plain>{SCOPE_LABEL[s]}</Term> : SCOPE_LABEL[s]} {fmtInt(scopeCounts[s])}
            </Chip>
          ))}
        </div>
        <input className="ledger-search" type="search" value={q} placeholder={SEARCH_PLACEHOLDER} aria-label="Search statements" onChange={(e) => onSearch(e.target.value)} />
      </div>
      {facets.map((row) => {
        const visible = row.options.filter((o) => o.count > 0 || o.id === row.value);
        if (visible.length === 0) return null;
        return (
          <div key={row.key} className="facet">
            <span className="facet-label">{row.label}</span>
            <div className="facet-chips">
              {visible.map((o) => {
                const on = row.value === o.id;
                const text = o.reason ? <ReasonChip code={o.id} plain className={on ? "chip--on" : undefined} /> : o.term ? <Term t={o.term} plain>{o.label}</Term> : o.label;
                return (
                  <Chip key={o.id} on={on} onClick={() => onFacet(row.key, on ? null : o.id)}>
                    {text} {fmtInt(o.count)}
                  </Chip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
