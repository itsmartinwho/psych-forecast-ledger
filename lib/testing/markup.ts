// Test helper: render a React tree to static markup in node and count things the design language limits.
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PALETTE } from "@/lib/tokens";

/** Static markup for a server or client component tree. No DOM, no effects. */
export function renderMarkup(node: ReactNode): string {
  return renderToStaticMarkup(node);
}

/** Case-insensitive count of a hex color in the markup. */
export function countHex(markup: string, hex: string): number {
  const needle = hex.toLowerCase();
  const hay = markup.toLowerCase();
  let count = 0;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    count += 1;
    i = hay.indexOf(needle, i + needle.length);
  }
  return count;
}

/** How many times the one accent color appears. Chart tests assert countAccent(markup) <= 1. */
export function countAccent(markup: string): number {
  return countHex(markup, PALETTE.accent);
}

/** Smallest font size in the markup (font-size attributes and inline styles), or null when there is no text. */
export function minFontSize(markup: string): number | null {
  const re = /font-size(?:="|:\s*)([\d.]+)(?:px)?/g;
  let min: number | null = null;
  for (let m = re.exec(markup); m; m = re.exec(markup)) {
    const v = Number(m[1]);
    if (!Number.isNaN(v) && (min === null || v < min)) min = v;
  }
  return min;
}
