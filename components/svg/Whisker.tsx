// Interval mark: a 0.8px line with 7px caps at both ends. Works at any angle; caps stay perpendicular.
import { PALETTE, STROKE } from "@/lib/tokens";

export interface WhiskerProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cap?: number;
  color?: string;
  width?: number;
  className?: string;
}

export function Whisker({ x1, y1, x2, y2, cap = 7, color = PALETTE.ink, width = STROKE.whisker, className }: WhiskerProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  // Unit vector perpendicular to the whisker; a zero-length whisker gets vertical caps.
  const px = len === 0 ? 0 : -dy / len;
  const py = len === 0 ? 1 : dx / len;
  const hx = (px * cap) / 2;
  const hy = (py * cap) / 2;
  return (
    <g className={["whisker", className].filter(Boolean).join(" ")} stroke={color} strokeWidth={width}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - hx} y1={y1 - hy} x2={x1 + hx} y2={y1 + hy} />
      <line x1={x2 - hx} y1={y2 - hy} x2={x2 + hx} y2={y2 + hy} />
    </g>
  );
}
