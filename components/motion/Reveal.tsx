"use client";
// Reveal on scroll: adds is-in when 30% of the block is visible; a click replays the entry.
// Reduced motion gets is-in at once and the CSS turns the animations off. The wrapper adds no size, so no layout shift.
import { useEffect, useRef, type ReactNode } from "react";
import { MOTION } from "@/lib/tokens";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface RevealProps {
  children: ReactNode;
  className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    // A tall block never reaches the 30 percent ratio in a short viewport, so a block also counts as in view
    // when the visible part is at least 40 percent of the viewport height.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const viewport = e.rootBounds?.height ?? window.innerHeight;
          const enough = e.intersectionRatio >= MOTION.observerThreshold || e.intersectionRect.height >= viewport * 0.4;
          if (enough) {
            el.classList.add("is-in");
            io.unobserve(el);
          }
        }
      },
      { threshold: [0, 0.1, 0.2, MOTION.observerThreshold] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Remove, force a reflow, add again: the browser restarts every animation inside.
  const replay = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-in");
    void el.offsetWidth;
    el.classList.add("is-in");
  };

  return (
    <div ref={ref} className={["reveal", className].filter(Boolean).join(" ")} onClick={replay}>
      {children}
    </div>
  );
}
