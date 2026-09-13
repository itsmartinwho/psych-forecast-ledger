// Structure lines (ledger rows, month rules, guides) stay between 0.5 and 0.9px so they read as paper, not ink.
import { PALETTE, STROKE } from "@/lib/tokens";

export interface HairlineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  color?: string;
  /** Optional dash pattern, for example "2 5" for a dotted guide. */
  dash?: string;
  className?: string;
}

export const HAIRLINE_MIN = 0.5;
export const HAIRLINE_MAX = STROKE.hairlineMax;

/** Clamp a requested width into the hairline band. */
export function hairlineWidth(width: number): number {
  return Math.min(HAIRLINE_MAX, Math.max(HAIRLINE_MIN, width));
}

export function Hairline({ x1, y1, x2, y2, width = STROKE.hairline, color = PALETTE.grid, dash, className }: HairlineProps) {
  return (
    <line
      className={["hairline-svg", className].filter(Boolean).join(" ")}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={hairlineWidth(width)}
      strokeDasharray={dash}
    />
  );
}
