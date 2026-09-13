import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import { COIN_FLIP_TEXT, FOOTNOTE_TEXT, layoutLeaderboardTickRows, pickHeroRow } from "@/components/charts/layout/LeaderboardTickRows.layout";
import { leaderboardTickRowsFixture as fixture } from "@/components/charts/fixtures/LeaderboardTickRows.fixture";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE } from "@/lib/tokens";

const ROOT = path.resolve(__dirname, "../..");
const OWNED = ["components/charts/LeaderboardTickRows.tsx", "components/charts/layout/LeaderboardTickRows.layout.ts", "components/charts/fixtures/LeaderboardTickRows.fixture.ts"];
const BANNED = ["leverage", "robust", "seamless", "unlock", "streamline", "landscape", "ecosystem"];

const countMarks = (m: string): number => m.match(/class="mark /g)?.length ?? 0;

describe("layoutLeaderboardTickRows", () => {
  it("is deterministic in both frames", () => {
    for (const f of [FRAME.half, FRAME.wide]) {
      const a = layoutLeaderboardTickRows(fixture, f.w, f.h);
      const b = layoutLeaderboardTickRows(fixture, f.w, f.h);
      expect(a).toEqual(b);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
  it("puts persons first in label order, then the reference rows", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.rows.map((r) => r.id)).toEqual(["angermayer", "doblin", "owen", "base-rate", "market"]);
    const ranked = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h, { ranked: true });
    expect(ranked.rows.map((r) => r.id)).toEqual(["owen", "angermayer", "doblin", "base-rate", "market"]);
  });
  it("marks one hero row, by flag or by override", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.heroId).toBe("owen");
    expect(L.rows.filter((r) => r.hero).map((r) => r.id)).toEqual(["owen"]);
    const O = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h, { hero: "angermayer" });
    expect(O.rows.filter((r) => r.hero).map((r) => r.id)).toEqual(["angermayer"]);
    expect(pickHeroRow(fixture.rows, "nobody")).toBe("owen");
    expect(pickHeroRow(fixture.rows.map((r) => ({ ...r, hero: false })))).toBeNull();
  });
  it("gives T0 rows a count instead of a score, no whisker, and a faint dot only when a value exists", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    const doblin = L.rows.find((r) => r.id === "doblin")!;
    expect(doblin.valueText).toBe("6 OF 10");
    expect(doblin.tierText).toBe("Counts only");
    expect(doblin.lo).toBeNull();
    expect(doblin.variant).toBe("faint");
    expect(doblin.x).not.toBeNull();
    const market = L.rows.find((r) => r.id === "market")!;
    expect(market.valueText).toBe("4 OF 10");
    expect(market.x).toBeNull();
  });
  it("hollows reference rows and keeps whiskers inside the track", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.wide.w, FRAME.wide.h);
    const base = L.rows.find((r) => r.id === "base-rate")!;
    expect(base.variant).toBe("hollow");
    for (const r of L.rows) {
      if (r.lo === null || r.hi === null) continue;
      expect(r.lo).toBeGreaterThanOrEqual(L.plot.x0);
      expect(r.hi).toBeLessThanOrEqual(L.plot.x1);
      expect(r.lo).toBeLessThanOrEqual(r.x as number);
      expect(r.hi).toBeGreaterThanOrEqual(r.x as number);
    }
  });
  it("places the coin flip inside the domain and drops it outside", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.coinFlip?.text).toBe(COIN_FLIP_TEXT);
    expect(L.coinFlip?.x).toBe((L.plot.x0 + L.plot.x1) / 2);
    expect(layoutLeaderboardTickRows({ ...fixture, coinFlip: 0.9 }, FRAME.half.w, FRAME.half.h).coinFlip).toBeNull();
  });
});

describe("LeaderboardTickRows", () => {
  const half = renderMarkup(createElement(LeaderboardTickRows, { data: fixture, size: "half" }));
  const wide = renderMarkup(createElement(LeaderboardTickRows, { data: fixture, size: "wide" }));
  it("renders one svg per frame with the viewBox", () => {
    expect(half.startsWith('<svg viewBox="0 0 400 320"')).toBe(true);
    expect(wide.startsWith('<svg viewBox="0 0 800 300"')).toBe(true);
  });
  it("draws one dot per row that has a score", () => {
    const withValue = fixture.rows.filter((r) => r.value !== null).length;
    expect(countMarks(half)).toBe(withValue);
    expect(countMarks(wide)).toBe(withValue);
  });
  it("uses the accent once, on the hero group", () => {
    expect(countAccent(half)).toBe(1);
    expect(countAccent(wide)).toBe(1);
    expect(half).toContain(`class="hero" style="color:${PALETTE.accent}"`);
    expect(countAccent(renderMarkup(createElement(LeaderboardTickRows, { data: fixture, size: "half", hero: "doblin" })))).toBe(1);
  });
  it("keeps every text at or above the floor", () => {
    expect(minFontSize(half)).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("shows the whiskers, the coin flip, the tier text and the footnote", () => {
    expect(half.match(/class="whisker/g)?.length).toBe(3);
    expect(half).toContain('stroke-dasharray="2 4"');
    expect(half).toContain(">COIN FLIP</text>");
    expect(half).toContain(">FULL</text>");
    expect(half).toContain(">COUNTS ONLY</text>");
    expect(half).toContain(`>${FOOTNOTE_TEXT.toUpperCase()}</text>`);
    expect(half).toContain('href="/forecasters/owen"');
    expect(half).toContain("animation-delay:");
    expect(half).toContain('class="mark mark--solid pop"');
  });
  it("uses the hero score in weight 800 with a halo", () => {
    expect(half).toContain('font-weight="800"');
    expect(half).toContain('paint-order="stroke fill"');
    expect(half).toContain(">0.19</text>");
  });
});

describe("conventions", () => {
  for (const f of OWNED) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    it(`${f} touches no clock, no randomness and no banned words`, () => {
      expect(src).not.toMatch(/Date\.now\(/);
      expect(src).not.toMatch(/new Date\(\)/);
      expect(src).not.toMatch(/Math\.random/);
      for (const w of BANNED) expect(src.toLowerCase()).not.toContain(w);
    });
  }
});
