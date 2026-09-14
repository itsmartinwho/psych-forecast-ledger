// Brier hairline (Lupi Basics F2): one 1px path per series over a calendar floor of one tick per quarter,
// one dot per period (hollow under three events), the coin-flip rule at 0.25, labels on the latest value of
// every series and on the hero's best and worst quarter. The hero series is the one accent element.
// The footnote states the unit and direction only; the hollow-dot meaning sits in the card legend.
// Server component: no state, no effects. The Card wrapper, title and legend come from the page.
import type { BrierSeriesData } from "@/components/charts/types";
import { DOT_RADIUS, NAME_SIZE, VALUE_SIZE, layoutBrierHairline, type HairlineSeries } from "@/components/charts/layout/BrierHairline.layout";
import { BarcodeFloor } from "@/components/svg/BarcodeFloor";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { MedianFlag } from "@/components/svg/MedianFlag";
import { Tick } from "@/components/svg/Tick";
import { FRAME, PALETTE, STROKE } from "@/lib/tokens";

/** Footnote text: unit and direction. One constant, owned by the layout. */
export { FOOTNOTE_TEXT } from "@/components/charts/layout/BrierHairline.layout";

export interface BrierHairlineProps {
  data: BrierSeriesData;
  size: "half" | "wide";
  /** Series id that takes the accent; defaults to the series flagged hero. */
  hero?: string;
}

function Series({ s }: { s: HairlineSeries }) {
  const stroke = s.hero ? "currentColor" : s.tone;
  const body = (
    <>
      {/* pathLength 1 lets the .draw animation run from dashoffset 1 to 0 whatever the real length. */}
      {s.d ? <path d={s.d} fill="none" stroke={stroke} strokeWidth={STROKE.path} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="draw" style={{ animationDelay: `${s.delay}ms` }} /> : null}
      {s.points.map((p) => (
        <Mark key={p.period} cx={p.x} cy={p.y} r={DOT_RADIUS} variant={p.hollow ? "hollow" : "solid"} color={stroke} className="pop" delay={p.delay} title={`${s.label} · ${p.period} · ${p.label} · n=${p.n}`} />
      ))}
      {s.latest ? (
        <>
          <Halo x={s.latest.x} y={s.latest.valueY} anchor="start" size={VALUE_SIZE} fill={stroke} className="fade" delay={s.delay}>
            {s.latest.valueText}
          </Halo>
          <text x={s.latest.x} y={s.latest.nameY} fontSize={NAME_SIZE} fontWeight={700} letterSpacing="0.08em" fill={stroke} className="fade" style={{ animationDelay: `${s.delay}ms` }}>
            {s.latest.nameText}
          </text>
        </>
      ) : null}
      {s.best ? (
        <Halo x={s.best.x} y={s.best.y} size={VALUE_SIZE} fill={stroke} className="fade" delay={s.delay}>
          {s.best.text}
        </Halo>
      ) : null}
      {s.worst ? (
        <Halo x={s.worst.x} y={s.worst.y} size={VALUE_SIZE} fill={stroke} className="fade" delay={s.delay}>
          {s.worst.text}
        </Halo>
      ) : null}
    </>
  );
  // The accent is set once, on the hero group; path, dots and labels inherit it through currentColor.
  return s.hero ? (
    <g className="series hero" data-id={s.id} style={{ color: PALETTE.accent }}>
      {body}
    </g>
  ) : (
    <g className="series" data-id={s.id}>
      {body}
    </g>
  );
}

export function BrierHairline({ data, size, hero }: BrierHairlineProps) {
  const { w, h } = FRAME[size];
  const L = layoutBrierHairline(data, w, h, { hero });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Brier score by quarter, lower is better" className="chart chart--brier-hairline" style={{ display: "block" }}>
      {L.coinFlip ? <MedianFlag x1={L.coinFlip.x1} y1={L.coinFlip.y} x2={L.coinFlip.x2} y2={L.coinFlip.y} label={L.coinFlip.text} labelX={L.coinFlip.labelX} labelY={L.coinFlip.labelY} anchor="start" /> : null}
      {L.yTicks.map((t) => (
        <Tick key={t.label} x={L.plot.x0} y={t.y} direction="left" label={t.label} />
      ))}
      <BarcodeFloor xs={L.floor.xs} y={L.floor.y} height={5} />
      <BarcodeFloor xs={L.floor.majorXs} y={L.floor.y} height={7.5} color={PALETTE.muted} />
      <Baseline x1={L.plot.x0} x2={L.plot.x1} y={L.baseline.y} ticks={L.baseline.ticks} labels={L.baseline.labels} />
      {L.series.map((s) => (
        <Series key={s.id} s={s} />
      ))}
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
