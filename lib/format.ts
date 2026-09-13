// Display formatting for ISO dates and scores. Pure string and number work: no Date constructor here,
// because every date in the site is already a yyyy-mm-dd string and the display never needs a clock.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Placeholder for a missing value. One glyph everywhere so the eye learns it. */
export const NA = "–";

interface DateParts { y: number; m: number; d: number }

function parseIso(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const parts = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  if (parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 31) return null;
  return parts;
}

/** "2026-01-01" -> "1 Jan 2026". A string that is not an ISO date comes back unchanged. */
export function fmtDate(iso: string): string {
  const p = parseIso(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : iso;
}

/** "2026-01-01" -> "Jan 2026". */
export function fmtDateShort(iso: string): string {
  const p = parseIso(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.y}` : iso;
}

/** "2026-01-01" -> "JAN 2026", for uppercase axis and ledger labels. */
export function fmtMonthYearUpper(iso: string): string {
  return fmtDateShort(iso).toUpperCase();
}

/** 0.734 -> "73%". Null shows the placeholder. */
export function fmtPct(p: number | null | undefined, digits = 0): string {
  if (p === null || p === undefined || Number.isNaN(p)) return NA;
  const v = p * 100;
  return `${digits === 0 ? Math.round(v) : v.toFixed(digits)}%`;
}

/** 0.2345 -> "0.23". Brier scores always show two decimals so columns align. */
export function fmtBrier(b: number | null | undefined, digits = 2): string {
  if (b === null || b === undefined || Number.isNaN(b)) return NA;
  return b.toFixed(digits);
}

/** { value: 0.23, lo: 0.12, hi: 0.41 } -> "0.23 (0.12 to 0.41)". */
export function fmtCI(ci: { value: number; lo: number; hi: number } | null | undefined, digits = 2): string {
  if (!ci) return NA;
  return `${ci.value.toFixed(digits)} (${ci.lo.toFixed(digits)} to ${ci.hi.toFixed(digits)})`;
}

/** 14.5 -> "14.5 mo"; 14 -> "14 mo". One decimal at most. */
export function fmtMonths(m: number | null | undefined): string {
  if (m === null || m === undefined || Number.isNaN(m)) return NA;
  const r = Math.round(m * 10) / 10;
  return `${r} mo`;
}

/** "2026-Q1" -> "Q1 2026". Any other string comes back unchanged. */
export function quarterLabel(q: string): string {
  const m = /^(\d{4})-(Q[1-4])$/.exec(q);
  return m ? `${m[2]} ${m[1]}` : q;
}

/** 1234 -> "1,234". Fixed en-US grouping so server and client agree. */
export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return NA;
  return Math.round(n).toLocaleString("en-US");
}

/** Signed number with a fixed number of decimals: 0.05 -> "+0.05"; -0.1 -> "-0.10". */
export function fmtSigned(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NA;
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}
