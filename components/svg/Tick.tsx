// A single axis or rail tick, with an optional label. Direction says which way it points from (x, y).
import { FONT, PALETTE, STROKE } from "@/lib/tokens";

export type TickDirection = "down" | "up" | "left" | "right";

export interface TickProps {
  x: number;
  y: number;
  length?: number;
  direction?: TickDirection;
  width?: number;
  color?: string;
  label?: string;
  labelSize?: number;
  labelColor?: string;
  className?: string;
}

export function Tick({ x, y, length = 4, direction = "down", width = STROKE.baseline, color = PALETTE.ink, label, labelSize = FONT.axis.size, labelColor = PALETTE.muted, className }: TickProps) {
  const x2 = direction === "left" ? x - length : direction === "right" ? x + length : x;
  const y2 = direction === "up" ? y - length : direction === "down" ? y + length : y;
  // Label sits just past the tick end, on the same side it points to.
  const gap = 3;
  const lx = direction === "left" ? x2 - gap : direction === "right" ? x2 + gap : x;
  const ly = direction === "up" ? y2 - gap : direction === "down" ? y2 + gap + labelSize : y + labelSize / 3;
  const anchor = direction === "left" ? "end" : direction === "right" ? "start" : "middle";
  return (
    <g className={["tick", className].filter(Boolean).join(" ")}>
      <line x1={x} y1={y} x2={x2} y2={y2} stroke={color} strokeWidth={width} />
      {label ? (
        <text x={lx} y={ly} fontSize={labelSize} fontWeight={FONT.axis.weight} fill={labelColor} textAnchor={anchor}>
          {label}
        </text>
      ) : null}
    </g>
  );
}
