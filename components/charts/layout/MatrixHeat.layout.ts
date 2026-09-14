// Matrix heat (Lupi Editorial L16): rows = forecasters, columns = areas, one cell per pair.
// Shade = Brier in five ladder steps, darkest = best; an empty cell is a 0.9px dot with its event count under it;
// the best cell gets the dashed accent square. Columns take the width the frame gives them and column labels
// (the area's short name, wrapped to two lines at most) are sized to the column pitch, so labels never overlap.
import type { MatrixData } from "@/components/charts/types";
import { LADDER } from "@/lib/tokens";

export const COL_LABEL_SIZE = 7;
/** Estimated advance per character of a column label: 7px caps with 0.1em tracking. */
export const COL_CHAR_W = 4.9;
/** Line pitch of a two-line column label. */
export const COL_LINE_H = 9;
/** Estimated advance per character of a legend label: the 7px footnote with 0.12em tracking. */
export const LEGEND_CHAR_W = 5.1;
export const LEGEND_SWATCH = 9;
/** Distance from the swatch's left edge to the label's first character. */
export const LEGEND_TEXT_GAP = 13;
export const CELL_MIN = 18;
export const CELL_MAX = 30;
/** Room under a cell for the "n 3" count of an unscored pair. */
export const ROW_GAP = 18;
export const COL_PITCH_MIN = 30;
export const COL_PITCH_MAX = 72;
export const LEGEND_LABELS = ["< 0.10", "0.1–0.2", "0.2–0.3", "0.3–0.4", "≥ 0.40"] as const;

export interface HeatCell { row: string; col: string; x: number; y: number; size: number; value: number | null; n: number; fill: string; best: boolean; title: string; delay: number }
export interface MatrixHeatLayout {
  cells: HeatCell[];
  rowLabels: { id: string; label: string; x: number; y: number; href?: string }[];
  /** x is the column centre; y is the baseline of the first line; lines has one or two entries. */
  colLabels: { id: string; label: string; lines: string[]; x: number; y: number; href?: string }[];
  legend: { x: number; y: number; fill: string; label: string }[];
  cell: number;
  pitchX: number;
  pitchY: number;
  x0: number;
  y0: number;
}

/** Five ladder steps over [0, 0.5]: 0-0.1 darkest ... 0.4+ lightest. */
export function shadeFor(value: number | null): string {
  if (value === null) return "none";
  const idx = Math.min(4, Math.max(0, Math.floor(value / 0.1)));
  return LADDER[idx];
}

/** Greedy wrap on spaces into at most two lines of at most maxChars; an overlong line is cut with an ellipsis. */
export function wrapLabel(label: string, maxChars: number): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const two = lines.length > 2 ? [lines[0], lines.slice(1).join(" ")] : lines;
  return two.map((l) => (l.length > maxChars ? `${l.slice(0, Math.max(1, maxChars - 1))}…` : l));
}

/** Estimated width of a column label: its longest line. */
export function colLabelWidth(lines: string[]): number {
  return Math.max(0, ...lines.map((l) => l.length * COL_CHAR_W));
}

/** Estimated width of a legend entry: swatch, gap and label. */
export function legendWidth(label: string): number {
  return LEGEND_TEXT_GAP + label.length * LEGEND_CHAR_W;
}

export function layoutMatrixHeat(data: MatrixData, W: number, H: number): MatrixHeatLayout {
  const nCols = Math.max(1, data.cols.length);
  const labelW = Math.min(110, Math.round(W * 0.22));
  const x0 = labelW + 12;
  const right = 16;
  const avail = Math.max(COL_PITCH_MIN * nCols, W - x0 - right);
  const pitchX = Math.max(COL_PITCH_MIN, Math.min(COL_PITCH_MAX, Math.floor(avail / nCols)));
  const cell = Math.max(CELL_MIN, Math.min(CELL_MAX, pitchX - 14));
  const pitchY = cell + ROW_GAP;
  const y0 = 40;
  const gridH = data.rows.length * pitchY - ROW_GAP;
  void H;
  const cx = (j: number): number => x0 + cell / 2 + j * pitchX;
  const cells: HeatCell[] = [];
  data.rows.forEach((r, i) => {
    data.cols.forEach((c, j) => {
      const found = data.cells.find((x) => x.row === r.id && x.col === c.id);
      const value = found ? found.value : null;
      cells.push({
        row: r.id, col: c.id, x: cx(j) - cell / 2, y: y0 + i * pitchY, size: cell, value, n: found?.n ?? 0, fill: shadeFor(value), best: Boolean(found?.best),
        title: `${r.label} · ${c.label} · ${value === null ? `no score (${found?.n ?? 0} events)` : `${data.valueLabel} ${value.toFixed(2)} on ${found?.n} events`}`, delay: (i * data.cols.length + j) * 40,
      });
    });
  });
  const rowLabels = data.rows.map((r, i) => ({ id: r.id, label: r.label.toUpperCase(), x: x0 - 10, y: y0 + i * pitchY + cell / 2 + 3, href: r.href }));
  // The column label is the area's short name when the deriver gives one; the full name stays in the cell titles.
  const maxChars = Math.max(4, Math.floor((pitchX - 4) / COL_CHAR_W));
  const colLabels = data.cols.map((c, j) => {
    const lines = wrapLabel((c.short ?? c.label).toUpperCase().replace(" AND ", " & "), maxChars);
    return { id: c.id, label: lines.join(" "), lines, x: cx(j), y: y0 - 10 - (lines.length - 1) * COL_LINE_H, href: c.href };
  });
  const legendY = y0 + gridH + 26;
  const legendPitch = Math.max(Math.ceil(Math.max(...LEGEND_LABELS.map(legendWidth))) + 6, Math.floor((W - x0 - right) / LEGEND_LABELS.length));
  const legend = [0.05, 0.15, 0.25, 0.35, 0.45].map((v, k) => ({ x: x0 + k * legendPitch, y: legendY, fill: shadeFor(v), label: LEGEND_LABELS[k] }));
  return { cells, rowLabels, colLabels, legend, cell, pitchX, pitchY, x0, y0 };
}
