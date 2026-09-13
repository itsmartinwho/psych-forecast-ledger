// A big number with an eyebrow label and a small unit. Tabular figures come from .stat.
export interface StatProps {
  value: string;
  unit?: string;
  label?: string;
  small?: boolean;
  className?: string;
}

export function Stat({ value, unit, label, small, className }: StatProps) {
  return (
    <div className={["stat-block", className].filter(Boolean).join(" ")}>
      {label ? <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div> : null}
      <div className={small ? "stat stat--sm" : "stat"}>
        {value}
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </div>
    </div>
  );
}
