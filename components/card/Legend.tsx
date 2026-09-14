// Legend glyphs mirror the marks: solid, hollow, void, tick, dash, accent (one per chart), progress ticks,
// whisker (solid or dashed). A "text" item has no glyph: it carries an encoding a glyph cannot show ("dot area = p").
import type { ReactNode } from "react";

export type LegendGlyph = "solid" | "hollow" | "void" | "tick" | "dash" | "accent" | "progress" | "whisker" | "whisker-dashed" | "text";

export interface LegendItem {
  glyph: LegendGlyph;
  label: string;
}

export interface LegendProps {
  items?: LegendItem[];
  children?: ReactNode;
  className?: string;
}

function Glyph({ glyph }: { glyph: LegendGlyph }) {
  if (glyph === "text") return null;
  if (glyph === "progress") {
    return (
      <i className="glyph glyph--progress" aria-hidden="true">
        <b />
        <b />
        <b />
      </i>
    );
  }
  return <i className={glyph === "solid" ? "glyph" : `glyph glyph--${glyph}`} aria-hidden="true" />;
}

export function Legend({ items = [], children, className }: LegendProps) {
  return (
    <div className={["legend", className].filter(Boolean).join(" ")}>
      {items.map((it) => (
        <span key={`${it.glyph}-${it.label}`} className={it.glyph === "text" ? "legend-item legend-item--text" : "legend-item"}>
          <Glyph glyph={it.glyph} />
          {it.label}
        </span>
      ))}
      {children}
    </div>
  );
}
