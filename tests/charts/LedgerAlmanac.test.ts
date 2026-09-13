import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { LedgerAlmanac, almanacRowsRendered } from "@/components/charts/LedgerAlmanac";
import { ledgerAlmanacDenseFixture, ledgerAlmanacFixture } from "@/components/charts/fixtures/LedgerAlmanac.fixture";
import { ROW_CAP, ROW_PITCH, almanacHeight, dotRadius, layoutLedgerAlmanac } from "@/components/charts/layout/LedgerAlmanac.layout";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FONT, FRAME, PALETTE } from "@/lib/tokens";

const W = FRAME.wide.w;

describe("layoutLedgerAlmanac", () => {
  it("is deterministic on the fixture", () => {
    const a = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    const b = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(layoutLedgerAlmanac(ledgerAlmanacDenseFixture, W)).toEqual(layoutLedgerAlmanac(ledgerAlmanacDenseFixture, W));
  });
  it("grows 7px per row from a 40px frame and draws one dot per row", () => {
    const L = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    expect(L.rowsRendered).toBe(ledgerAlmanacFixture.rows.length);
    expect(L.H).toBe(40 + L.rowsRendered * 7);
    expect(almanacHeight(20)).toBe(180);
    expect(L.rows.length).toBe(L.rowsRendered);
    for (let i = 1; i < L.rows.length; i++) expect(L.rows[i].y - L.rows[i - 1].y).toBeCloseTo(ROW_PITCH, 5);
  });
  it("caps rows at 120 and reports rowsRendered and rowsTotal", () => {
    const L = layoutLedgerAlmanac(ledgerAlmanacDenseFixture, W);
    expect(ledgerAlmanacDenseFixture.rows.length).toBeGreaterThan(ROW_CAP);
    expect(L.rowsRendered).toBe(ROW_CAP);
    expect(L.rowsTotal).toBe(ledgerAlmanacDenseFixture.rows.length);
    expect(L.rows.length).toBe(ROW_CAP);
    expect(L.H).toBe(40 + ROW_CAP * 7);
    expect(L.footnote.text).toContain(`rows 1 to 120 of ${ledgerAlmanacDenseFixture.rows.length}`);
    const page2 = layoutLedgerAlmanac(ledgerAlmanacDenseFixture, W, { offset: ROW_CAP });
    expect(page2.rowsRendered).toBe(ledgerAlmanacDenseFixture.rows.length - ROW_CAP);
    expect(almanacRowsRendered(ledgerAlmanacDenseFixture)).toBe(ROW_CAP);
    expect(almanacRowsRendered(ledgerAlmanacDenseFixture, ROW_CAP)).toBe(page2.rowsRendered);
  });
  it("sorts rows by date and keeps the time axis inside the frame", () => {
    const L = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    const dates = L.rows.map((r) => ledgerAlmanacFixture.rows.find((f) => f.id === r.id)!.date);
    expect([...dates].sort()).toEqual(dates);
    for (const r of L.rows) {
      expect(r.dot.cx).toBeGreaterThanOrEqual(L.x0);
      expect(r.dot.cx).toBeLessThanOrEqual(L.x1);
      for (const s of r.segments) expect(s.x2).toBeGreaterThanOrEqual(s.x1);
    }
    expect(L.monthRules.length).toBe(72);
    expect(L.yearLabels.map((y) => y.text)).toEqual(["2021", "2022", "2023", "2024", "2025", "2026"]);
  });
  it("encodes state in the dot and p in its area", () => {
    const L = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    const by = (id: string) => L.rows.find((r) => r.id === id)!;
    expect(by("owen-0088").dot.variant).toBe("solid");
    expect(by("owen-0007").dot.variant).toBe("hollow");
    expect(by("owen-0102").dot.variant).toBe("tiny");
    expect(by("owen-0117").dot.variant).toBe("pending");
    expect(dotRadius(0)).toBe(2);
    expect(dotRadius(1)).toBe(6);
    expect(dotRadius(0.25)).toBe(4);
    expect(by("doblin-0002").dot.r).toBeGreaterThan(by("owen-0121").dot.r);
    // A pending row runs solid to today and dashed on to its deadline.
    const pending = by("owen-0117");
    expect(pending.segments.map((s) => s.dashed)).toEqual([false, true]);
    expect(pending.dot.cx).toBe(pending.segments[1].x2);
    expect(L.today).not.toBeNull();
    expect(pending.segments[0].x2).toBe(L.today!.x);
  });
  it("marks the hero row, tags affiliated rows, and labels only the hero", () => {
    const L = layoutLedgerAlmanac(ledgerAlmanacFixture, W);
    const heroes = L.rows.filter((r) => r.hero);
    expect(heroes.map((r) => r.id)).toEqual(["owen-0088"]);
    expect(heroes[0].color).toBe(PALETTE.accent);
    expect(L.rows.filter((r) => r.label).length).toBe(1);
    expect(L.rows.filter((r) => r.tag).length).toBe(ledgerAlmanacFixture.rows.filter((r) => r.affiliated).length);
    expect(L.rows.find((r) => r.id === "doblin-0002")!.tag?.text).toBe("AFF");
    expect(L.rows[0].date.text).toBe("15 MAR 2021");
    const override = layoutLedgerAlmanac(ledgerAlmanacFixture, W, { hero: "doblin-0019" });
    expect(override.rows.filter((r) => r.hero).map((r) => r.id)).toEqual(["doblin-0019"]);
  });
});

