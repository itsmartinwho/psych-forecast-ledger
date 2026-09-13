// Tick donut: 100 ticks on a dial (one per record when the total allows), one empty tick between segments,
// the total in a halo at the centre, dotted leaders to labels with counts. Server component: SVG only.
import { Footnote } from "@/components/svg/Footnote";
import { Halo } from "@/components/svg/Halo";
import { Leader } from "@/components/svg/Leader";
import { FRAME, LADDER, PALETTE } from "@/lib/tokens";
import type { TickDonutData } from "./types";
import { COUNT_SIZE, LABEL_SIZE, TICK_STAGGER_MS, TICK_STROKE, TOTAL_SIZE, UNIT_SIZE, layoutTickDonut } from "./layout/TickDonut.layout";

export type ChartSize = keyof typeof FRAME;

export interface TickDonutProps {
  data: TickDonutData;
  /** "half" is the intended frame; "wide" centres the same dial in the 800x300 frame. */
  size: ChartSize;
  /** Segment id that takes the accent; overrides the tone in the data. */
  hero?: string;
}

export function TickDonut({ data, size, hero }: TickDonutProps) {
  const { w, h } = FRAME[size];
  const L = layoutTickDonut(data, w, h, { hero });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${data.centerLabel}: ${data.total} ${data.unit}`} className="chart chart--tick-donut">
      {L.segments.map((seg) => (
        // The color lives once on the segment group; ticks read it as currentColor, so the accent appears one time.
        <g key={seg.id} color={seg.color} stroke="currentColor" strokeWidth={TICK_STROKE} className="donut-segment" data-id={seg.id}>
          {seg.ticks.map((t) => (
            <line key={t.slot} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="fade" style={{ animationDelay: `${t.slot * TICK_STAGGER_MS}ms` }} />
          ))}
        </g>
      ))}
      {L.segments.map((seg) => (
        <g key={`l${seg.id}`} className="fade" style={{ animationDelay: `${seg.delay}ms` }}>
          <Leader x1={seg.leader.x1} y1={seg.leader.y1} x2={seg.leader.x2} y2={seg.leader.y2} />
          <text x={seg.label.x} y={seg.label.y} fontSize={LABEL_SIZE} fontWeight={600} letterSpacing="0.06em" fill={LADDER[3]} textAnchor={seg.label.anchor}>
            {seg.label.text}
          </text>
          <Halo x={seg.countText.x} y={seg.countText.y} size={COUNT_SIZE} anchor={seg.countText.anchor}>
            {seg.countText.text}
          </Halo>
        </g>
      ))}
      <Halo x={L.total.x} y={L.total.y} size={TOTAL_SIZE} className="pop" delay={L.total.delay}>
        {L.total.text}
      </Halo>
      <text x={L.unit.x} y={L.unit.y} fontSize={UNIT_SIZE} fontWeight={600} letterSpacing="0.12em" fill={PALETTE.muted} textAnchor="middle">
        {L.unit.text}
      </text>
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
