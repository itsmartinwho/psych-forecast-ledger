// Wide-card split: a 250px aside column beside the chart. The grid comes from .split in globals.css.
// The Scoreboard puts its value, verdict and stat list in the aside; the donut sits in the chart column.
import type { ReactNode } from "react";

export interface CardSplitProps {
  /** Card head (title row and takeaway), rendered at the top of the aside. */
  head?: ReactNode;
  /** Aside content under the head. */
  aside?: ReactNode;
  children: ReactNode;
}

export function CardSplit({ head, aside, children }: CardSplitProps) {
  return (
    <div className="split">
      <div className="split-aside">
        {head}
        {aside}
      </div>
      <div className="split-chart">{children}</div>
    </div>
  );
}
