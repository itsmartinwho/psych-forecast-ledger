// Collapsed disclosure under a chart: an uppercase summary and one to five sentences of body text.
// The same element carries "More metrics" and "About this person"; only the summary changes.
import type { ReactNode } from "react";

export interface HowToReadProps {
  /** Summary text, sentence case; CSS uppercases it. */
  summary?: string;
  open?: boolean;
  className?: string;
  children: ReactNode;
}

export function HowToRead({ summary = "How to read", open, className, children }: HowToReadProps) {
  return (
    <details className={["how", className].filter(Boolean).join(" ")} open={open}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
