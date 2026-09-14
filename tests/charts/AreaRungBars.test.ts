import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { admissionRungBarsFixture, areaRungBarsFixture, forecasterRungBarsFixture } from "@/components/charts/fixtures/AreaRungBars.fixture";
import { FAINT_OPACITY, RUNG_MAX, RUNG_OPACITY_MIN, layoutAreaRungBars, rungUnitFor, rungsFor } from "@/components/charts/layout/AreaRungBars.layout";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE } from "@/lib/tokens";

const { w: HW, h: HH } = FRAME.half;
const { w: WW, h: WH } = FRAME.wide;

describe("layoutAreaRungBars", () => {
  it("is deterministic on the fixture", () => {
    const a = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    const b = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(layoutAreaRungBars(forecasterRungBarsFixture, WW, WH)).toEqual(layoutAreaRungBars(forecasterRungBarsFixture, WW, WH));
  });
  it("draws one rung per unit of count and a dot every fifth rung", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    for (const g of areaRungBarsFixture.groups) {
      const row = L.rows.find((r) => r.id === g.id)!;
      expect(row.rungs.length).toBe(g.count);
      expect(row.dots.length).toBe(Math.floor(g.count / 5));
    }
    const total = L.rows.reduce((n, r) => n + r.rungs.length, 0);
    expect(total).toBe(areaRungBarsFixture.groups.reduce((n, g) => n + g.count, 0));
  });
  it("jitters rung length inside 3px and opacity inside 0.75 to 1", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    for (const row of L.rows) {
      for (const r of row.rungs) {
        expect(r.y2 - r.y1).toBeGreaterThanOrEqual(7.5 - 0.01);
        expect(r.y2 - r.y1).toBeLessThanOrEqual(10.5 + 0.01);
        expect(r.opacity).toBeGreaterThanOrEqual(RUNG_OPACITY_MIN);
        expect(r.opacity).toBeLessThanOrEqual(1);
      }
    }
    const lengths = new Set(L.rows[0].rungs.map((r) => r.y2 - r.y1));
    expect(lengths.size).toBeGreaterThan(3);
  });
  it("gives the hero the accent and faint groups 0.4 opacity with no value", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    const hero = L.rows.find((r) => r.hero)!;
    expect(hero.id).toBe("regulatory");
    expect(hero.color).toBe(PALETTE.accent);
    expect(L.rows.filter((r) => r.color === PALETTE.accent).length).toBe(1);
    const faint = L.rows.find((r) => r.id === "practice_adoption")!;
    expect(faint.opacity).toBe(FAINT_OPACITY);
    expect(faint.value).toBeNull();
    expect(faint.count.text).toBe("6");
    const reg = L.rows.find((r) => r.id === "regulatory")!;
    expect(reg.value?.text).toBe("0.19");
    expect(reg.count.text).toBe("41");
  });
  it("lets the hero option override the data flag", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH, { hero: "payer_policy" });
    expect(L.rows.filter((r) => r.hero).map((r) => r.id)).toEqual(["payer_policy"]);
  });
  it("uppercases labels and leaves the footnote empty when one rung is one record", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    expect(L.rows[0].label.text).toBe("REGULATORY DECISIONS");
    expect(L.ladder.rungUnit).toBe(1);
    expect(L.footnote.text).toBe("");
  });
  it("divides counts by the rung unit, rounding up, and writes the unit in the footnote", () => {
    const L = layoutAreaRungBars(admissionRungBarsFixture, HW, HH);
    expect(L.ladder.rungUnit).toBe(50);
    for (const g of admissionRungBarsFixture.groups) {
      const row = L.rows.find((r) => r.id === g.id)!;
      expect(row.rungs.length).toBe(Math.ceil(g.count / 50));
      expect(row.count.text).toBe(g.count.toLocaleString("en-US"));
    }
    expect(L.rows.find((r) => r.id === "found")!.rungs.length).toBe(50);
    expect(L.rows.find((r) => r.id === "resolved")!.rungs.length).toBe(1);
    expect(L.ladder.maxCount).toBe(50);
    expect(L.footnote.text).toBe("1 rung = 50 statements");
    expect(layoutAreaRungBars(admissionRungBarsFixture, HW, HH)).toEqual(layoutAreaRungBars(admissionRungBarsFixture, HW, HH));
  });
  it("picks the smallest rung unit that keeps the longest ladder at or under the cap", () => {
    expect(rungUnitFor(27)).toBe(1);
    expect(rungUnitFor(60)).toBe(1);
    expect(rungUnitFor(61)).toBe(5);
    expect(rungUnitFor(852)).toBe(25);
    expect(rungUnitFor(2495)).toBe(50);
    expect(rungUnitFor(10000)).toBe(100);
    for (const max of [27, 61, 852, 2495]) expect(rungsFor(max, rungUnitFor(max))).toBeLessThanOrEqual(RUNG_MAX);
    expect(rungsFor(71, 50)).toBe(2);
    expect(rungsFor(0, 50)).toBe(0);
    expect(rungsFor(7, 0)).toBe(7);
  });
});

describe("AreaRungBars markup", () => {
  const half = renderMarkup(createElement(AreaRungBars, { data: areaRungBarsFixture, size: "half" }));
  const wide = renderMarkup(createElement(AreaRungBars, { data: forecasterRungBarsFixture, size: "wide" }));
  it("renders one svg per frame with the right viewBox", () => {
    expect(half.startsWith("<svg")).toBe(true);
    expect(half).toContain(`viewBox="0 0 ${HW} ${HH}"`);
    expect(wide).toContain(`viewBox="0 0 ${WW} ${WH}"`);
  });
  it("uses the accent at most once", () => {
    expect(countAccent(half)).toBe(1);
    expect(countAccent(wide)).toBe(1);
    const noHero = renderMarkup(createElement(AreaRungBars, { data: { ...areaRungBarsFixture, groups: areaRungBarsFixture.groups.map((g) => ({ ...g, hero: false })) }, size: "half" }));
    expect(countAccent(noHero)).toBe(0);
  });
  it("keeps every font size at or above the floor", () => {
    expect(minFontSize(half)!).toBeGreaterThanOrEqual(FONT.floorHalf);
    expect(minFontSize(wide)!).toBeGreaterThanOrEqual(FONT.floorWide);
  });
  it("draws one line per rung, counts in a halo at weight 800, and staggers rows", () => {
    const rungs = areaRungBarsFixture.groups.reduce((n, g) => n + g.count, 0);
    expect(half.match(/<line /g)?.length).toBe(rungs);
    expect(half.match(/class="halo pop"/g)?.length).toBe(areaRungBarsFixture.groups.length);
    expect(half).toContain('font-weight="800"');
    expect(half).toContain("animation-delay:100ms");
    expect(half).toContain("animation-delay:400ms");
    expect(half).toContain('opacity="0.4"');
    expect(half).toContain('href="/areas/regulatory"');
    expect(half).not.toContain('class="footnote"');
  });
  it("draws one line per rung of 50 and the unit footnote on the admission funnel", () => {
    const funnel = renderMarkup(createElement(AreaRungBars, { data: admissionRungBarsFixture, size: "half" }));
    expect(funnel.match(/<line /g)?.length).toBe(50 + 43 + 2 + 1);
    expect(funnel).toContain(">1 RUNG = 50 STATEMENTS</text>");
    expect(funnel).toContain(">2,495</text>");
    expect(countAccent(funnel)).toBe(1);
    expect(minFontSize(funnel)!).toBeGreaterThanOrEqual(FONT.floorHalf);
  });
});
