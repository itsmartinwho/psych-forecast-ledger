// Bubble almanac: a 7px ledger row per record, a time axis with month rules, a dot at the resolution sized by p,
// a 1.5px ink rule at today, and the hero row in the accent. Server component: SVG only. Meant for a wide card;
// the height grows with the rows (40 + rows * 7), capped at 120 rows per chart.
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { FRAME, LADDER, PALETTE, STROKE } from "@/lib/tokens";
import type { AlmanacData } from "./types";
import {
  DATE_SIZE,
  LABEL_SIZE,
  LEDGER_STROKE,
  PENDING_DASH,
  ROW_CAP,
  TAG_SIZE,
  TODAY_SIZE,
  YEAR_SIZE,
  layoutLedgerAlmanac,
  type AlmanacOpts,
} from "./layout/LedgerAlmanac.layout";

export type ChartSize = keyof typeof FRAME;

export interface LedgerAlmanacProps {
  data: AlmanacData;
  /** "wide" is the intended frame; "half" renders the same ledger at 400 wide. */
  size: ChartSize;
  /** Row id that takes the accent; overrides the hero flag in the data. */
  hero?: string;
  /** Rows to skip, for a second chart when the ledger has more than ROW_CAP rows. */
  offset?: number;
}

/** How many rows one chart draws for this data and offset. */
export function almanacRowsRendered(data: AlmanacData, offset = 0): number {
  return Math.max(0, Math.min(ROW_CAP, data.rows.length - Math.max(0, offset)));
}

/** A pending dot: hollow with a dashed stroke. The Mark primitive has no dashed variant, so this stays inline. */
function PendingDot({ cx, cy, r, delay, title }: { cx: number; cy: number; r: number; delay: number; title: string }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill={PALETTE.paper} stroke="currentColor" strokeWidth={STROKE.hairlineMax} strokeDasharray="1.5 1.5" className="mark mark--pending pop" style={{ animationDelay: `${delay}ms` }}>
      <title>{title}</title>
    </circle>
  );
}

export function LedgerAlmanac({ data, size, hero, offset }: LedgerAlmanacProps) {
  const W = FRAME[size].w;
  const opts: AlmanacOpts = { hero, offset };
  const L = layoutLedgerAlmanac(data, W, opts);
  return (
    <svg viewBox={`0 0 ${W} ${L.H}`} width="100%" role="img" aria-label={`Almanac of ${L.rowsRendered} forecasts from ${data.start} to ${data.end}`} className="chart chart--almanac" data-rows-rendered={L.rowsRendered}>
      {L.monthRules.map((m, i) => (
        <Hairline key={`m${i}`} x1={m.x} y1={m.y1} x2={m.x} y2={m.y2} width={m.width} color={m.color} />
      ))}
      {L.rows.map((row) => (
        <Hairline key={`l${row.id}`} x1={L.x0 - 4} y1={row.ledgerY} x2={L.x1} y2={row.ledgerY} width={LEDGER_STROKE} color={PALETTE.grid} />
      ))}
      <g className="baseline">
        <line x1={L.baseline.x1} x2={L.baseline.x2} y1={L.baseline.y} y2={L.baseline.y} stroke={PALETTE.ink} strokeWidth={STROKE.baseline} />
        {L.baseline.ticks.map((tx, i) => (
          <line key={i} x1={tx} x2={tx} y1={L.baseline.y} y2={L.baseline.y + 2.5} stroke={PALETTE.ink} strokeWidth={STROKE.baseline} />
        ))}
        {L.yearLabels.map((y) => (
          <text key={y.text + y.x} x={y.x} y={y.y} fontSize={YEAR_SIZE} fontWeight={600} fill={PALETTE.muted} textAnchor="start">
            {y.text}
          </text>
        ))}
      </g>
      {L.rows.map((row) => {
        // The color lives once on the row group; the hero's line and dot read it as currentColor.
        const body = (
          <g color={row.color} className="almanac-row" data-id={row.id}>
            <text x={row.date.x} y={row.date.y} fontSize={DATE_SIZE} fontWeight={600} fill={row.hero ? LADDER[0] : LADDER[3]} textAnchor="start">
              {row.date.text}
            </text>
            <g className="fade" style={{ animationDelay: `${row.delay}ms` }}>
              {row.segments.map((s, i) => (
                <line key={i} x1={s.x1} x2={s.x2} y1={row.y} y2={row.y} stroke={row.lineColor} strokeWidth={row.lineWidth} strokeDasharray={s.dashed ? PENDING_DASH : undefined} />
              ))}
            </g>
            {row.dot.variant === "pending" ? (
              <PendingDot cx={row.dot.cx} cy={row.dot.cy} r={row.dot.r} delay={row.delay} title={row.title} />
            ) : (
              <Mark cx={row.dot.cx} cy={row.dot.cy} r={row.dot.r} variant={row.dot.variant} color="currentColor" className="pop" delay={row.delay} title={row.title} />
            )}
            {row.label ? (
              <Halo x={row.label.x} y={row.label.y} size={LABEL_SIZE} anchor={row.label.anchor} className="fade" delay={row.delay + 300}>
                {row.label.text}
              </Halo>
            ) : null}
            {row.tag ? (
              <text x={row.tag.x} y={row.tag.y} fontSize={TAG_SIZE} fontWeight={600} letterSpacing="0.08em" fill={LADDER[3]} textAnchor="end">
                {row.tag.text}
              </text>
            ) : null}
          </g>
        );
        return row.href ? (
          <a key={row.id} href={row.href}>
            {body}
          </a>
        ) : (
          <g key={row.id}>{body}</g>
        );
      })}
      {L.today ? (
        <g className="today">
          <line x1={L.today.x} x2={L.today.x} y1={L.today.y1} y2={L.today.y2} stroke={PALETTE.ink} strokeWidth={STROKE.zero} pathLength={1} className="draw" />
          <text x={L.today.label.x} y={L.today.label.y} fontSize={TODAY_SIZE} fontWeight={600} letterSpacing="0.08em" fill={PALETTE.ink} textAnchor="start">
            {L.today.label.text}
          </text>
        </g>
      ) : null}
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
