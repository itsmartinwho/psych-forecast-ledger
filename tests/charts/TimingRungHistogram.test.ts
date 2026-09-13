import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE, STROKE } from "@/lib/tokens";
import { PITCH_MAX, PITCH_MIN, RUNG_STROKE, RUNG_WIDTH, layoutTimingRungHistogram } from "@/components/charts/layout/TimingRungHistogram.layout";
import { TimingRungHistogram } from "@/components/charts/TimingRungHistogram";
import { TIMING_HISTOGRAM_FIXTURE } from "@/components/charts/fixtures/TimingRungHistogram.fixture";

const data = TIMING_HISTOGRAM_FIXTURE;
const half = () => layoutTimingRungHistogram(data, FRAME.half.w, FRAME.half.h);
const count = (m: string, needle: string) => m.split(needle).length - 1;
const total = data.bins.reduce((s, b) => s + b.count, 0);

describe("layoutTimingRungHistogram", () => {
  it("is deterministic, jitter included", () => {
    expect(half()).toEqual(half());
    expect(layoutTimingRungHistogram(data, FRAME.wide.w, FRAME.wide.h)).toEqual(layoutTimingRungHistogram(data, FRAME.wide.w, FRAME.wide.h));
  });
  it("lays one 6px rung per record, jittered inside the column, stacked upward from the baseline", () => {
    const L = half();
    expect(L.bins.reduce((s, b) => s + b.rungs.length, 0)).toBe(total);
    for (const b of L.bins) {
      expect(b.rungs.length).toBe(data.bins[b.index].count);
      for (const r of b.rungs) {
        expect(r2(r.x2 - r.x1)).toBe(RUNG_WIDTH);
        expect(r.x1).toBeGreaterThanOrEqual(b.x0);
        expect(r.x2).toBeLessThanOrEqual(b.x1);
        expect(r.y).toBeLessThan(L.baseline.y);
        expect(r.y).toBeGreaterThan(L.plot.y0);
      }
      const ys = b.rungs.map((r) => r.y);
      expect([...ys].sort((a, c) => c - a)).toEqual(ys);
      const xs = new Set(b.rungs.map((r) => r.x1));
      if (b.count > 3) expect(xs.size).toBeGreaterThan(1);
    }
    expect(L.pitch).toBeLessThanOrEqual(PITCH_MAX);
    expect(L.pitch).toBeGreaterThanOrEqual(PITCH_MIN);
  });
  it("labels bins in uppercase with the unit on the open bin", () => {
    expect(half().bins.map((b) => b.label)).toEqual(["-12 TO -6", "-6 TO 0", "0 TO 6", "6 TO 12", ">12 MONTHS"]);
    const custom = layoutTimingRungHistogram({ ...data, bins: data.bins.map((b, i) => (i === 0 ? { ...b, label: "early" } : b)) }, FRAME.half.w, FRAME.half.h);
    expect(custom.bins[0].label).toBe("EARLY");
  });
  it("puts the zero rule on the bin boundary and labels it with zeroLabel", () => {
    const L = half();
    expect(L.zero).not.toBeNull();
    expect(L.zero!.x).toBe(L.bins[2].x0);
    expect(L.zero!.label).toBe("DEADLINE");
    expect(L.zero!.anchor).toBe("end");
    expect(L.zero!.labelY).toBeLessThan(L.plot.y0);
  });
  it("flags the median inside its bin with an uppercase note", () => {
    const L = half();
    expect(L.median).not.toBeNull();
    expect(L.median!.label).toBe("MEDIAN +14 MO");
    expect(L.median!.anchor).toBe("start");
    const open = L.bins[4];
    expect(L.median!.x).toBeGreaterThan(open.x0);
    expect(L.median!.x).toBeLessThan(open.x1);
    expect(layoutTimingRungHistogram({ ...data, median: -3 }, FRAME.half.w, FRAME.half.h).median!.label).toBe("MEDIAN -3 MO");
    expect(layoutTimingRungHistogram({ ...data, median: undefined }, FRAME.half.w, FRAME.half.h).median).toBeNull();
  });
  it("marks only the tallest bin's count as accent and labels every bin up to six", () => {
    const L = half();
    expect(L.bins.filter((b) => b.tallest).map((b) => b.index)).toEqual([4]);
    expect(L.bins.filter((b) => b.countLabel?.accent).length).toBe(1);
    expect(L.bins.filter((b) => b.countLabel).length).toBe(5);
    expect(L.bins[4].countLabel?.text).toBe("30");
    const override = layoutTimingRungHistogram(data, FRAME.half.w, FRAME.half.h, { hero: "0 to 6" });
    expect(override.bins.filter((b) => b.countLabel?.accent).map((b) => b.index)).toEqual([2]);
  });
  it("carries the rung footnote", () => {
    expect(half().footnote.text).toBe("1 RUNG = 1 PREDICTION");
  });
});

describe("<TimingRungHistogram />", () => {
  const halfMarkup = renderMarkup(createElement(TimingRungHistogram, { data, size: "half" }));
  const wideMarkup = renderMarkup(createElement(TimingRungHistogram, { data, size: "wide" }));
  it("renders one svg per frame", () => {
    expect(halfMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.half.w} ${FRAME.half.h}"`)).toBe(true);
    expect(wideMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.wide.w} ${FRAME.wide.h}"`)).toBe(true);
  });
  it("uses the accent exactly once, on the tallest count", () => {
    expect(countAccent(halfMarkup)).toBe(1);
    expect(countAccent(wideMarkup)).toBe(1);
    expect(halfMarkup).toContain(`fill="${PALETTE.accent}" paint-order="stroke fill"`);
    const empty = renderMarkup(createElement(TimingRungHistogram, { data: { ...data, bins: data.bins.map((b) => ({ ...b, count: 0 })) }, size: "half" }));
    expect(countAccent(empty)).toBe(0);
  });
  it("keeps every text at or above the frame floor", () => {
    expect(minFontSize(halfMarkup)).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wideMarkup)).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("draws one 0.9px rung per record, a 1.5px zero rule, a dashed median and the bin labels", () => {
    expect(count(halfMarkup, 'class="rung"')).toBe(total);
    expect(count(halfMarkup, `stroke-width="${RUNG_STROKE}"`)).toBeGreaterThanOrEqual(total);
    expect(count(halfMarkup, `stroke-width="${STROKE.zero}"`)).toBe(1);
    expect(halfMarkup).toContain(">DEADLINE</text>");
    expect(halfMarkup).toContain('stroke-dasharray="2 4"');
    expect(halfMarkup).toContain(">MEDIAN +14 MO</text>");
    expect(halfMarkup).toContain(">&gt;12 MONTHS</text>");
    expect(halfMarkup).toContain(">1 RUNG = 1 PREDICTION</text>");
    expect(count(halfMarkup, 'class="rungs rise"')).toBe(data.bins.length);
    expect(halfMarkup).not.toMatch(/gradient|filter|shadow/i);
  });
});

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
