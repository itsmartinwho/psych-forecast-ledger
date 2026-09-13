import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE, STROKE } from "@/lib/tokens";
import { LANE_CAP, RAIL_LABEL_MAX, ROW_MIN, layoutTrendLanes } from "@/components/charts/layout/TrendLanes.layout";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { TREND_LANES_FIXTURE } from "@/components/charts/fixtures/TrendLanes.fixture";
import type { Lane, TrendLanesData } from "@/components/charts/types";

const data = TREND_LANES_FIXTURE;
const wide = () => layoutTrendLanes(data, FRAME.wide.w, FRAME.wide.h);
const count = (m: string, needle: string) => m.split(needle).length - 1;

function manyLanes(n: number): TrendLanesData {
  const lanes: Lane[] = Array.from({ length: n }, (_, i) => ({
    id: `owen-${String(i + 1).padStart(4, "0")}`,
    label: `Lane ${i + 1}`,
    start: "2022-01-15",
    deadline: "2025-12-31",
    state: i % 3 === 0 ? "true" : "pending",
    resolved: i % 3 === 0 ? "2024-03-01" : undefined,
  }));
  return { ...data, lanes };
}

describe("layoutTrendLanes", () => {
  it("is deterministic", () => {
    expect(wide()).toEqual(wide());
    expect(layoutTrendLanes(data, FRAME.half.w, FRAME.half.h)).toEqual(layoutTrendLanes(data, FRAME.half.w, FRAME.half.h));
  });
  it("draws one statement mark per lane, one restatement mark per restatement, one closing mark per resolved lane", () => {
    const L = wide();
    expect(L.lanes.length).toBe(data.lanes.length);
    const marks = L.lanes.flatMap((l) => l.marks);
    expect(marks.filter((m) => m.kind === "statement").length).toBe(data.lanes.length);
    expect(marks.filter((m) => m.kind === "restatement").length).toBe(data.lanes.reduce((s, l) => s + (l.restatements?.length ?? 0), 0));
    expect(marks.filter((m) => m.kind === "resolution").length).toBe(data.lanes.filter((l) => l.state !== "pending").length);
    // Closing marks carry the site code.
    const byId = new Map(L.lanes.map((l) => [l.id, l]));
    expect(byId.get("owen-0007")?.marks.at(-1)?.variant).toBe("solid");
    expect(byId.get("doblin-0002")?.marks.at(-1)?.variant).toBe("hollow");
    expect(byId.get("owen-0040")?.marks.at(-1)?.variant).toBe("tiny");
  });
  it("runs a pending lane solid to today and dashed to the deadline", () => {
    const L = wide();
    const lane = L.lanes.find((l) => l.id === "owen-0052")!;
    expect(lane.hero).toBe(true);
    expect(lane.tone).toBe("currentColor");
    expect(lane.segments.map((s) => s.kind)).toEqual(["solid", "pending"]);
    expect(lane.segments[0].x2).toBe(L.today?.x);
    expect(lane.segments[1].x2).toBeGreaterThan(lane.segments[0].x2);
    // Restatement dots grow with p and only the hero lane carries value labels.
    const rs = lane.marks.filter((m) => m.kind === "restatement");
    expect(rs[0].r).toBeLessThan(rs[2].r);
    expect(lane.values.map((v) => v.text)).toEqual(["50%", "70%", "90%"]);
    expect(L.lanes.filter((l) => !l.hero).every((l) => l.values.length === 0)).toBe(true);
  });
  it("gives a resolved lane a faint tail to its deadline", () => {
    const lane = wide().lanes.find((l) => l.id === "owen-0021")!;
    expect(lane.segments.map((s) => s.kind)).toEqual(["solid", "tail"]);
  });
  it("ticks every event on the rail and labels at most six without overlap", () => {
    const L = wide();
    expect(L.rail.ticks.length).toBe(data.events.length);
    const labelled = L.rail.ticks.filter((t) => t.label);
    expect(labelled.length).toBeGreaterThan(0);
    expect(labelled.length).toBeLessThanOrEqual(RAIL_LABEL_MAX);
    const xs = labelled.map((t) => t.labelX).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(20);
    expect(labelled.every((t) => t.label === t.label?.toUpperCase())).toBe(true);
  });
  it("places today inside the range and year ticks on the baseline", () => {
    const L = wide();
    expect(L.today).not.toBeNull();
    expect(L.today!.x).toBeGreaterThan(L.plot.x0);
    expect(L.today!.x).toBeLessThan(L.plot.x1);
    expect(L.baseline.ticks.map((t) => t.label)).toEqual(["2021", "2022", "2023", "2024", "2025", "2026", "2027"]);
    expect(L.months.length).toBe(78);
    expect(layoutTrendLanes({ ...data, today: "2030-01-01" }, FRAME.wide.w, FRAME.wide.h).today).toBeNull();
  });
  it("keeps the frame height for few lanes and grows it past the cap point", () => {
    expect(wide().H).toBe(FRAME.wide.h);
    const forty = layoutTrendLanes(manyLanes(LANE_CAP), FRAME.wide.w, FRAME.wide.h);
    expect(forty.lanes.length).toBe(LANE_CAP);
    expect(forty.H).toBeGreaterThan(FRAME.wide.h);
    expect(forty.H).toBe(44 + LANE_CAP * ROW_MIN + 38);
    expect(forty.clipped).toBe(0);
    const over = layoutTrendLanes(manyLanes(LANE_CAP + 3), FRAME.wide.w, FRAME.wide.h);
    expect(over.lanes.length).toBe(LANE_CAP);
    expect(over.clipped).toBe(3);
  });
  it("honours a hero override and takes only the first match", () => {
    const L = layoutTrendLanes(data, FRAME.wide.w, FRAME.wide.h, { hero: "doblin-0009" });
    expect(L.lanes.filter((l) => l.hero).map((l) => l.id)).toEqual(["doblin-0009"]);
  });
});

