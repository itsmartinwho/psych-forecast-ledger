import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import { COIN_FLIP_TEXT, FOOTNOTE_TEXT, PROVISIONAL_DASH, UNIT_TEXT, layoutLeaderboardTickRows, leaderboardColumns, pickHeroRow } from "@/components/charts/layout/LeaderboardTickRows.layout";
import { leaderboardTickRowsFixture as fixture } from "@/components/charts/fixtures/LeaderboardTickRows.fixture";
import { progressWidth } from "@/components/svg/Progress";
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
  it("lays the columns out from the right edge: evidence, gutter, value, gutter, track", () => {
    expect(leaderboardColumns(FRAME.wide.w)).toEqual({ labelW: 120, valueX: 728, valueW: 44, evidenceX: 744, evidenceW: 56, gutter: 16 });
    expect(leaderboardColumns(FRAME.half.w)).toEqual({ labelW: 96, valueX: 336, valueW: 38, evidenceX: 346, evidenceW: 54, gutter: 10 });
    const W = layoutLeaderboardTickRows(fixture, FRAME.wide.w, FRAME.wide.h);
    expect(W.plot.x0).toBe(132);
    expect(W.plot.x1).toBe(672);
    const Hf = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    expect(Hf.plot.x0).toBe(108);
    expect(Hf.plot.x1).toBe(290);
    for (const [L, gutter] of [[W, 16], [Hf, 10]] as const) {
      for (const r of L.rows) {
        expect(r.value.x).toBe(L.columns.valueX);
        expect(r.evidence).not.toBeNull();
        expect(r.evidence!.x - r.value.x).toBeGreaterThanOrEqual(gutter);
        expect(r.evidence!.x).toBe(L.columns.evidenceX);
      }
      // The progress ticks fit inside the evidence column.
      expect(progressWidth(10)).toBeLessThanOrEqual(L.columns.evidenceW);
    }
  });
  it("gives T0 rows a count over the minimum, progress ticks, no whisker, and a faint dot only when a value exists", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h);
    const doblin = L.rows.find((r) => r.id === "doblin")!;
    expect(doblin.value).toMatchObject({ text: "6", sub: "of 10" });
    expect(doblin.evidence).toMatchObject({ kind: "progress", n: 6, need: 10, y: doblin.y });
    expect(doblin.lo).toBeNull();
    expect(doblin.variant).toBe("faint");
    expect(doblin.x).not.toBeNull();
    const market = L.rows.find((r) => r.id === "market")!;
    expect(market.value).toMatchObject({ text: "4", sub: "of 10" });
    expect(market.x).toBeNull();
    for (const r of L.rows) expect("tierText" in r).toBe(false);
    const five = layoutLeaderboardTickRows(fixture, FRAME.half.w, FRAME.half.h, { minN: 5 });
    expect(five.rows.find((r) => r.id === "doblin")!.value.sub).toBe("of 5");
  });
  it("gives scored rows the Brier, an events note, and a dashed whisker only when provisional", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.wide.w, FRAME.wide.h);
    const owen = L.rows.find((r) => r.id === "owen")!;
    expect(owen.value).toEqual({ text: "0.19", x: L.columns.valueX });
    expect(owen.evidence).toMatchObject({ kind: "text", text: "41 events" });
    expect(owen.whiskerDash).toBeNull();
    const ang = L.rows.find((r) => r.id === "angermayer")!;
    expect(ang.whiskerDash).toBe(PROVISIONAL_DASH);
    expect(ang.value.text).toBe("0.31");
    expect(L.rows.filter((r) => r.whiskerDash !== null).map((r) => r.id)).toEqual(["angermayer"]);
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
  it("writes the direction note at the left of the track and the unit at its right", () => {
    const L = layoutLeaderboardTickRows(fixture, FRAME.wide.w, FRAME.wide.h);
    expect(FOOTNOTE_TEXT).toBe("← better");
    expect(UNIT_TEXT).toBe("Brier");
    expect(L.footnote).toEqual({ x: L.plot.x0, y: FRAME.wide.h - 6, text: FOOTNOTE_TEXT });
    expect(L.unit).toEqual({ x: L.plot.x1, y: FRAME.wide.h - 6, text: UNIT_TEXT });
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
  it("shows the whiskers, the coin flip, the progress ticks, the events notes and the two footnotes", () => {
    expect(half.match(/class="whisker fade"/g)?.length).toBe(3);
    expect(half.match(/class="whisker--dashed" stroke-dasharray="2 2"/g)?.length).toBe(1);
    expect(half).toContain('stroke-dasharray="2 4"');
    expect(half).toContain(">COIN FLIP</text>");
    expect(half.match(/class="progress"/g)?.length).toBe(2);
    expect(half).toContain('aria-label="6 of 10"');
    expect(half).toContain(">41 EVENTS</text>");
    expect(half).toContain(">14 EVENTS</text>");
    expect(half).not.toContain("COUNTS ONLY");
    expect(half).not.toContain(">FULL<");
    expect(half).toContain(">← BETTER</text>");
    expect(half).toContain('text-anchor="end" style="text-transform:uppercase">BRIER</text>');
    expect(half).toContain('href="/forecasters/owen"');
    expect(half).toContain("animation-delay:");
    expect(half).toContain('class="mark mark--solid pop"');
  });
  it("writes a T0 value as two tspans and a score in weight 800 with a halo", () => {
    expect(half).toContain('<tspan>6</tspan><tspan dx="3" font-size="8" font-weight="600" fill="#8F8E88">of 10</tspan>');
    expect(half).toContain('font-weight="800"');
    expect(half).toContain('paint-order="stroke fill"');
    expect(half).toContain("<tspan>0.19</tspan></text>");
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
