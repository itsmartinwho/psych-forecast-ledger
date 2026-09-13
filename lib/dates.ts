// ISO yyyy-mm-dd strings everywhere; integer day math in UTC. No Date.now() anywhere in the site.
export type IsoDate = string;

const DAY = 86_400_000;

export function toUtc(d: IsoDate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}
export function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}
export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(toUtc(s)) === s;
}
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY);
}
export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtc(toUtc(d) + n * DAY);
}
export function addMonths(d: IsoDate, n: number): IsoDate {
  const [y, m, day] = d.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
/** Signed whole months from a to b (b - a), by calendar month, ignoring the day. */
export function monthsBetween(a: IsoDate, b: IsoDate): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}
export function endOfMonth(y: number, m: number): IsoDate {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}
export function endOfQuarter(y: number, q: 1 | 2 | 3 | 4): IsoDate {
  return endOfMonth(y, q * 3);
}
export function endOfYear(y: number): IsoDate {
  return `${y}-12-31`;
}
export function quarterOf(d: IsoDate): string {
  const [y, m] = d.split("-").map(Number);
  return `${y}-Q${Math.ceil(m / 3)}`;
}
export function yearOf(d: IsoDate): number {
  return Number(d.slice(0, 4));
}
export const cmp = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0);