describe("<TrendLanes />", () => {
  const wideMarkup = renderMarkup(createElement(TrendLanes, { data, size: "wide" }));
  const halfMarkup = renderMarkup(createElement(TrendLanes, { data, size: "half" }));
  it("renders one svg with the frame viewBox", () => {
    expect(wideMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.wide.w} ${FRAME.wide.h}"`)).toBe(true);
    expect(halfMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.half.w} ${FRAME.half.h}"`)).toBe(true);
  });
  it("uses the accent exactly once, on the hero lane group", () => {
    expect(countAccent(wideMarkup)).toBe(1);
    expect(countAccent(halfMarkup)).toBe(1);
    expect(wideMarkup).toContain(`class="lane lane--hero" color="${PALETTE.accent}"`);
    const noHero = renderMarkup(createElement(TrendLanes, { data: { ...data, lanes: data.lanes.map((l) => ({ ...l, hero: false })) }, size: "wide" }));
    expect(countAccent(noHero)).toBe(0);
  });
  it("keeps every text at or above the frame floor", () => {
    expect(minFontSize(wideMarkup)).toBeGreaterThanOrEqual(FONT.floorWide);
    expect(minFontSize(halfMarkup)).toBeGreaterThanOrEqual(FONT.floorHalf);
  });
  it("draws one mark per record, a 1.5px today rule, 1px event ticks and the month hairlines", () => {
    const L = wide();
    expect(count(wideMarkup, 'class="mark ')).toBe(L.lanes.reduce((s, l) => s + l.marks.length, 0));
    expect(count(wideMarkup, `stroke-width="${STROKE.zero}"`)).toBe(1);
    expect(wideMarkup).toContain(">TODAY</text>");
    expect(count(wideMarkup, 'class="rail-event fade"')).toBe(data.events.length);
    expect(count(wideMarkup, 'class="hairline-svg"')).toBeGreaterThanOrEqual(L.months.length);
    expect(wideMarkup).toContain('stroke-dasharray="3 3"');
    expect(wideMarkup).toContain('href="/items/owen-0052"');
    expect(wideMarkup).not.toMatch(/gradient|filter|shadow/i);
  });
});
