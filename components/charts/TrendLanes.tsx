// Trend lineage: one lane per item from statement to resolution or deadline, events on a top rail, today as a rule.
// Server component; all geometry comes from layoutTrendLanes so the card can be snapshot-tested without React.
import type { CSSProperties } from "react";
import type { TrendLanesData } from "@/components/charts/types";
import { layoutTrendLanes } from "@/components/charts/layout/TrendLanes.layout";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { FONT, FRAME, LADDER, PALETTE, STROKE } from "@/lib/tokens";

export interface TrendLanesProps {
  data: TrendLanesData;
  size: "half" | "wide";
  /** Lane id that takes the accent; defaults to the lane flagged hero in the data. */
  hero?: string;
}

const delayStyle = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export function TrendLanes({ data, size, hero }: TrendLanesProps) {
  const frame = FRAME[size];
  const L = layoutTrendLanes(data, frame.w, frame.h, { hero, floor: size === "half" ? FONT.floorHalf : FONT.floorWide });
  const { x0, x1 } = L.plot;

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} className="chart chart--trend-lanes" role="img" aria-label="Trend lanes: one lane per prediction from statement to resolution">
      <g className="months">
        {L.months.map((m, i) => (
          <Hairline key={i} x1={m.x} y1={L.rail.y} x2={m.x} y2={L.baseline.y} width={m.year ? 0.8 : 0.5} color={m.year ? PALETTE.grid : PALETTE.hairline} />
        ))}
      </g>

      <g className="rail">
        <Hairline x1={x0} y1={L.rail.y} x2={x1} y2={L.rail.y} width={0.5} color={PALETTE.grid} />
        {L.rail.ticks.map((t, i) => (
          <g key={i} className="rail-event fade" style={delayStyle(t.delay)}>
            <title>{t.title}</title>
            <line x1={t.x} x2={t.x} y1={L.rail.y} y2={L.rail.tickTop} stroke={PALETTE.ink} strokeWidth={STROKE.path} />
            {t.label ? (
              <text x={t.labelX} y={L.rail.labelY} fontSize={L.rail.labelSize} fontWeight={600} letterSpacing="0.08em" fill={LADDER[2]} textAnchor="middle">
                {t.label}
              </text>
            ) : null}
          </g>
        ))}
      </g>

      <g className="lanes">
        {L.lanes.map((lane) => {
          const body = (
            <g className={lane.hero ? "lane lane--hero" : "lane"} color={lane.hero ? PALETTE.accent : undefined} style={delayStyle(lane.delay)}>
              <text x={lane.labelX} y={lane.y + 2.5} fontSize={L.laneLabelSize} fontWeight={600} letterSpacing="0.08em" fill={lane.tone} textAnchor="end" className="lane-label fade" style={delayStyle(lane.delay)}>
                {lane.label}
              </text>
              {lane.segments.map((s, i) =>
                s.kind === "tail" ? (
                  <Hairline key={i} x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} width={0.5} color={PALETTE.faint} className="lane-tail" />
                ) : s.kind === "pending" ? (
                  <line key={i} x1={s.x1} x2={s.x2} y1={s.y} y2={s.y} stroke={lane.tone} strokeWidth={STROKE.hairlineMax} strokeDasharray="3 3" className="lane-pending fade" style={delayStyle(lane.delay)} />
                ) : (
                  <line key={i} x1={s.x1} x2={s.x2} y1={s.y} y2={s.y} stroke={lane.tone} strokeWidth={STROKE.path} pathLength={1} className="lane-line draw" style={delayStyle(lane.delay)} />
                ),
              )}
              {lane.marks.map((m, i) => (
                <Mark key={i} cx={m.x} cy={m.y} r={m.r} variant={m.variant} color={lane.tone} className={`lane-mark lane-mark--${m.kind} pop`} delay={m.delay} title={m.title} />
              ))}
              {lane.values.map((v, i) => (
                <Halo key={i} x={v.x} y={v.y} size={L.valueSize} className="fade" delay={lane.delay}>
                  {v.text}
                </Halo>
              ))}
            </g>
          );
          return lane.href ? (
            <a key={lane.id} href={lane.href}>
              {body}
            </a>
          ) : (
            <g key={lane.id}>{body}</g>
          );
        })}
      </g>

      {L.today ? (
        <g className="today">
          <line x1={L.today.x} x2={L.today.x} y1={L.today.y1} y2={L.today.y2} stroke={PALETTE.ink} strokeWidth={STROKE.zero} />
          <Footnote x={L.today.labelX} y={L.today.labelY} anchor={L.today.anchor}>
            {L.today.label}
          </Footnote>
        </g>
      ) : null}

      <Baseline x1={x0} x2={x1} y={L.baseline.y} ticks={L.baseline.ticks.map((t) => t.x)} labels={L.baseline.ticks.map((t) => t.label)} labelSize={L.baseline.labelSize} />
    </svg>
  );
}
