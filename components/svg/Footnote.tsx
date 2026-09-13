// SVG footnote: uppercase 7px 600 with wide tracking in the fifth ladder step. Restates a unit or a rule.
import type { ReactNode } from "react";
import { FONT, LADDER } from "@/lib/tokens";

export interface FootnoteProps {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  className?: string;
}

export function Footnote({ x, y, children, anchor = "start", className }: FootnoteProps) {
  const text = typeof children === "string" ? children.toUpperCase() : children;
  return (
    <text
      className={["footnote", className].filter(Boolean).join(" ")}
      x={x}
      y={y}
      fontSize={FONT.footnote.size}
      fontWeight={FONT.footnote.weight}
      letterSpacing={FONT.footnote.tracking}
      fill={LADDER[4]}
      textAnchor={anchor}
      style={{ textTransform: "uppercase" }}
    >
      {text}
    </text>
  );
}
