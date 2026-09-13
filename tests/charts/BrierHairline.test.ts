import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { BrierHairline } from "@/components/charts/BrierHairline";
import { COIN_FLIP_TEXT, FOOTNOTE_TEXT, LABEL_GAP, layoutBrierHairline, pickHeroSeries, quarterIndex } from "@/components/charts/layout/BrierHairline.layout";
import { brierHairlineFixture as fixture } from "@/components/charts/fixtures/BrierHairline.fixture";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

const ROOT = path.resolve(__dirname, "../..");
const OWNED = ["components/charts/BrierHairline.tsx", "components/charts/layout/BrierHairline.layout.ts", "components/charts/fixtures/BrierHairline.fixture.ts"];
const BANNED = ["leverage", "robust", "seamless", "unlock", "streamline", "landscape", "ecosystem"];

const countMarks = (m: string): number => m.match(/class="mark /g)?.length ?? 0;
const nonNull = fixture.series.reduce((s, x) => s + x.points.filter((p) => p.value !== null).length, 0);

describe("quarterIndex", () => {
  it("maps quarters, months and years to one quarter index", () => {
    expect(quarterIndex("2024-Q1")).toBe(2024 * 4);
    expect(quarterIndex("2024-Q4")).toBe(2024 * 4 + 3);
    expect(quarterIndex("2024-05")).toBe(2024 * 4 + 1);
    expect(quarterIndex("2024")).toBe(2024 * 4);
    expect(quarterIndex("soon")).toBeNull();
  });
});

describe("layoutBrierHairline", () => {
  it("is deterministic in both frames", () => {
    for (const f of [FRAME.half, FRAME.wide]) {
      const a = layoutBrierHairline(fixture, f.w, f.h);
      const b = layoutBrierHairline(fixture, f.w, f.h);
      expect(a).toEqual(b);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
  it("gives one path per series and breaks the path at a null", () => {
    const L = layoutBrierHairline(fixture, FRAME.wide.w, FRAME.wide.h);
    expect(L.series.length).toBe(fixture.series.length);
    const owen = L.series.find((s) => s.id === "owen")!;
    expect(owen.d.match(/M/g)?.length).toBe(2);
    expect(owen.points.length).toBe(20);
    const base = L.series.find((s) => s.id === "base-rate")!;
    expect(base.d.match(/M/g)?.length).toBe(1);
  });
  it("keeps one point per non-null period, hollow under three events", () => {
    const L = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.series.reduce((s, x) => s + x.points.length, 0)).toBe(nonNull);
    const doblin = L.series.find((s) => s.id === "doblin")!;
    expect(doblin.points.filter((p) => p.hollow).length).toBe(6);
    expect(doblin.points.find((p) => p.period === "2024-Q3")?.hollow).toBe(false);
  });
  it("marks the hero by flag or by override and gives it best and worst labels", () => {
    const L = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.heroId).toBe("owen");
    const owen = L.series.find((s) => s.id === "owen")!;
    expect(owen.hero).toBe(true);
    expect(owen.best?.text).toBe("0.09");
    expect(owen.worst?.text).toBe("0.42");
    expect(owen.best!.y).toBeGreaterThan(owen.points.find((p) => p.period === "2025-Q3")!.y);
    expect(owen.worst!.y).toBeLessThan(owen.points.find((p) => p.period === "2024-Q2")!.y);
    for (const s of L.series) if (!s.hero) expect(s.best).toBeNull();
    const O = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h, { hero: "doblin" });
    expect(O.series.filter((s) => s.hero).map((s) => s.id)).toEqual(["doblin"]);
    expect(pickHeroSeries(fixture.series, "nobody")).toBe("owen");
  });
  it("assigns ladder tones to the other series, darkest first", () => {
    const L = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h);
    const tones = L.series.filter((s) => !s.hero).map((s) => s.tone);
    expect(tones).toEqual([LADDER[1], LADDER[3], LADDER[4]]);
  });
  it("labels the latest value of every series and keeps the labels apart", () => {
    const L = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h);
    const latest = L.series.map((s) => s.latest!);
    expect(latest.map((l) => l.valueText)).toEqual(["0.16", "0.34", "0.41", "0.23"]);
    expect(latest.map((l) => l.nameText)).toEqual(["OWEN", "ANGERMAYER", "DOBLIN", "BASE RATE"]);
    const ys = latest.map((l) => l.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(LABEL_GAP - 0.01);
    for (const l of latest) expect(l.y).toBeLessThanOrEqual(L.plot.y1);
  });
  it("sets the y domain to at least 0.6 and puts the coin flip at 0.25", () => {
    const L = layoutBrierHairline(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.yTop).toBe(0.66);
    expect(L.coinFlip?.text).toBe(COIN_FLIP_TEXT);
    const small = { ...fixture, series: fixture.series.filter((s) => s.id === "owen") };
    expect(layoutBrierHairline(small, FRAME.half.w, FRAME.half.h).yTop).toBe(0.6);
  });
  it("lays a floor of one tick per quarter with a taller tick and a year label at each Q1", () => {
    const L = layoutBrierHairline(fixture, FRAME.wide.w, FRAME.wide.h);
    expect(L.floor.xs.length).toBe(21);
    expect(L.baseline.labels).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(L.floor.majorXs.length).toBe(5);
  });
});

describe("BrierHairline", () => {
  const half = renderMarkup(createElement(BrierHairline, { data: fixture, size: "half" }));
  const wide = renderMarkup(createElement(BrierHairline, { data: fixture, size: "wide" }));
  it("renders one svg per frame with the viewBox", () => {
    expect(half.startsWith('<svg viewBox="0 0 400 320"')).toBe(true);
    expect(wide.startsWith('<svg viewBox="0 0 800 300"')).toBe(true);
  });
  it("draws one dot per non-null point and one path per series", () => {
    expect(countMarks(half)).toBe(nonNull);
    expect(countMarks(wide)).toBe(nonNull);
    expect(half.match(/class="draw"/g)?.length).toBe(fixture.series.length);
    expect(half.match(/pathLength="1"/g)?.length).toBe(fixture.series.length);
    expect(half).toContain('stroke-width="1"');
  });
  it("uses the accent once, on the hero group", () => {
    expect(countAccent(half)).toBe(1);
    expect(countAccent(wide)).toBe(1);
    expect(half).toContain(`style="color:${PALETTE.accent}"`);
    expect(countAccent(renderMarkup(createElement(BrierHairline, { data: fixture, size: "wide", hero: "angermayer" })))).toBe(1);
  });
  it("keeps every text at or above the floor", () => {
    expect(minFontSize(half)).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("shows the coin flip, the floor, the year labels, the latest labels and the footnote", () => {
    expect(half).toContain('stroke-dasharray="2 4"');
    expect(half).toContain(">COIN FLIP</text>");
    expect(half.match(/class="barcode-floor"/g)?.length).toBe(2);
    expect(half).toContain(">2024</text>");
    expect(half).toContain(">OWEN</text>");
    expect(half).toContain(">0.16</text>");
    expect(half).toContain(">0.09</text>");
    expect(half).toContain(`>${FOOTNOTE_TEXT.toUpperCase()}</text>`);
    expect(half).toContain("animation-delay:");
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
