// Matrix heat (Lupi Editorial L16): rows = forecasters, columns = areas, one 22px cell per pair.
// Shade = Brier in five ladder steps, darkest = best; an empty cell is a 0.9px dot; the best cell gets the dashed accent square.
import type { MatrixData } from "@/components/charts/types";
import { LADDER } from "@/lib/tokens";

export interface HeatCell { row: string; col: string; x: number; y: number; size: number; value: number | null; n: number; fill: string; best: boolean; title: string; delay: number }
export interface MatrixHeatLayout {
  cells: HeatCell[];
  rowLabels: { id: string; label: string; x: number; y: number; href?: string }[];
  colLabels: { id: string; label: string; x: number; y: number; href?: string }[];
  legend: { x: number; y: number; fill: string; label: string }[];
  cell: number;
}

/** Five ladder steps over [0, 0.5]: 0-0.1 darkest ... 0.4+ lightest. */
export function shadeFor(value: number | null): string {
  if (value === null) return "none";
  const idx = Math.min(4, Math.max(0, Math.floor(value / 0.1)));
  return LADDER[idx];
}

export function layoutMatrixHeat(data: MatrixData, W: number, H: number): MatrixHeatLayout {
  const cell = 22, gap = 4;
  const labelW = Math.min(110, Math.round(W * 0.22));
  const gridW = data.cols.length * (cell + gap) - gap;
  const gridH = data.rows.length * (cell + gap) - gap;
  const x0 = labelW + 12;
  const y0 = 38;
  void H;
  const cells: HeatCell[] = [];
  data.rows.forEach((r, i) => {
    data.cols.forEach((c, j) => {
      const found = data.cells.find((x) => x.row === r.id && x.col === c.id);
      const value = found ? found.value : null;
      cells.push({
        row: r.id, col: c.id, x: x0 + j * (cell + gap), y: y0 + i * (cell + gap), size: cell, value, n: found?.n ?? 0, fill: shadeFor(value), best: Boolean(found?.best),
        title: `${r.label} · ${c.label} · ${value === null ? `no score (${found?.n ?? 0} events)` : `${data.valueLabel} ${value.toFixed(2)} on ${found?.n} events`}`, delay: (i * data.cols.length + j) * 40,
      });
    });
  });
  const rowLabels = data.rows.map((r, i) => ({ id: r.id, label: r.label.toUpperCase(), x: x0 - 10, y: y0 + i * (cell + gap) + cell / 2 + 3, href: r.href }));
  const colLabels = data.cols.map((c, j) => ({ id: c.id, label: c.label.toUpperCase().replace(" AND ", " & ").slice(0, 22), x: x0 + j * (cell + gap) + cell / 2, y: y0 - 10, href: c.href }));
  const legendY = y0 + gridH + 24;
  const legend = [0.05, 0.15, 0.25, 0.35, 0.45].map((v, k) => ({ x: x0 + k * 58, y: legendY, fill: shadeFor(v), label: k === 0 ? "< 0.10 BEST" : k === 4 ? "≥ 0.40" : `${(k * 0.1).toFixed(1)}–${((k + 1) * 0.1).toFixed(1)}` }));
  void gridW;
  return { cells, rowLabels, colLabels, legend, cell };
}
