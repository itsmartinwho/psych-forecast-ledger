// A median is a dashed "2 4" flag with an uppercase note, never a solid rule.
import { PALETTE, STROKE } from "@/lib/tokens";
import { Footnote } from "./Footnote";

export interface MedianFlagProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  /** Label position; defaults to just right of the (x2, y2) end. */
  labelX?: number;
  labelY?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
}

export function MedianFlag({ x1, y1, x2, y2, label, labelX, labelY, anchor = "start", color = PALETTE.muted }: MedianFlagProps) {
  return (
    <g className="median-flag">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={STROKE.hairlineMax} strokeDasharray="2 4" />
      {label ? (
        <Footnote x={labelX ?? x2 + 4} y={labelY ?? y2 + 2.5} anchor={anchor}>
          {label}
        </Footnote>
      ) : null}
    </g>
  );
}
