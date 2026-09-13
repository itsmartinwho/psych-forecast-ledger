import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE } from "@/lib/tokens";
import { ITEM_RADIUS, PLUMB_WIDTH, POINT_RADIUS, layoutBoldnessPlumb } from "@/components/charts/layout/BoldnessPlumb.layout";
import { BoldnessPlumb } from "@/components/charts/BoldnessPlumb";
import { BOLDNESS_FIXTURE } from "@/components/charts/fixtures/BoldnessPlumb.fixture";

const data = BOLDNESS_FIXTURE;
const half = () => layoutBoldnessPlumb(data, FRAME.half.w, FRAME.half.h);
const count = (m: string, needle: string) => m.split(needle).length - 1;
const itemTotal = data.points.reduce((s, p) => s + (p.items?.length ?? 0), 0);
const r2 = (v: number) => Math.round(v * 100) / 100;

describe("layoutBoldnessPlumb", () => {
  it("is deterministic", () => {
    expect(half()).toEqual(half());
    expect(layoutBoldnessPlumb(data, FRAME.wide.w, FRAME.wide.h)).toEqual(layoutBoldnessPlumb(data, FRAME.wide.w, FRAME.wide.h));
  });
  it("places one dot per forecaster at r 4.6 and one faint dot per item", () => {
    const L = half();
    expect(L.points.length).toBe(data.points.length);
    expect(L.points.every((p) => p.r === POINT_RADIUS)).toBe(true);
    expect(L.items.length).toBe(itemTotal);
    expect(L.items.every((it) => it.r === ITEM_RADIUS)).toBe(true);
  });
  it("maps x over 0 to 0.5 and y over 0 to 0.8 with y up", () => {
    const L = half();
    const base = L.points.find((p) => p.id === "base-rate")!;
    expect(base.x).toBe(L.plot.x0);
    const owen = L.points.find((p) => p.id === "owen")!;
    const doblin = L.points.find((p) => p.id === "doblin")!;
    expect(owen.y).toBeGreaterThan(doblin.y);
    expect(L.baseline.ticks.map((t) => t.label)).toEqual(["0", ".1", ".2", ".3", ".4", ".5"]);
    expect(L.yGuides.map((g) => g.label)).toEqual([".2", ".4", ".6", ".8"]);
  });
  it("hangs a plumb from every dot that clears the rule and labels the rule", () => {
    const L = half();
    expect(L.yRule.value).toBe(0.25);
    expect(L.yRule.label).toBe("COIN FLIP 0.25");
    const owen = L.points.find((p) => p.id === "owen")!;
    expect(owen.plumb).not.toBeNull();
    expect(owen.plumb!.y2).toBe(L.yRule.y);
    // Owen's Brier is under the rule, so his plumb rises from the top edge of the dot; Doblin's hangs down.
    expect(owen.plumb!.y1).toBe(r2(owen.y - POINT_RADIUS));
    const doblin = L.points.find((p) => p.id === "doblin")!;
    expect(doblin.plumb!.y1).toBe(r2(doblin.y + POINT_RADIUS));
    const base = L.points.find((p) => p.id === "base-rate")!;
    expect(base.plumb).toBeNull();
    expect(layoutBoldnessPlumb({ ...data, yRule: 0.3 }, FRAME.half.w, FRAME.half.h).yRule.label).toBe("RULE 0.30");
  });
  it("labels the hero, then the best and the worst of the rest, and draws the hero last", () => {
    const L = half();
    expect(L.labels.map((l) => l.id)).toEqual(["owen", "market", "doblin"]);
    expect(L.labels[0].hero).toBe(true);
    expect(L.labels[0].text).toBe("OWEN 0.19");
    expect(L.points.at(-1)?.id).toBe("owen");
    expect(L.points.at(-1)?.tone).toBe("currentColor");
    expect(L.labels.every((l) => l.text === l.text.toUpperCase())).toBe(true);
  });
  it("carries the floor words and the axis titles in uppercase", () => {
    const L = half();
    expect(L.floorLabels.hedged.text).toBe("HEDGED");
    expect(L.floorLabels.bold.text).toBe("BOLD");
    expect(L.floorLabels.bold.x).toBe(L.plot.x1);
    expect(L.yLabel.text).toBe("BRIER · LOWER IS BETTER");
    expect(L.yLabel.y).toBeLessThan(L.plot.y0);
  });
  it("honours a hero override", () => {
    const L = layoutBoldnessPlumb(data, FRAME.half.w, FRAME.half.h, { hero: "doblin" });
    expect(L.points.filter((p) => p.hero).map((p) => p.id)).toEqual(["doblin"]);
  });
});

describe("<BoldnessPlumb />", () => {
  const halfMarkup = renderMarkup(createElement(BoldnessPlumb, { data, size: "half" }));
  const wideMarkup = renderMarkup(createElement(BoldnessPlumb, { data, size: "wide" }));
  it("renders one svg per frame", () => {
    expect(halfMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.half.w} ${FRAME.half.h}"`)).toBe(true);
    expect(wideMarkup.startsWith(`<svg viewBox="0 0 ${FRAME.wide.w} ${FRAME.wide.h}"`)).toBe(true);
  });
  it("uses the accent exactly once, on the hero group", () => {
    expect(countAccent(halfMarkup)).toBe(1);
    expect(countAccent(wideMarkup)).toBe(1);
    expect(halfMarkup).toContain(`class="point point--hero" color="${PALETTE.accent}"`);
    const noHero = renderMarkup(createElement(BoldnessPlumb, { data: { ...data, points: data.points.map((p) => ({ ...p, hero: false })) }, size: "half" }));
    expect(countAccent(noHero)).toBe(0);
  });
  it("keeps every text at or above the frame floor", () => {
    expect(minFontSize(halfMarkup)).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wideMarkup)).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("draws one mark per forecaster, one faint dot per item, and 0.55px plumbs", () => {
    const L = half();
    expect(count(halfMarkup, 'class="mark mark--solid')).toBe(data.points.length);
    expect(count(halfMarkup, 'class="item fade"')).toBe(itemTotal);
    expect(count(halfMarkup, `stroke-width="${PLUMB_WIDTH}"`)).toBe(L.points.filter((p) => p.plumb).length);
    expect(halfMarkup).toContain('stroke-dasharray="2 4"');
    expect(halfMarkup).toContain(">HEDGED</text>");
    expect(halfMarkup).toContain(">BOLD</text>");
    expect(count(halfMarkup, 'font-weight="800"')).toBe(L.labels.length);
    expect(halfMarkup).not.toMatch(/gradient|filter|shadow/i);
  });
});
