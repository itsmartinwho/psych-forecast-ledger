"use client";
// Scope control, search box and facet rows of the Statements page. Pure presentation: the Ledger owns the URL state.
// A chip is one button. A glossary term or a reason code gives the chip a popover (hover or focus) with a Method link,
// so no link sits inside the button.
import { useId, type ReactNode } from "react";
import codes from "@/data/rules/reason-codes.json";
import { termHref } from "@/components/ui/Term";
import { defineTerm } from "@/lib/content/glossary";
import { METHOD_LINK, METHOD_PATH } from "@/lib/content/site";
import { fmtInt } from "@/lib/format";

export type Scope = "admitted" | "not" | "all";

export interface FacetOption {
  id: string;
  label: string;
  count: number;
  /** Glossary term behind the chip, when one exists. */
  term?: string;
  /** Reason code: the popover is the code's test and the link goes to the exclusions row. */
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
/** Glossary term behind each scope chip. "All" has none. */
export const SCOPE_TERM: Partial<Record<Scope, string>> = { admitted: "admitted", not: "not admitted" };
export const SEARCH_PLACEHOLDER = "quote, event or reason";

export interface ChipPopover { def: string; href: string }

interface ReasonCode { code: string; label: string; test: string }
const REASONS: ReasonCode[] = [...(codes.not_admitted as ReasonCode[]), ...(codes.void as ReasonCode[])];

/** Popover text and Method link for a chip. Throws on an unknown term or code, so next build fails. */
export function chipPopover(o: Pick<FacetOption, "id" | "term" | "reason">): ChipPopover | null {
  if (o.reason) {
    const c = REASONS.find((r) => r.code === o.id);
    if (!c) throw new Error(`Unknown reason code: "${o.id}"`);
    return { def: c.test, href: `${METHOD_PATH}#rc-${c.code}` };
  }
  if (o.term) {
    const g = defineTerm(o.term);
    if (!g) throw new Error(`Unknown glossary term: "${o.term}"`);
    return { def: g.definition, href: termHref(o.term) };
  }
  return null;
}

/** Options a facet row shows: a zero count hides the chip unless it is the selected one. */
export function visibleOptions(row: FacetRow): FacetOption[] {
  return row.options.filter((o) => o.count > 0 || o.id === row.value);
}

interface ChipProps { on: boolean; onClick: () => void; popover: ChipPopover | null; children: ReactNode }

function Chip({ on, onClick, popover, children }: ChipProps) {
  const raw = useId();
  const cls = on ? "chip chip--on" : "chip chip--hollow";
  if (!popover) {
    return (
      <button type="button" className={cls} aria-pressed={on} onClick={onClick}>
        {children}
      </button>
    );
  }
  const defId = `chip-def-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <span className="term">
      <button type="button" className={`${cls} term-link`} aria-pressed={on} aria-describedby={defId} onClick={onClick}>
        {children}
      </button>
      <span className="term-def" role="tooltip" id={defId}>
        {popover.def} <a href={popover.href}>{METHOD_LINK}</a>
      </span>
    </span>
  );
}

export function Facets({ scope, scopeCounts, facets, q, onScope, onFacet, onSearch }: FacetsProps) {
  return (
    <div className="facets">
      <div className="scope">
        <div className="scope-chips">
          {SCOPES.map((s) => (
            <Chip key={s} on={scope === s} onClick={() => onScope(s)} popover={chipPopover({ id: s, term: SCOPE_TERM[s] })}>
              {SCOPE_LABEL[s]} {fmtInt(scopeCounts[s])}
            </Chip>
          ))}
        </div>
        <input className="ledger-search" type="search" defaultValue={q} placeholder={SEARCH_PLACEHOLDER} aria-label="Search statements" onChange={(e) => onSearch(e.target.value)} />
      </div>
      {facets.map((row) => {
        const visible = visibleOptions(row);
        if (visible.length === 0) return null;
        return (
          <div key={row.key} className="facet">
            <span className="facet-label">{row.label}</span>
            <div className="facet-chips">
              {visible.map((o) => {
                const on = row.value === o.id;
                return (
                  <Chip key={o.id} on={on} onClick={() => onFacet(row.key, on ? null : o.id)} popover={chipPopover(o)}>
                    {o.label} {fmtInt(o.count)}
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
