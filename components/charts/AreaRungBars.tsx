// Rung bars: one ladder per group, one rung per unit, the count in a halo at the end, the hero ladder in the accent.
// Server component: renders the SVG only; the Card wrapper comes from the page.
import { Footnote } from "@/components/svg/Footnote";
import { Halo } from "@/components/svg/Halo";
import { FRAME, LADDER, PALETTE } from "@/lib/tokens";
import type { RungBarsData } from "./types";
import { RUNG_STROKE, layoutAreaRungBars } from "./layout/AreaRungBars.layout";

export type ChartSize = keyof typeof FRAME;

export interface AreaRungBarsProps {
  data: RungBarsData;
  size: ChartSize;
  /** Group id that takes the accent; overrides the hero flag in the data. */
  hero?: string;
}

export function AreaRungBars({ data, size, hero }: AreaRungBarsProps) {
  const { w, h } = FRAME[size];
  const L = layoutAreaRungBars(data, w, h, { hero });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`One ladder per group, one rung per ${data.unit}`} className="chart chart--rung-bars">
      {L.rows.map((row) => {
        // The color lives once on the group; rungs and the count read it as currentColor, so the accent appears one time.
        const body = (
          <g className="fade" style={{ animationDelay: `${row.delay}ms` }}>
            <text x={row.label.x} y={row.label.y} fontSize={row.label.size} fontWeight={700} fill={row.labelColor} textAnchor={row.label.anchor}>
              {row.label.text}
            </text>
            <g color={row.color} stroke="currentColor" strokeWidth={RUNG_STROKE}>
              {row.rungs.map((r, k) => (
                <line key={k} x1={r.x} x2={r.x} y1={r.y1} y2={r.y2} opacity={r.opacity} />
              ))}
              {row.dots.map((d, k) => (
                <circle key={`d${k}`} cx={d.cx} cy={d.cy} r={d.r} fill={PALETTE.faint} stroke="none" />
              ))}
              <Halo x={row.count.x} y={row.count.y} size={row.count.size} anchor={row.count.anchor} fill="currentColor" className="pop" delay={row.delay + 200}>
                {row.count.text}
              </Halo>
            </g>
            {row.value ? (
              <text x={row.value.x} y={row.value.y} fontSize={row.value.size} fontWeight={800} fill={LADDER[3]} textAnchor={row.value.anchor}>
                {row.value.text}
              </text>
            ) : null}
          </g>
        );
        return (
          <g key={row.id} className="rung-row" opacity={row.opacity} data-id={row.id}>
            {row.href ? <a href={row.href}>{body}</a> : body}
          </g>
        );
      })}
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
