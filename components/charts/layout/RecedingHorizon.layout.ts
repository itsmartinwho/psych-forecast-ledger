// Receding horizon: x = statement date, y = predicted date, one dot per restatement joined by a 0.7px path.
// The dashed diagonal is "predicted = said"; the actual date, when known, is the one accent rule.
import type { RecedingHorizonData } from "@/components/charts/types";
import { toUtc, fromUtc } from "@/lib/dates";

export interface HorizonDot { x: number; y: number; r: number; p: number; statementDate: string; predictedDate: string; title: string; href?: string; delay: number }
export interface RecedingHorizonLayout {
  dots: HorizonDot[];
  path: string;
  diagonal: { x1: number; y1: number; x2: number; y2: number };
  actual: { y: number; label: string } | null;
  today: { x: number } | null;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
  plot: { x0: number; x1: number; y0: number; y1: number };
}

export function layoutRecedingHorizon(data: RecedingHorizonData, W: number, H: number): RecedingHorizonLayout {
  const m = { l: 46, r: 18, t: 16, b: 30 };
  const plot = { x0: m.l, x1: W - m.r, y0: m.t, y1: H - m.b };
  const xs = data.points.map((p) => toUtc(p.statementDate));
  const ys = data.points.map((p) => toUtc(p.predictedDate));
  const extra = [toUtc(data.today), ...(data.actualDate ? [toUtc(data.actualDate)] : [])];
  const min = Math.min(...xs, ...ys, ...extra) - 90 * 86_400_000;
  const max = Math.max(...xs, ...ys, ...extra) + 90 * 86_400_000;
  const sx = (t: number) => plot.x0 + ((t - min) / (max - min)) * (plot.x1 - plot.x0);
  const sy = (t: number) => plot.y1 - ((t - min) / (max - min)) * (plot.y1 - plot.y0);
  const dots: HorizonDot[] = data.points.map((p, i) => ({
    x: sx(toUtc(p.statementDate)), y: sy(toUtc(p.predictedDate)), r: 2.2 + 3.6 * Math.sqrt(p.p), p: p.p, statementDate: p.statementDate, predictedDate: p.predictedDate,
    title: `${p.statementDate}: by ${p.predictedDate} · p ${p.p.toFixed(2)}`, href: p.href, delay: i * 90,
  }));
  const path = dots.map((d, i) => `${i === 0 ? "M" : "L"}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  const years: number[] = [];
  for (let y = new Date(min).getUTCFullYear() + 1; y <= new Date(max).getUTCFullYear(); y++) years.push(y);
  const xTicks = years.map((y) => ({ x: sx(toUtc(`${y}-01-01`)), label: String(y) })).filter((t) => t.x >= plot.x0 && t.x <= plot.x1);
  const yTicks = years.map((y) => ({ y: sy(toUtc(`${y}-01-01`)), label: String(y) })).filter((t) => t.y >= plot.y0 && t.y <= plot.y1);
  const todayX = sx(toUtc(data.today));
  return {
    dots, path,
    diagonal: { x1: sx(min), y1: sy(min), x2: sx(max), y2: sy(max) },
    actual: data.actualDate ? { y: sy(toUtc(data.actualDate)), label: `HAPPENED ${fromUtc(toUtc(data.actualDate)).toUpperCase()}` } : null,
    today: todayX >= plot.x0 && todayX <= plot.x1 ? { x: todayX } : null,
    xTicks, yTicks, plot,
  };
}
