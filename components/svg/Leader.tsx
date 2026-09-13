// Dotted "1 3" leader that ties a label outside the plot to its mark.
import { PALETTE, STROKE } from "@/lib/tokens";

export interface LeaderProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
}

export function Leader({ x1, y1, x2, y2, color = PALETTE.muted, width = STROKE.hairline }: LeaderProps) {
  return <line className="leader" x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray="1 3" strokeLinecap="round" />;
}
