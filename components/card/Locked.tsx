// Locked charts: a chart below its display minimum renders no card of its own. The page collects them into
// one wide "Waiting for data" card, one row per chart with progress ticks and "{now} of {need} {unit}".
import { Card } from "@/components/card/Card";
import { PROGRESS_HEIGHT, PROGRESS_STROKE, Progress, progressWidth } from "@/components/svg/Progress";
import { Term } from "@/components/ui/Term";
import { fmtInt } from "@/lib/format";

export interface LockedRowProps {
  /** The chart name, a noun phrase. */
  name: string;
  /** Glossary term the name links to; takes precedence over href. */
  term?: string;
  now: number;
  need: number;
  /** Uppercased by CSS. */
  unit: string;
  /** Link to the method section when there is no glossary term. */
  href?: string;
}

export const WAITING_TITLE = "Waiting for data";
export const METRICS_HREF = "/methodology#metrics";

export function LockedRow({ name, term, now, need, unit, href }: LockedRowProps) {
  const width = Math.round(progressWidth(need) * 10) / 10;
  const height = PROGRESS_HEIGHT + 2;
  const label = term ? <Term t={term}>{name}</Term> : href ? <a href={href}>{name}</a> : name;
  return (
    <div className="locked-row">
      <span className="locked-name">{label}</span>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${fmtInt(now)} of ${fmtInt(need)} ${unit}`} className="locked-progress">
        <Progress n={now} need={need} x={PROGRESS_STROKE / 2} y={height / 2} />
      </svg>
      <span className="locked-count">
        {fmtInt(now)} of {fmtInt(need)} {unit}
      </span>
    </div>
  );
}

export interface WaitingForDataProps {
  rows: LockedRowProps[];
  id?: string;
}

/** One wide card, last in the grid. A row with zero progress still appears. */
export function WaitingForData({ rows, id }: WaitingForDataProps) {
  if (rows.length === 0) return null;
  const how = (
    <>
      A chart appears when its minimum n is met. The minimums are fixed in the rules and listed under <a href={METRICS_HREF}>Method › Metrics</a>.
    </>
  );
  return (
    <Card title={WAITING_TITLE} wide className="card--short" id={id} how={how}>
      <div className="locked-rows">
        {rows.map((r) => (
          <LockedRow key={r.name} {...r} />
        ))}
      </div>
    </Card>
  );
}
