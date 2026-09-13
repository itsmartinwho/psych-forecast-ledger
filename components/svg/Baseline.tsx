// The only axis line a chart gets: one 0.8px ink baseline with short ticks. No spines, no box.
import { FONT, PALETTE, STROKE } from "@/lib/tokens";

export interface BaselineProps {
  x1: number;
  x2: number;
  y: number;
  /** x positions of ticks along the baseline. */
  ticks?: number[];
  /** Labels aligned with ticks, in the same order. */
  labels?: string[];
  tickLength?: number;
  color?: string;
  labelColor?: string;
  labelSize?: number;
}

export function Baseline({ x1, x2, y, ticks = [], labels, tickLength = 4, color = PALETTE.ink, labelColor = PALETTE.muted, labelSize = FONT.axis.size }: BaselineProps) {
  return (
    <g className="baseline">
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={STROKE.baseline} />
      {ticks.map((x, i) => (
        <line key={i} x1={x} x2={x} y1={y} y2={y + tickLength} stroke={color} strokeWidth={STROKE.baseline} />
      ))}
      {labels?.map((label, i) =>
        ticks[i] === undefined ? null : (
          <text key={`l${i}`} x={ticks[i]} y={y + tickLength + labelSize + 2} fontSize={labelSize} fontWeight={FONT.axis.weight} fill={labelColor} textAnchor="middle">
            {label}
          </text>
        ),
      )}
    </g>
  );
}
