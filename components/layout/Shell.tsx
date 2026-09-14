// Page shell: masthead, content, footer inside one 1200px column. Padding comes from .shell in globals.css
// (40px; 20px 16px under 760px). The masthead owns the gap above main.
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Masthead } from "./Masthead";
import type { NavHero } from "./Nav";

export interface ShellProps {
  /** Pathname of the current page, to mark the nav link. */
  current?: string;
  /** The hero forecaster: ds.forecasters.find((f) => f.hero). */
  hero: NavHero;
  children: ReactNode;
}

export function Shell({ current, hero, children }: ShellProps) {
  return (
    <div className="shell" style={{ maxWidth: 1200 }}>
      <Masthead hero={hero} current={current} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
