// Calibration plumb scatter (Lupi Basics F8): x = what the forecaster said, y = the share that came true,
// one dot per phrase bin with area = event count, a plumb line from each dot to a barcode floor of one tick
// per event. The bin furthest from the ideal line is the one accent element. A bin the deriver merged
// from sparse bins is labelled "all bins"; its title lists the bins it holds.
// Server component: no state, no effects. The Card wrapper, title and legend come from the page.
import type { CalibrationData } from "@/components/charts/types";
import { COUNT_SIZE, HERO_LABEL_SIZE, PLUMB_WIDTH, layoutCalibrationPlumb, type PlumbBin } from "@/components/charts/layout/CalibrationPlumb.layout";
import { BarcodeFloor } from "@/components/svg/BarcodeFloor";
import { Baseline } from "@/components/svg/Baseline";
import { Footnote } from "@/components/svg/Footnote";
import { Hairline } from "@/components/svg/Hairline";
import { Halo } from "@/components/svg/Halo";
import { Mark } from "@/components/svg/Mark";
import { Tick } from "@/components/svg/Tick";
import { FRAME, LADDER, PALETTE } from "@/lib/tokens";

/** Footnote text: what the y axis is. One constant, owned by the layout. */
export { FOOTNOTE_TEXT } from "@/components/charts/layout/CalibrationPlumb.layout";
/** Label for a bin merged from several sparse bins. */
export const MERGED_LABEL = "all bins";
/** The deriver joins merged bin names with this separator when it gives no merged list. */
const MERGED_JOIN = " + ";

/** The bins a dot stands for when it was merged, else null. */
export function mergedBins(bin: { bin: string; merged?: string[] }): string[] | null {
  if (bin.merged && bin.merged.length > 1) return bin.merged;
  return bin.bin.includes(MERGED_JOIN) ? bin.bin.split(MERGED_JOIN) : null;
}

export interface CalibrationPlumbProps {
  data: CalibrationData;
  size: "half" | "wide";
  /** Bin id that takes the accent; defaults to the bin furthest from the ideal line. */
  hero?: string;
}

function Bin({ bin, merged }: { bin: PlumbBin; merged: string[] | null }) {
  const color = bin.hero ? "currentColor" : LADDER[0];
  const title = merged ? `${MERGED_LABEL}: ${merged.join(", ")} · ${bin.countText}` : `${bin.id} · ${bin.countText}`;
  const dot = <Mark cx={bin.x} cy={bin.y} r={bin.r} variant={bin.hollow ? "hollow" : "solid"} color={color} className="pop" delay={bin.delay} title={title} />;
  const count = (
    <Halo x={bin.x} y={bin.countY} size={COUNT_SIZE} fill={LADDER[2]} className="fade" delay={bin.delay}>
      {merged ? <title>{merged.join(", ")}</title> : null}
      {merged ? `${MERGED_LABEL} · ${bin.countText}` : bin.countText}
    </Halo>
  );
  if (!bin.hero) {
    return (
      <g className="bin" data-id={bin.id}>
        {dot}
        {count}
      </g>
    );
  }
  // The accent is set once, on the hero group; the dot and its label inherit it through currentColor.
  return (
    <g className="bin hero" data-id={bin.id} style={{ color: PALETTE.accent }}>
      {dot}
      {count}
      {bin.heroLabel ? (
        <Halo x={bin.heroLabel.x} y={bin.heroLabel.y} anchor={bin.heroLabel.anchor} size={HERO_LABEL_SIZE} fill="currentColor" className="fade" delay={bin.delay}>
          {bin.heroLabel.text}
        </Halo>
      ) : null}
    </g>
  );
}

export function CalibrationPlumb({ data, size, hero }: CalibrationPlumbProps) {
  const { w, h } = FRAME[size];
  const L = layoutCalibrationPlumb(data, w, h, { hero });
  const mergedById = new Map(data.bins.map((b) => [b.bin, mergedBins(b)]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Calibration: ${data.label}`} className="chart chart--calibration-plumb" style={{ display: "block" }}>
      <Hairline x1={L.ideal.x1} y1={L.ideal.y1} x2={L.ideal.x2} y2={L.ideal.y2} width={0.7} color={LADDER[4]} dash="3 3" />
      <Footnote x={L.ideal.labelX} y={L.ideal.labelY} anchor="end">
        {L.ideal.text}
      </Footnote>
      {L.yTicks.map((t) => (
        <Tick key={t.label} x={L.plot.x0} y={t.y} direction="left" label={t.label} />
      ))}
      {L.bins.map((b) => (
        <Hairline key={b.id} x1={b.x} y1={b.plumbY1} x2={b.x} y2={b.plumbY2} width={PLUMB_WIDTH} color={LADDER[4]} className="fade" />
      ))}
      <BarcodeFloor xs={L.floor.xs} y={L.floor.y} />
      <Baseline x1={L.plot.x0} x2={L.plot.x1} y={L.baseline.y} ticks={L.baseline.ticks} labels={L.baseline.labels} />
      {L.bins.map((b) => (
        <Bin key={b.id} bin={b} merged={mergedById.get(b.id) ?? null} />
      ))}
      <Footnote x={L.footnote.x} y={L.footnote.y}>
        {L.footnote.text}
      </Footnote>
    </svg>
  );
}
