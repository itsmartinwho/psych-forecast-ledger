import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { CalibrationPlumb } from "@/components/charts/CalibrationPlumb";
import { FOOTNOTE_TEXT, IDEAL_TEXT, PLUMB_WIDTH, R_MAX, R_MIN, heroLabelText, layoutCalibrationPlumb, pickHeroBin } from "@/components/charts/layout/CalibrationPlumb.layout";
import { calibrationPlumbFixture as fixture } from "@/components/charts/fixtures/CalibrationPlumb.fixture";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE } from "@/lib/tokens";

const ROOT = path.resolve(__dirname, "../..");
const OWNED = ["components/charts/CalibrationPlumb.tsx", "components/charts/layout/CalibrationPlumb.layout.ts", "components/charts/fixtures/CalibrationPlumb.fixture.ts"];
const BANNED = ["leverage", "robust", "seamless", "unlock", "streamline", "landscape", "ecosystem"];

const countMarks = (m: string): number => m.match(/class="mark /g)?.length ?? 0;

describe("layoutCalibrationPlumb", () => {
  it("is deterministic in both frames", () => {
    for (const f of [FRAME.half, FRAME.wide]) {
      const a = layoutCalibrationPlumb(fixture, f.w, f.h);
      const b = layoutCalibrationPlumb(fixture, f.w, f.h);
      expect(a).toEqual(b);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
  it("orders bins by forecast and picks the bin furthest from the ideal as hero", () => {
    const L = layoutCalibrationPlumb(fixture, FRAME.half.w, FRAME.half.h);
    expect(L.bins.map((b) => b.id)).toEqual(["E", "D", "C", "B", "A"]);
    expect(L.heroId).toBe("A");
    expect(L.bins.filter((b) => b.hero).map((b) => b.id)).toEqual(["A"]);
    expect(pickHeroBin(fixture.bins, "C")).toBe("C");
    expect(pickHeroBin(fixture.bins, "Z")).toBe("A");
    expect(pickHeroBin(fixture.bins.map((b) => ({ ...b, observed: null })))).toBeNull();
  });
  it("labels the hero with both values and keeps the label inside the track", () => {
    const wide = layoutCalibrationPlumb(fixture, FRAME.wide.w, FRAME.wide.h).bins.find((b) => b.id === "A")!;
    expect(wide.heroLabel?.text).toBe("90% said · 71% came true");
    expect(wide.heroLabel?.anchor).toBe("middle");
    // On the half card the label would run past the right edge, so it anchors at the end of the track.
    const half = layoutCalibrationPlumb(fixture, FRAME.half.w, FRAME.half.h);
    const a = half.bins.find((b) => b.id === "A")!;
    expect(a.heroLabel?.anchor).toBe("end");
    expect(a.heroLabel?.x).toBe(half.plot.x1);
    expect(heroLabelText({ bin: "D", forecast: 0.3, observed: null, n: 3 })).toBe("30% said · no outcomes yet");
  });
  it("scales the radius by the square root of n between 3 and 14", () => {
    const L = layoutCalibrationPlumb(fixture, FRAME.half.w, FRAME.half.h);
    const byId = Object.fromEntries(L.bins.map((b) => [b.id, b]));
    expect(byId.A.r).toBe(R_MAX);
    expect(byId.D.r).toBeGreaterThanOrEqual(R_MIN);
    expect(byId.B.r).toBeCloseTo(R_MAX * Math.sqrt(26 / 34), 1);
    expect(byId.E.r).toBeLessThan(byId.B.r);
  });
  it("puts a bin with no observed share hollow on the ideal line", () => {
    const L = layoutCalibrationPlumb(fixture, FRAME.half.w, FRAME.half.h);
    const d = L.bins.find((b) => b.id === "D")!;
    expect(d.hollow).toBe(true);
    // y of the dot equals y of forecast 0.3 on the ideal line
    const yOf = (v: number) => L.plot.y1 - v * (L.plot.y1 - L.plot.y0);
    expect(d.y).toBeCloseTo(yOf(0.3), 1);
    expect(d.x).toBeCloseTo(L.plot.x0 + 0.3 * (L.plot.x1 - L.plot.x0), 1);
  });
  it("drops one floor tick per event under each dot and one plumb to the floor", () => {
    const L = layoutCalibrationPlumb(fixture, FRAME.half.w, FRAME.half.h);
    for (const b of L.bins) {
      expect(b.ticks.length).toBe(b.n);
      expect(b.plumbY2).toBe(L.floor.y);
      expect(b.plumbY1).toBeGreaterThanOrEqual(b.y);
      for (const t of b.ticks) {
        expect(t).toBeGreaterThanOrEqual(L.plot.x0);
        expect(t).toBeLessThanOrEqual(L.plot.x1);
      }
    }
    expect(L.floor.xs.length).toBe(fixture.bins.reduce((s, b) => s + b.n, 0));
  });
});

describe("CalibrationPlumb", () => {
  const half = renderMarkup(createElement(CalibrationPlumb, { data: fixture, size: "half" }));
  const wide = renderMarkup(createElement(CalibrationPlumb, { data: fixture, size: "wide" }));
  it("renders one svg per frame with the viewBox", () => {
    expect(half.startsWith('<svg viewBox="0 0 400 320"')).toBe(true);
    expect(wide.startsWith('<svg viewBox="0 0 800 300"')).toBe(true);
  });
  it("draws one dot per bin", () => {
    expect(countMarks(half)).toBe(fixture.bins.length);
    expect(countMarks(wide)).toBe(fixture.bins.length);
    expect(half.match(/class="mark mark--hollow/g)?.length).toBe(1);
  });
  it("uses the accent once, on the hero group", () => {
    expect(countAccent(half)).toBe(1);
    expect(countAccent(wide)).toBe(1);
    expect(half).toContain(`style="color:${PALETTE.accent}"`);
    expect(countAccent(renderMarkup(createElement(CalibrationPlumb, { data: fixture, size: "half", hero: "D" })))).toBe(1);
  });
  it("keeps every text at or above the floor", () => {
    expect(minFontSize(half)).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("shows the ideal line, the plumbs, the floor, the counts and the footnote", () => {
    expect(half).toContain('stroke-dasharray="3 3"');
    expect(half).toContain(`>${IDEAL_TEXT.toUpperCase()}</text>`);
    expect(half.match(new RegExp(`stroke-width="${PLUMB_WIDTH}"`, "g"))?.length).toBe(fixture.bins.length);
    expect(half).toContain('class="barcode-floor"');
    expect(half).toContain(">n=34</text>");
    expect(half).toContain(">90% said · 71% came true</text>");
    expect(half).toContain(`>${FOOTNOTE_TEXT.toUpperCase()}</text>`);
    expect(half).toContain(">100%</text>");
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
