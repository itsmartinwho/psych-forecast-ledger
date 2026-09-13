// Timing rung histogram: one hairline rung per record stacked in bins, a zero rule, a dashed median flag,
// and the tallest bin's count as the one accent. Server component; geometry from layoutTimingRungHistogram.
import type { CSSProperties } from "react";
import type { HistogramData } from "@/components/charts/types";
import { RUNG_STROKE, layoutTimingRungHistogram } from "@/components/charts/layout/TimingRungHistogram.layout";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Halo } from "@/components/svg/Halo";
import { MedianFlag } from "@/components/svg/MedianFlag";
import { FONT, FRAME, PALETTE, STROKE } from "@/lib/tokens";

export interface TimingRungHistogramProps {
  data: HistogramData;
  size: "half" | "wide";
  /** Bin label that takes the accent; defaults to the tallest bin. */
  hero?: string;
}

const delayStyle = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export function TimingRungHistogram({ data, size, hero }: TimingRungHistogramProps) {
  const frame = FRAME[size];
  const L = layoutTimingRungHistogram(data, frame.w, frame.h, { hero, floor: size === "half" ? FONT.floorHalf : FONT.floorWide });

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} className="chart chart--timing-rungs" role="img" aria-label="Timing histogram: one rung per prediction by months from the deadline">
      <g className="bins">
        {L.bins.map((b) => (
          <g key={b.index} className="bin">
            <title>{b.title}</title>
            <g className="rungs rise" style={delayStyle(b.delay)}>
              {b.rungs.map((r, k) => (
                <line key={k} x1={r.x1} x2={r.x2} y1={r.y} y2={r.y} stroke={b.tone} strokeWidth={RUNG_STROKE} className="rung" />
              ))}
            </g>
            {b.countLabel ? (
              <Halo x={b.countLabel.x} y={b.countLabel.y} size={L.countSize} fill={b.countLabel.accent ? PALETTE.accent : PALETTE.ink} className="fade" delay={b.delay + 200}>
                {b.countLabel.text}
              </Halo>
            ) : null}
            <text x={b.cx} y={L.binLabel.y} fontSize={L.binLabel.size} fontWeight={600} letterSpacing="0.08em" fill={PALETTE.muted} textAnchor="middle" className="bin-label">
              {b.label}
            </text>
          </g>
        ))}
      </g>

      {L.zero ? (
        <g className="zero">
          <line x1={L.zero.x} x2={L.zero.x} y1={L.zero.y1} y2={L.zero.y2} stroke={PALETTE.ink} strokeWidth={STROKE.zero} />
          <Footnote x={L.zero.labelX} y={L.zero.labelY} anchor={L.zero.anchor}>
            {L.zero.label}
          </Footnote>
        </g>
      ) : null}

      {L.median ? <MedianFlag x1={L.median.x} y1={L.median.y1} x2={L.median.x} y2={L.median.y2} label={L.median.label} labelX={L.median.labelX} labelY={L.median.labelY} anchor={L.median.anchor} /> : null}

      <Baseline x1={L.plot.x0} x2={L.plot.x1} y={L.baseline.y} ticks={L.baseline.ticks} />
      <Footnote x={L.footnote.x} y={L.footnote.y} anchor="end">
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
