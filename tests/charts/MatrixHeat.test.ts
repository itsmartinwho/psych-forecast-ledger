import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { MatrixHeat } from "@/components/charts/MatrixHeat";
import { matrixHeatFixture, matrixHeatLongLabelsFixture } from "@/components/charts/fixtures/MatrixHeat.fixture";
import { COL_CHAR_W, COL_LINE_H, LEGEND_LABELS, LEGEND_SWATCH, ROW_GAP, colLabelWidth, layoutMatrixHeat, legendWidth, wrapLabel } from "@/components/charts/layout/MatrixHeat.layout";
import { countAccent, minFontSize, renderMarkup } from "@/lib/testing/markup";
import { FRAME } from "@/lib/tokens";

const { w: HW, h: HH } = FRAME.half;
const { w: WW, h: WH } = FRAME.wide;

describe("layoutMatrixHeat", () => {
  it("is deterministic on the fixture", () => {
    const a = layoutMatrixHeat(matrixHeatFixture, HW, HH);
    const b = layoutMatrixHeat(matrixHeatFixture, HW, HH);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("spreads the columns over the frame width instead of packing them at 26px", () => {
    const L = layoutMatrixHeat(matrixHeatFixture, HW, HH);
    expect(L.pitchX).toBeGreaterThanOrEqual(50);
    const last = L.cells.filter((c) => c.row === "owen").at(-1)!;
    expect(last.x + last.size).toBeLessThanOrEqual(HW - 16);
  });

  for (const [name, fixture, W, H] of [
    ["half, short names", matrixHeatFixture, HW, HH],
    ["half, full names", matrixHeatLongLabelsFixture, HW, HH],
    ["wide, short names", matrixHeatFixture, WW, WH],
    ["wide, full names", matrixHeatLongLabelsFixture, WW, WH],
  ] as const) {
    it(`keeps column labels apart and inside the frame (${name})`, () => {
      const L = layoutMatrixHeat(fixture, W, H);
      for (const c of L.colLabels) {
        expect(c.lines.length).toBeLessThanOrEqual(2);
        expect(colLabelWidth(c.lines)).toBeLessThanOrEqual(L.pitchX);
        expect(c.x - colLabelWidth(c.lines) / 2).toBeGreaterThanOrEqual(L.x0 - 12);
        expect(c.x + colLabelWidth(c.lines) / 2).toBeLessThanOrEqual(W);
        // The first line sits below the top edge; the last line stays above the first row of cells.
        expect(c.y - 7).toBeGreaterThanOrEqual(0);
        expect(c.y + (c.lines.length - 1) * COL_LINE_H).toBeLessThan(L.y0);
      }
      for (let j = 1; j < L.colLabels.length; j++) {
        const a = L.colLabels[j - 1], b = L.colLabels[j];
        expect(b.x - a.x).toBeGreaterThanOrEqual(colLabelWidth(a.lines) / 2 + colLabelWidth(b.lines) / 2 + 2);
      }
    });

    it(`keeps legend entries apart and inside the frame (${name})`, () => {
      const L = layoutMatrixHeat(fixture, W, H);
      expect(L.legend.map((l) => l.label)).toEqual([...LEGEND_LABELS]);
      for (let k = 1; k < L.legend.length; k++) {
        expect(L.legend[k].x - L.legend[k - 1].x).toBeGreaterThanOrEqual(legendWidth(L.legend[k - 1].label) + 4);
      }
      const last = L.legend.at(-1)!;
      expect(last.x + legendWidth(last.label)).toBeLessThanOrEqual(W);
      expect(last.y + LEGEND_SWATCH).toBeLessThanOrEqual(H);
    });
  }

  it("leaves room under an empty cell for its event count", () => {
    const L = layoutMatrixHeat(matrixHeatFixture, HW, HH);
    expect(L.pitchY - L.cell).toBe(ROW_GAP);
    expect(ROW_GAP).toBeGreaterThanOrEqual(12);
    const rows = [...new Set(L.cells.map((c) => c.y))].sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) expect(rows[i] - rows[i - 1]).toBe(L.pitchY);
  });

  it("marks exactly the best cell", () => {
    const L = layoutMatrixHeat(matrixHeatFixture, HW, HH);
    expect(L.cells.filter((c) => c.best).map((c) => `${c.row}/${c.col}`)).toEqual(["owen/regulatory"]);
  });
});

describe("wrapLabel", () => {
  it("keeps a short label on one line", () => {
    expect(wrapLabel("REGULATORY", 10)).toEqual(["REGULATORY"]);
  });
  it("wraps on spaces into at most two lines", () => {
    expect(wrapLabel("PRACTICE ADOPTION", 10)).toEqual(["PRACTICE", "ADOPTION"]);
    expect(wrapLabel("TRIAL OUTCOMES", 10)).toEqual(["TRIAL", "OUTCOMES"]);
  });
  it("cuts an overlong line with an ellipsis", () => {
    const lines = wrapLabel("COMPANY & MARKET OUTCOMES", 10);
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(10);
    expect(lines[1].endsWith("…")).toBe(true);
  });
  it("estimates the width from the longest line", () => {
    expect(colLabelWidth(["PRACTICE", "ADOPTION"])).toBeCloseTo(8 * COL_CHAR_W);
  });
});

describe("MatrixHeat", () => {
  it("renders every area's short name, one accent, and no text under 6px", () => {
    const markup = renderMarkup(createElement(MatrixHeat, { data: matrixHeatFixture, size: "half" }));
    for (const s of ["REGULATORY", "TRIALS", "COMPANY", "PAYER", "PRACTICE"]) expect(markup).toContain(s);
    expect(markup).not.toContain("BEST");
    expect(countAccent(markup)).toBe(1);
    expect(minFontSize(markup)).toBeGreaterThanOrEqual(6);
  });
  it("renders a two-line column label as two tspans", () => {
    const markup = renderMarkup(createElement(MatrixHeat, { data: matrixHeatLongLabelsFixture, size: "half" }));
    expect(markup).toContain("<tspan");
    expect(markup).toContain("ADOPTION");
  });
});
