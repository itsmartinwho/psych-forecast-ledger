import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { areaRungBarsFixture, forecasterRungBarsFixture } from "@/components/charts/fixtures/AreaRungBars.fixture";
import { FAINT_OPACITY, RUNG_OPACITY_MIN, layoutAreaRungBars } from "@/components/charts/layout/AreaRungBars.layout";
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
  it("uppercases labels and writes the footnote from the unit", () => {
    const L = layoutAreaRungBars(areaRungBarsFixture, HW, HH);
    expect(L.rows[0].label.text).toBe("REGULATORY DECISIONS");
    expect(L.footnote.text).toContain(areaRungBarsFixture.unit);
    expect(L.footnote.text).toContain("Brier");
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
  });
});
