// Boldness plumb: one dot per forecaster at (distance from base rate, Brier), a plumb to the coin-flip rule.
// Server component; every number comes from layoutBoldnessPlumb.
import type { CSSProperties } from "react";
import type { BoldnessData } from "@/components/charts/types";
import { PLUMB_WIDTH, layoutBoldnessPlumb } from "@/components/charts/layout/BoldnessPlumb.layout";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { FONT, FRAME, LADDER, PALETTE, STROKE } from "@/lib/tokens";

export interface BoldnessPlumbProps {
  data: BoldnessData;
  size: "half" | "wide";
  /** Point id that takes the accent; defaults to the point flagged hero in the data. */
  hero?: string;
}

const delayStyle = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export function BoldnessPlumb({ data, size, hero }: BoldnessPlumbProps) {
  const frame = FRAME[size];
  const L = layoutBoldnessPlumb(data, frame.w, frame.h, { hero, floor: size === "half" ? FONT.floorHalf : FONT.floorWide });

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} className="chart chart--boldness-plumb" role="img" aria-label="Boldness against Brier score, one dot per forecaster">
      <g className="guides">
        {L.yGuides.map((g, i) => (
          <g key={i}>
            <Hairline x1={g.x1} y1={g.y} x2={g.x2} y2={g.y} width={0.5} color={PALETTE.hairline} />
            <text x={g.labelX} y={g.y + 2.5} fontSize={7} fontWeight={600} fill={PALETTE.muted} textAnchor="end">
              {g.label}
            </text>
          </g>
        ))}
      </g>

      <g className="y-rule">
        <Hairline x1={L.yRule.x1} y1={L.yRule.y} x2={L.yRule.x2} y2={L.yRule.y} width={STROKE.hairlineMax} color={PALETTE.muted} dash="2 4" />
        <Footnote x={L.yRule.labelX} y={L.yRule.labelY} anchor="end">
          {L.yRule.label}
        </Footnote>
      </g>

      <Footnote x={L.yLabel.x} y={L.yLabel.y}>
        {L.yLabel.text}
      </Footnote>

      <g className="items">
        {L.items.map((it, i) => (
          <circle key={i} cx={it.x} cy={it.y} r={it.r} fill={PALETTE.faint} className="item fade" style={delayStyle(it.delay)} />
        ))}
      </g>

      <g className="points">
        {L.points.map((p) => (
          <g key={p.id} className={p.hero ? "point point--hero" : "point"} color={p.hero ? PALETTE.accent : undefined}>
            {p.plumb ? <line x1={p.x} x2={p.x} y1={p.plumb.y1} y2={p.plumb.y2} stroke={p.tone} strokeWidth={PLUMB_WIDTH} pathLength={1} className="plumb draw" style={delayStyle(p.delay)} /> : null}
            <Mark cx={p.x} cy={p.y} r={p.r} variant="solid" color={p.tone} className="pop" delay={p.delay} title={p.title} />
          </g>
        ))}
      </g>

      <g className="labels">
        {L.labels.map((l) => (
          <Halo key={l.id} x={l.x} y={l.y} size={L.labelSize} anchor={l.anchor} fill={l.hero ? LADDER[0] : LADDER[2]} className="fade">
            {l.text}
          </Halo>
        ))}
      </g>

      <Baseline x1={L.plot.x0} x2={L.plot.x1} y={L.baseline.y} ticks={L.baseline.ticks.map((t) => t.x)} labels={L.baseline.ticks.map((t) => t.label)} labelSize={L.baseline.labelSize} />
      <Footnote x={L.floorLabels.hedged.x} y={L.floorLabels.hedged.y}>
        {L.floorLabels.hedged.text}
      </Footnote>
      <Footnote x={L.floorLabels.xLabel.x} y={L.floorLabels.xLabel.y} anchor="middle">
        {L.floorLabels.xLabel.text}
      </Footnote>
      <Footnote x={L.floorLabels.bold.x} y={L.floorLabels.bold.y} anchor="end">
        {L.floorLabels.bold.text}
      </Footnote>
    </svg>
  );
}
