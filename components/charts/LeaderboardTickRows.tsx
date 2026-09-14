// Leaderboard tick rows (Lupi Basics F5 rows plus F15 whisker): one row per forecaster, whisker = 95% range,
// dot = score, then a value column and an evidence column at the row end. A T0 row shows "n of minN" and
// progress ticks; a scored row shows the Brier and "{n} events". The hero row is the one accent element.
// Server component: no state, no effects. The Card wrapper, title and legend come from the page.
import type { LeaderboardData } from "@/components/charts/types";
import { layoutLeaderboardTickRows, type TickRow } from "@/components/charts/layout/LeaderboardTickRows.layout";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { MedianFlag } from "@/components/svg/MedianFlag";
import { PROGRESS_HEIGHT, PROGRESS_PITCH, Progress } from "@/components/svg/Progress";
import { Whisker } from "@/components/svg/Whisker";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

export interface LeaderboardTickRowsProps {
  data: LeaderboardData;
  size: "half" | "wide";
  /** Row id that takes the accent; defaults to the row flagged hero. */
  hero?: string;
  /** Keep the given order of person rows (a rank order). Default sorts persons by label. */
  ranked?: boolean;
  /** Resolved events a row needs for a score; T0 rows count toward it. */
  minN?: number;
}

const VALUE_SIZE = 10;
const SUB_SIZE = 8;
const EVIDENCE_SIZE = 8;

function Row({ row }: { row: TickRow }) {
  const tone = row.reference ? LADDER[3] : LADDER[0];
  const markColor = row.hero ? "currentColor" : row.variant === "faint" ? PALETTE.faint : tone;
  const valueTitle = row.value.sub ? `${row.value.text} ${row.value.sub}` : row.value.text;
  const dot = row.x === null ? null : <Mark cx={row.x} cy={row.y} r={row.r} variant={row.variant === "hollow" ? "hollow" : "solid"} color={markColor} className="pop" delay={row.delay} title={`${row.label} · ${valueTitle}`} />;
  // Two tspans on a T0 row: the count in the value register, "of N" smaller and muted, 3px apart.
  const value = (
    <Halo x={row.value.x} y={row.y + 3.5} anchor="end" size={VALUE_SIZE} fill={row.hero ? "currentColor" : tone} className="fade" delay={row.delay}>
      <tspan>{row.value.text}</tspan>
      {row.value.sub ? (
        <tspan dx={3} fontSize={SUB_SIZE} fontWeight={600} fill={PALETTE.muted}>
          {row.value.sub}
        </tspan>
      ) : null}
    </Halo>
  );
  const label = (
    <text x={row.labelX} y={row.y + 3} fontSize={FONT.rowLabel.size} fontWeight={FONT.rowLabel.weight} letterSpacing="0.08em" fill={tone}>
      {row.label.toUpperCase()}
    </text>
  );
  const whisker = row.lo !== null && row.hi !== null ? <Whisker x1={row.lo} y1={row.y} x2={row.hi} y2={row.y} color={tone} className="fade" /> : null;
  return (
    <g className="row" data-id={row.id}>
      {row.href ? <a href={row.href}>{label}</a> : label}
      {/* The dash pattern is inherited, so a provisional whisker is wrapped rather than given a new prop. */}
      {whisker && row.whiskerDash ? (
        <g className="whisker--dashed" strokeDasharray={row.whiskerDash}>
          {whisker}
        </g>
      ) : (
        whisker
      )}
      {/* The accent is set once, on the hero group; the dot and the score inherit it through currentColor. */}
      {row.hero ? (
        <g className="hero" style={{ color: PALETTE.accent }}>
          {dot}
          {value}
        </g>
      ) : (
        <>
          {dot}
          {value}
        </>
      )}
      {row.evidence?.kind === "progress" ? <Progress n={row.evidence.n} need={row.evidence.need} x={row.evidence.x} y={row.evidence.y} pitch={PROGRESS_PITCH} height={PROGRESS_HEIGHT} /> : null}
      {row.evidence?.kind === "text" ? (
        <text x={row.evidence.x} y={row.evidence.y} fontSize={EVIDENCE_SIZE} fontWeight={600} letterSpacing="0.06em" fill={PALETTE.muted} className="evidence">
          {row.evidence.text.toUpperCase()}
        </text>
      ) : null}
    </g>
  );
}

export function LeaderboardTickRows({ data, size, hero, ranked, minN }: LeaderboardTickRowsProps) {
  const { w, h } = FRAME[size];
  const L = layoutLeaderboardTickRows(data, w, h, { hero, ranked, minN });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${data.valueLabel} by forecaster, lower is better`} className="chart chart--leaderboard-tick-rows" style={{ display: "block" }}>
      {L.rules.map((y, i) => (
        <Hairline key={i} x1={0} y1={y} x2={w} y2={y} />
      ))}
      {L.coinFlip ? (
        <MedianFlag x1={L.coinFlip.x} y1={L.coinFlip.y2} x2={L.coinFlip.x} y2={L.coinFlip.y1} label={L.coinFlip.text} labelX={L.coinFlip.labelX} labelY={L.coinFlip.labelY} anchor="middle" />
      ) : null}
      {L.rows.map((row) => (
        <Row key={row.id} row={row} />
      ))}
      <Baseline x1={L.plot.x0} x2={L.plot.x1} y={L.baseline.y} ticks={L.baseline.ticks} labels={L.baseline.labels} />
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
      <Footnote x={L.unit.x} y={L.unit.y} anchor="end">
        {L.unit.text}
      </Footnote>
    </svg>
  );
}
