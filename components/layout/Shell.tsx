// Page shell: masthead, content, footer inside one 1200px column. Padding comes from .shell in globals.css
// (40px; 20px 16px under 760px). The masthead owns the gap above main.
// The nav lists every forecaster; a page passes them, or the shell reads them from the dataset.
import type { ReactNode } from "react";
import { getDataset } from "@/lib/data/cached";
import { Footer } from "./Footer";
import { Masthead } from "./Masthead";
import type { NavHero } from "./Nav";

export interface ShellProps {
  /** Pathname of the current page, to mark the nav link. */
  current?: string;
  /** The hero forecaster: ds.forecasters.find((f) => f.hero). Kept for pages that pass it; the nav lists everyone. */
  hero?: NavHero;
  /** Forecasters in nav order. Read from the dataset when absent. */
  forecasters?: NavHero[];
  children: ReactNode;
}

/** Nav order: the hero first, then the others as listed in forecasters.json. */
export function navForecasters(): NavHero[] {
  const all = getDataset().forecasters;
  const hero = all.filter((f) => f.hero);
  const rest = all.filter((f) => !f.hero);
  return [...hero, ...rest].map((f) => ({ slug: f.slug, name: f.name }));
}

export function Shell({ current, forecasters, children }: ShellProps) {
  const list = forecasters ?? navForecasters();
  return (
    <div className="shell" style={{ maxWidth: 1200 }}>
      <Masthead forecasters={list} current={current} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