describe("LedgerAlmanac markup", () => {
  const wide = renderMarkup(createElement(LedgerAlmanac, { data: ledgerAlmanacFixture, size: "wide" }));
  const half = renderMarkup(createElement(LedgerAlmanac, { data: ledgerAlmanacFixture, size: "half" }));
  const dense = renderMarkup(createElement(LedgerAlmanac, { data: ledgerAlmanacDenseFixture, size: "wide" }));
  it("renders an svg whose height grows with the rows", () => {
    expect(wide.startsWith("<svg")).toBe(true);
    expect(wide).toContain(`viewBox="0 0 ${W} ${40 + ledgerAlmanacFixture.rows.length * 7}"`);
    expect(wide).toContain(`data-rows-rendered="${ledgerAlmanacFixture.rows.length}"`);
    expect(dense).toContain(`data-rows-rendered="${ROW_CAP}"`);
    expect(half).toContain(`viewBox="0 0 ${FRAME.half.w} `);
  });
  it("uses the accent at most once", () => {
    expect(countAccent(wide)).toBe(1);
    expect(countAccent(half)).toBe(1);
    expect(countAccent(dense)).toBe(1);
  });
  it("keeps every font size at or above the floor", () => {
    expect(minFontSize(wide)!).toBeGreaterThanOrEqual(FONT.floorWide);
    expect(minFontSize(half)!).toBeGreaterThanOrEqual(FONT.floorHalf);
  });
  it("draws one mark per row, a 1.5px today rule, and an AFF tag per affiliated row", () => {
    const rows = ledgerAlmanacFixture.rows.length;
    expect(wide.match(/class="mark mark--[a-z]+ pop"/g)?.length).toBe(rows);
    expect(wide.match(/<title>/g)?.length).toBe(rows);
    expect(wide.match(/>AFF<\/text>/g)?.length).toBe(ledgerAlmanacFixture.rows.filter((r) => r.affiliated).length);
    expect(wide).toContain('stroke-width="1.5"');
    expect(wide).toContain(">TODAY</text>");
    expect(wide).toContain('stroke-dasharray="2 2"');
    expect(wide).toContain('stroke-dasharray="1.5 1.5"');
    expect(wide).toContain("animation-delay:12ms");
    expect(wide).toContain('font-weight="800"');
    expect(dense.match(/class="mark mark--[a-z]+ pop"/g)?.length).toBe(ROW_CAP);
  });
});
