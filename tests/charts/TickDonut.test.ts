import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TickDonut } from "@/components/charts/TickDonut";
import { tickDonutCensusFixture, tickDonutFixture } from "@/components/charts/fixtures/TickDonut.fixture";
import { LABEL_GAP, MAX_TICKS, R_INNER, R_OUTER, layoutTickDonut, ticksPerSegment } from "@/components/charts/layout/TickDonut.layout";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

const { w: HW, h: HH } = FRAME.half;
const { w: WW, h: WH } = FRAME.wide;

describe("layoutTickDonut", () => {
  it("is deterministic on the fixture", () => {
    const a = layoutTickDonut(tickDonutFixture, HW, HH);
    const b = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(layoutTickDonut(tickDonutCensusFixture, WW, WH)).toEqual(layoutTickDonut(tickDonutCensusFixture, WW, WH));
  });
  it("draws one tick per record when the total is 100 or less", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(L.oneTickPerRecord).toBe(true);
    expect(L.ticksTotal).toBe(84);
    for (const seg of L.segments) expect(seg.ticks.length).toBe(tickDonutFixture.segments.find((s) => s.id === seg.id)!.count);
    // One empty slot between segments: 84 ticks plus 4 gaps.
    expect(L.slots).toBe(84 + 4);
    const used = new Set(L.segments.flatMap((s) => s.ticks.map((t) => t.slot)));
    expect(used.size).toBe(84);
    for (let i = 1; i < L.segments.length; i++) {
      const prevLast = L.segments[i - 1].ticks.at(-1)!.slot;
      const first = L.segments[i].ticks[0].slot;
      expect(first - prevLast).toBe(2);
    }
  });
  it("scales to 100 ticks when the total is larger", () => {
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    expect(L.oneTickPerRecord).toBe(false);
    expect(L.ticksTotal).toBe(MAX_TICKS);
    expect(L.slots).toBe(MAX_TICKS + tickDonutCensusFixture.segments.length);
    expect(ticksPerSegment([212, 118, 61, 44, 37, 14], 486).reduce((a, b) => a + b, 0)).toBe(100);
    expect(ticksPerSegment([1, 999], 1000)).toEqual([1, 99]);
    expect(ticksPerSegment([3, 4], 7)).toEqual([3, 4]);
    expect(ticksPerSegment([0, 0], 0)).toEqual([0, 0]);
  });
  it("places each tick from r 92 to r 120 around the centre", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    for (const seg of L.segments) {
      for (const t of seg.ticks) {
        expect(Math.hypot(t.x1 - L.cx, t.y1 - L.cy)).toBeCloseTo(R_INNER, 1);
        expect(Math.hypot(t.x2 - L.cx, t.y2 - L.cy)).toBeCloseTo(R_OUTER, 1);
      }
    }
    expect(L.segments[0].ticks[0].angle).toBeGreaterThan(0);
    expect(L.segments[0].ticks[0].angle).toBeLessThan(5);
  });
  it("maps tones to the ladder and gives the accent to one segment only", () => {
    const L = layoutTickDonut(tickDonutFixture, HW, HH);
    expect(L.segments.map((s) => s.color)).toEqual([LADDER[0], LADDER[2], LADDER[5], LADDER[6]]);
    expect(L.segments.filter((s) => s.accent).length).toBe(0);
    const C = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    expect(C.segments.filter((s) => s.color === PALETTE.accent).map((s) => s.id)).toEqual(["admitted"]);
    const two = layoutTickDonut({ ...tickDonutCensusFixture, segments: tickDonutCensusFixture.segments.map((s, i) => (i === 1 ? { ...s, tone: "accent" as const } : s)) }, HW, HH);
    expect(two.segments.filter((s) => s.color === PALETTE.accent).length).toBe(1);
    const hero = layoutTickDonut(tickDonutFixture, HW, HH, { hero: "pending" });
    expect(hero.segments.filter((s) => s.color === PALETTE.accent).map((s) => s.id)).toEqual(["pending"]);
  });
  it("keeps labels apart on each side and writes the total and unit at the centre", () => {
    const L = layoutTickDonut(tickDonutCensusFixture, HW, HH);
    for (const side of ["left", "right"] as const) {
      const ys = L.segments.filter((s) => s.side === side).map((s) => s.label.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(LABEL_GAP - 0.01);
    }
    expect(L.total.text).toBe("486");
    expect(L.unit.text).toBe("STATEMENTS");
    expect(L.footnote.text).toContain("1 tick = 1% of 486");
    expect(layoutTickDonut(tickDonutFixture, HW, HH).footnote.text).toContain("1 tick = 1 of 84");
  });
});

describe("TickDonut markup", () => {
  const half = renderMarkup(createElement(TickDonut, { data: tickDonutFixture, size: "half" }));
  const census = renderMarkup(createElement(TickDonut, { data: tickDonutCensusFixture, size: "half" }));
  const wide = renderMarkup(createElement(TickDonut, { data: tickDonutCensusFixture, size: "wide" }));
  it("renders one svg per frame", () => {
    expect(half.startsWith("<svg")).toBe(true);
    expect(half).toContain(`viewBox="0 0 ${HW} ${HH}"`);
    expect(wide).toContain(`viewBox="0 0 ${WW} ${WH}"`);
  });
  it("uses the accent at most once", () => {
    expect(countAccent(half)).toBe(0);
    expect(countAccent(census)).toBe(1);
    expect(countAccent(wide)).toBe(1);
  });
  it("keeps every font size at or above the floor", () => {
    expect(minFontSize(half)!).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)!).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("draws one 1.6px tick per record, dotted leaders, and a 22px halo total", () => {
    // 84 ticks plus one dotted leader per segment; every tick group carries the 1.6px stroke.
    expect(half.match(/<line /g)?.length).toBe(84 + tickDonutFixture.segments.length);
    expect(half.match(/class="fade" style="animation-delay/g)?.length).toBe(84 + tickDonutFixture.segments.length);
    expect(half.match(/stroke-width="1\.6"/g)?.length).toBe(tickDonutFixture.segments.length);
    expect(half.match(/stroke-dasharray="1 3"/g)?.length).toBe(tickDonutFixture.segments.length);
    expect(half).toContain('font-size="22"');
    expect(half).toContain(">84</text>");
    expect(half).toContain(">FORECASTS</text>");
    expect(census.match(/<line /g)?.length).toBe(MAX_TICKS + tickDonutCensusFixture.segments.length);
  });
});
