// Leaderboard tick rows (Lupi Basics F5 rows plus F15 whisker): one row per forecaster, whisker = 95% range,
// dot = score, score and evidence tier at the row end. The hero row is the one accent element.
// Server component: no state, no effects. The Card wrapper, title and sub line come from the page.
import type { LeaderboardData } from "@/components/charts/types";
import { layoutLeaderboardTickRows, type TickRow } from "@/components/charts/layout/LeaderboardTickRows.layout";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { MedianFlag } from "@/components/svg/MedianFlag";
import { Whisker } from "@/components/svg/Whisker";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

export interface LeaderboardTickRowsProps {
  data: LeaderboardData;
  size: "half" | "wide";
  /** Row id that takes the accent; defaults to the row flagged hero. */
  hero?: string;
  /** Keep the given order of person rows (a rank order). Default sorts persons by label. */
  ranked?: boolean;
}

const VALUE_SIZE = 10;

function Row({ row }: { row: TickRow }) {
  const tone = row.reference ? LADDER[3] : LADDER[0];
  const markColor = row.hero ? "currentColor" : row.variant === "faint" ? PALETTE.faint : tone;
  const dot =
    row.x === null ? null : (
      <Mark cx={row.x} cy={row.y} r={row.r} variant={row.variant === "hollow" ? "hollow" : "solid"} color={markColor} className="pop" delay={row.delay} title={`${row.label} · ${row.valueText}`} />
    );
  const value = (
    <Halo x={row.valueX} y={row.y + 3.5} anchor="end" size={VALUE_SIZE} fill={row.hero ? "currentColor" : tone} className="fade" delay={row.delay}>
      {row.valueText}
    </Halo>
  );
  const label = (
    <text x={row.labelX} y={row.y + 3} fontSize={FONT.rowLabel.size} fontWeight={FONT.rowLabel.weight} letterSpacing="0.08em" fill={tone}>
      {row.label.toUpperCase()}
    </text>
  );
  return (
    <g className="row" data-id={row.id}>
      {row.href ? <a href={row.href}>{label}</a> : label}
      {row.lo !== null && row.hi !== null ? <Whisker x1={row.lo} y1={row.y} x2={row.hi} y2={row.y} color={tone} className="fade" /> : null}
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
      <Footnote x={row.tierX} y={row.y + 2.5}>
        {row.tierText}
      </Footnote>
    </g>
  );
}

export function LeaderboardTickRows({ data, size, hero, ranked }: LeaderboardTickRowsProps) {
  const { w, h } = FRAME[size];
  const L = layoutLeaderboardTickRows(data, w, h, { hero, ranked });
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
    </svg>
  );
}
