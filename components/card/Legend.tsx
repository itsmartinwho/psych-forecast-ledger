// Legend glyphs mirror the marks: solid = hit, hollow = miss, void = tiny dot, tick, dash, accent (one per chart).
import type { ReactNode } from "react";

export type LegendGlyph = "solid" | "hollow" | "void" | "tick" | "dash" | "accent";

export interface LegendItem {
  glyph: LegendGlyph;
  label: string;
}

export interface LegendProps {
  items?: LegendItem[];
  children?: ReactNode;
  className?: string;
}

export function Legend({ items = [], children, className }: LegendProps) {
  return (
    <div className={["legend", className].filter(Boolean).join(" ")}>
      {items.map((it) => (
        <span key={`${it.glyph}-${it.label}`} className="legend-item">
          <i className={it.glyph === "solid" ? "glyph" : `glyph glyph--${it.glyph}`} aria-hidden="true" />
          {it.label}
        </span>
      ))}
      {children}
    </div>
  );
}
