// Reason-code chip: the human label as a hollow chip, the code's test as the popover, link to the methodology row.
// Labels and tests come from data/rules/reason-codes.json. An unknown code throws, so next build fails.
import { useId } from "react";
import codes from "@/data/rules/reason-codes.json";
import { METHOD_PATH } from "@/lib/content/site";

interface ReasonCode { code: string; label: string; test: string }

const ALL: ReasonCode[] = [...(codes.not_admitted as ReasonCode[]), ...(codes.void as ReasonCode[])];

/** Human label for a reason code. Throws on an unknown code. */
export function reasonLabel(code: string): string {
  return findCode(code).label;
}

function findCode(code: string): ReasonCode {
  const c = ALL.find((r) => r.code === code);
  if (!c) throw new Error(`Unknown reason code: "${code}"`);
  return c;
}

export interface ReasonChipProps {
  code: string;
  /** Link only, no popover. Required inside .scroll-x containers. */
  plain?: boolean;
  className?: string;
}

export function ReasonChip({ code, plain, className }: ReasonChipProps) {
  const c = findCode(code);
  const href = `${METHOD_PATH}#rc-${c.code}`;
  const raw = useId();
  const defId = `rc-def-${c.code.toLowerCase()}-${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const chip = ["chip", "chip--hollow", "term-link", className].filter(Boolean).join(" ");
  if (plain) {
    return (
      <a className={chip} href={href}>
        {c.label}
      </a>
    );
  }
  return (
    <span className="term">
      <a className={chip} href={href} aria-describedby={defId}>
        {c.label}
      </a>
      <span className="term-def" role="tooltip" id={defId}>
        {c.test}
      </span>
    </span>
  );
}
