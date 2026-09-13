// One mark per record. Solid = hit, hollow = miss, tiny = void. Radius comes from the caller (sqrt of value).
import type { CSSProperties } from "react";
import { LADDER, PALETTE, STROKE } from "@/lib/tokens";

export type MarkVariant = "solid" | "hollow" | "tiny";

export interface MarkProps {
  cx: number;
  cy: number;
  r?: number;
  variant?: MarkVariant;
  /** Ink by default; a chart passes the accent for its one hero. */
  color?: string;
  className?: string;
  /** Motion stagger in ms; sets animation-delay on the element. */
  delay?: number;
  /** Tooltip for a real record. Decoration passes none. */
  title?: string;
}

export const TINY_RADIUS = 1.2;

export function Mark({ cx, cy, r = 3, variant = "solid", color = PALETTE.ink, className, delay, title }: MarkProps) {
  const style: CSSProperties | undefined = delay === undefined ? undefined : { animationDelay: `${delay}ms` };
  const cls = ["mark", `mark--${variant}`, className].filter(Boolean).join(" ");
  const radius = variant === "tiny" ? TINY_RADIUS : r;
  const paint =
    variant === "hollow"
      ? { fill: PALETTE.paper, stroke: color, strokeWidth: STROKE.hairlineMax }
      : variant === "tiny"
        ? { fill: LADDER[4], stroke: "none" as const }
        : { fill: color, stroke: "none" as const };
  return (
    <circle cx={cx} cy={cy} r={radius} className={cls} style={style} {...paint}>
      {title ? <title>{title}</title> : null}
    </circle>
  );
}
