// Tick donut: 100 ticks on a dial (one per record when the total allows), one empty tick between segments,
// the total in a halo at the centre, and a key column at the right with one row per segment.
// Server component: SVG only.
import { Halo } from "@/components/svg/Halo";
import { Leader } from "@/components/svg/Leader";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";
import { fmtInt } from "@/lib/format";
import type { TickDonutData } from "./types";
import { COUNT_SIZE, FOOTNOTE_SIZE, LABEL_SIZE, TICK_STAGGER_MS, TICK_STROKE, TOTAL_SIZE, UNIT_SIZE, layoutTickDonut } from "./layout/TickDonut.layout";

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
  const summary = data.segments.map((s) => `${s.label} ${fmtInt(s.count)}`).join(", ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${fmtInt(data.total)} ${data.unit}: ${summary}`} className="chart chart--tick-donut">
      {L.segments.map((seg) => (
        // The color lives once on the segment group; ticks and the key swatch read it as currentColor, so the accent appears one time.
        <g key={seg.id} color={seg.color} className="donut-segment" data-id={seg.id}>
          <g stroke="currentColor" strokeWidth={TICK_STROKE}>
            {seg.ticks.map((t) => (
              <line key={t.slot} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="fade" style={{ animationDelay: `${t.slot * TICK_STAGGER_MS}ms` }} />
            ))}
          </g>
          <g className="donut-key fade" style={{ animationDelay: `${seg.delay}ms` }}>
            {seg.hasLeader ? <Leader x1={seg.leader.x1} y1={seg.leader.y1} x2={seg.leader.x2} y2={seg.leader.y2} /> : null}
            <line x1={seg.swatch.x} y1={seg.swatch.y1} x2={seg.swatch.x} y2={seg.swatch.y2} stroke="currentColor" strokeWidth={TICK_STROKE} />
            <text x={seg.label.x} y={seg.label.y} fontSize={LABEL_SIZE} fontWeight={FONT.keyLabel.weight} letterSpacing="0.06em" fill={LADDER[2]} textAnchor={seg.label.anchor}>
              <title>{seg.label.full}</title>
              {seg.label.text}
            </text>
            <Halo x={seg.countText.x} y={seg.countText.y} size={COUNT_SIZE} anchor={seg.countText.anchor}>
              {seg.countText.text}
            </Halo>
          </g>
        </g>
      ))}
      <Halo x={L.total.x} y={L.total.y} size={TOTAL_SIZE} className="pop" delay={L.total.delay}>
        {L.total.text}
      </Halo>
      <text x={L.unit.x} y={L.unit.y} fontSize={UNIT_SIZE} fontWeight={600} letterSpacing="0.12em" fill={PALETTE.muted} textAnchor="middle">
        {L.unit.text}
      </text>
      {/* The footnote register at 8px, not 7: the shared Footnote primitive has no size prop, and the half frame must stay above the floor at 368px. */}
      <text className="footnote" x={L.footnote.x} y={L.footnote.y} fontSize={FOOTNOTE_SIZE} fontWeight={FONT.footnote.weight} letterSpacing={FONT.footnote.tracking} fill={LADDER[4]} style={{ textTransform: "uppercase" }}>
        {L.footnote.text.toUpperCase()}
      </text>
    </svg>
  );
}
