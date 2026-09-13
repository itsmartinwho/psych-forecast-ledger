// Repeated forecasts of one event: when the date was said (x) against the date promised (y). Server component.
import type { RecedingHorizonData } from "@/components/charts/types";
import { layoutRecedingHorizon } from "@/components/charts/layout/RecedingHorizon.layout";
import { Footnote } from "@/components/svg/Footnote";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { FRAME, LADDER, PALETTE, STROKE } from "@/lib/tokens";

export interface RecedingHorizonProps { data: RecedingHorizonData; size: "half" | "wide" }

export function RecedingHorizon({ data, size }: RecedingHorizonProps) {
  const { w, h } = FRAME[size];
  const L = layoutRecedingHorizon(data, w, h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${data.label}: promised dates against statement dates`} className="chart chart--receding-horizon" style={{ display: "block" }}>
      <line x1={L.plot.x0} y1={L.plot.y1} x2={L.plot.x1} y2={L.plot.y1} stroke={PALETTE.ink} strokeWidth={STROKE.baseline} />
      {L.xTicks.map((t) => (
        <g key={`x${t.label}`}>
          <line x1={t.x} y1={L.plot.y1} x2={t.x} y2={L.plot.y1 + 4} stroke={PALETTE.ink} strokeWidth={0.6} />
          <Footnote x={t.x} y={L.plot.y1 + 14} anchor="middle">{t.label}</Footnote>
        </g>
      ))}
      {L.yTicks.map((t) => (
        <g key={`y${t.label}`}>
          <line x1={L.plot.x0} y1={t.y} x2={L.plot.x1} y2={t.y} stroke={PALETTE.grid} strokeWidth={STROKE.hairline} />
          <Footnote x={L.plot.x0 - 6} y={t.y + 2.5} anchor="end">{t.label}</Footnote>
        </g>
      ))}
      <line x1={L.diagonal.x1} y1={L.diagonal.y1} x2={L.diagonal.x2} y2={L.diagonal.y2} stroke={LADDER[4]} strokeWidth={0.7} strokeDasharray="2 4" />
      {L.today ? <line x1={L.today.x} y1={L.plot.y0} x2={L.today.x} y2={L.plot.y1} stroke={LADDER[3]} strokeWidth={0.6} strokeDasharray="1 3" /> : null}
      {L.today ? <Footnote x={L.today.x + 3} y={L.plot.y0 + 8} anchor="start">TODAY</Footnote> : null}
      <path d={L.path} fill="none" stroke={PALETTE.ink} strokeWidth={0.7} pathLength={1} className="draw" />
      {L.dots.map((d) => (
        <g key={`${d.statementDate}-${d.predictedDate}`}>
          {d.href ? <a href={d.href}><Mark cx={d.x} cy={d.y} r={d.r} variant="solid" className="pop" delay={d.delay} title={d.title} /></a> : <Mark cx={d.x} cy={d.y} r={d.r} variant="solid" className="pop" delay={d.delay} title={d.title} />}
        </g>
      ))}
      {L.actual ? (
        <g style={{ color: PALETTE.accent }}>
          <line x1={L.plot.x0} y1={L.actual.y} x2={L.plot.x1} y2={L.actual.y} stroke="currentColor" strokeWidth={1} />
          <Halo x={L.plot.x1} y={L.actual.y - 4} anchor="end" size={8} fill="currentColor" className="fade">{L.actual.label}</Halo>
        </g>
      ) : null}
      <Footnote x={L.plot.x0} y={h - 4} anchor="start">X SAID ON · Y PROMISED BY · DASHED: PROMISED = SAID · DOT AREA = P</Footnote>
    </svg>
  );
}
