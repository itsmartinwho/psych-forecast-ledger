"use client";
// Two pre-rendered layouts of one chart: the wide card (800x300) at 760px and up, the half card (400x320) below.
// The server renders the wide one; a layout effect swaps before first paint on narrow screens.
import { useLayoutEffect, useState, type ReactNode } from "react";

export const FRAME_BREAKPOINT = 760;
export const WIDE_QUERY = `(min-width: ${FRAME_BREAKPOINT}px)`;
export type FrameMode = "wide" | "half";

/** Pure rule: which layout a viewport width gets. */
export function frameMode(width: number): FrameMode {
  return width >= FRAME_BREAKPOINT ? "wide" : "half";
}

export interface ChartFrameProps {
  wide: ReactNode;
  half: ReactNode;
  className?: string;
}

export function ChartFrame({ wide, half, className }: ChartFrameProps) {
  const [mode, setMode] = useState<FrameMode>("wide");

  useLayoutEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(WIDE_QUERY);
    const apply = () => setMode(mq.matches ? "wide" : "half");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className={["chart-frame", `chart-frame--${mode}`, className].filter(Boolean).join(" ")} data-mode={mode}>
      <div className="chart-frame-wide" hidden={mode !== "wide"}>
        {wide}
      </div>
      <div className="chart-frame-half" hidden={mode !== "half"}>
        {half}
      </div>
    </div>
  );
}
