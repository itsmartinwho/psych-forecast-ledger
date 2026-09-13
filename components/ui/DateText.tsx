// An ISO date shown for people, kept machine-readable in the datetime attribute.
import { fmtDate, fmtDateShort, fmtMonthYearUpper } from "@/lib/format";

export interface DateTextProps {
  iso: string;
  /** "Jan 2026" instead of "1 Jan 2026". */
  short?: boolean;
  /** "JAN 2026", for ledger rows. */
  upper?: boolean;
  className?: string;
}

export function DateText({ iso, short, upper, className }: DateTextProps) {
  const text = upper ? fmtMonthYearUpper(iso) : short ? fmtDateShort(iso) : fmtDate(iso);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
