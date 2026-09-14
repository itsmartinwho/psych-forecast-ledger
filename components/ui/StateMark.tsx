// Inline state glyph, the same code as the charts: solid = true, hollow = false, dashed hollow = pending, tiny = void.
import type { State } from "@/components/charts/types";
import { Mark } from "@/components/svg/Mark";
import { PALETTE, STROKE } from "@/lib/tokens";

export const STATE_LABEL: Record<State, string> = { true: "True", false: "False", pending: "Pending", void: "Void" };

export interface StateMarkProps {
  state: State;
  size?: number;
  /** Show the word after the glyph. */
  withLabel?: boolean;
  className?: string;
}

export function StateMark({ state, size = 10, withLabel, className }: StateMarkProps) {
  const c = size / 2;
  const r = size * 0.32;
  const label = STATE_LABEL[state];
  return (
    <span className={["state-mark", className].filter(Boolean).join(" ")} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} style={{ flex: "none" }}>
        {state === "true" ? <Mark cx={c} cy={c} r={r} variant="solid" /> : null}
        {state === "false" ? <Mark cx={c} cy={c} r={r} variant="hollow" /> : null}
        {state === "void" ? <Mark cx={c} cy={c} variant="tiny" /> : null}
        {state === "pending" ? <circle cx={c} cy={c} r={r} fill={PALETTE.paper} stroke={PALETTE.muted} strokeWidth={STROKE.hairlineMax} strokeDasharray="1.5 1.5" /> : null}
      </svg>
      {withLabel ? <span>{label}</span> : null}
    </span>
  );
}
