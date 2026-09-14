// A big number with an eyebrow label and an optional meta line under the value. Tabular figures come from .stat.
export interface StatProps {
  value: string;
  label?: string;
  /** Meta line under the value, uppercased by CSS. */
  sub?: string;
  small?: boolean;
  className?: string;
}

export function Stat({ value, label, sub, small, className }: StatProps) {
  return (
    <div className={["stat-block", className].filter(Boolean).join(" ")}>
      {label ? <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div> : null}
      <div className={small ? "stat stat--sm" : "stat"}>{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}
