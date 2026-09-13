// Wide-card split: a 250px column (title, sub, note, legend) beside the chart. The grid comes from .split in globals.css.
import type { ReactNode } from "react";
import { Note } from "./Note";

export interface CardSplitProps {
  /** Title and sub line, rendered at the top of the text column. */
  head?: ReactNode;
  note?: string;
  legend?: ReactNode;
  children: ReactNode;
}

export function CardSplit({ head, note, legend, children }: CardSplitProps) {
  return (
    <div className="split">
      <div className="split-aside">
        {head}
        {note ? <Note>{note}</Note> : null}
        {legend}
      </div>
      <div className="split-chart">{children}</div>
    </div>
  );
}
