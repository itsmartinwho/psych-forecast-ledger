// Glossary link with a CSS popover. The term must exist in GLOSSARY; an unknown term throws, so next build fails.
// Popover: hover or focus-within, CSS only. Touch: a tap follows the link to the methodology anchor.
import { useId, type ReactNode } from "react";
import { defineTerm } from "@/lib/content/glossary";
import { METHOD_LINK, METHOD_PATH } from "@/lib/content/site";

export interface TermProps {
  /** Glossary term, matched case-insensitively. */
  t: string;
  /** Link text; defaults to the term. */
  children?: ReactNode;
  /** Link only, no popover. Required inside .scroll-x containers. */
  plain?: boolean;
  /** "end" anchors the popover to the right edge, for the last columns of a table. */
  side?: "start" | "end";
  className?: string;
}

/** Methodology anchor for a glossary term. */
export function termHref(t: string): string {
  const g = defineTerm(t);
  if (!g) throw new Error(`Unknown glossary term: "${t}"`);
  return `${METHOD_PATH}#g-${g.slug}`;
}

export function Term({ t, children, plain, side, className }: TermProps) {
  const g = defineTerm(t);
  if (!g) throw new Error(`Unknown glossary term: "${t}"`);
  const href = `${METHOD_PATH}#g-${g.slug}`;
  const text = children ?? g.term;
  const raw = useId();
  const defId = `def-${g.slug}-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  if (plain) {
    return (
      <a className={["term-link", className].filter(Boolean).join(" ")} href={href}>
        {text}
      </a>
    );
  }
  const cls = ["term", side === "end" ? "term--end" : null, className].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <a className="term-link" href={href} aria-describedby={defId}>
        {text}
      </a>
      <span className="term-def" role="tooltip" id={defId}>
        {g.definition} <a href={href}>{METHOD_LINK}</a>
      </span>
    </span>
  );
}
