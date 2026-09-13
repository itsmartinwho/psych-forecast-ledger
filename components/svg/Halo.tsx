// In-chart value label: weight 800 with a paper halo so it stays readable over marks and hairlines.
import type { CSSProperties, ReactNode } from "react";
import { FONT, HALO, PALETTE } from "@/lib/tokens";

export interface HaloProps {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  className?: string;
  /** Motion stagger in ms; sets animation-delay on the element. */
  delay?: number;
}

export function Halo({ x, y, children, size = FONT.value.max, anchor = "middle", fill = PALETTE.ink, className, delay }: HaloProps) {
  const style: CSSProperties | undefined = delay === undefined ? undefined : { animationDelay: `${delay}ms` };
  const cls = ["halo", className].filter(Boolean).join(" ");
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={FONT.value.weight}
      textAnchor={anchor}
      fill={fill}
      paintOrder="stroke fill"
      stroke={HALO.stroke}
      strokeWidth={HALO.width}
      strokeLinejoin="round"
      className={cls}
      style={style}
    >
      {children}
    </text>
  );
}
