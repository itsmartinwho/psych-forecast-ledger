import { describe, expect, it } from "vitest";
import { NA, fmtBrier, fmtCI, fmtDate, fmtDateShort, fmtInt, fmtMonthYearUpper, fmtMonths, fmtPct, fmtSigned, quarterLabel } from "@/lib/format";

describe("lib/format", () => {
  it("formats ISO dates without a Date constructor", () => {
    expect(fmtDate("2026-01-01")).toBe("1 Jan 2026");
    expect(fmtDate("2025-12-31")).toBe("31 Dec 2025");
    expect(fmtDateShort("2026-01-01")).toBe("Jan 2026");
    expect(fmtMonthYearUpper("2026-01-01")).toBe("JAN 2026");
  });
  it("returns a non-date string unchanged", () => {
    expect(fmtDate("soon")).toBe("soon");
    expect(fmtDate("2026-13-01")).toBe("2026-13-01");
    expect(fmtDateShort("")).toBe("");
  });
  it("formats percentages and scores", () => {
    expect(fmtPct(0.734)).toBe("73%");
    expect(fmtPct(1)).toBe("100%");
    expect(fmtPct(0.5, 1)).toBe("50.0%");
    expect(fmtPct(null)).toBe(NA);
    expect(fmtBrier(0.2345)).toBe("0.23");
    expect(fmtBrier(0)).toBe("0.00");
    expect(fmtBrier(null)).toBe(NA);
    expect(fmtCI({ value: 0.23, lo: 0.12, hi: 0.41 })).toBe("0.23 (0.12 to 0.41)");
    expect(fmtCI(null)).toBe(NA);
    expect(fmtSigned(0.05)).toBe("+0.05");
    expect(fmtSigned(-0.1)).toBe("-0.10");
    expect(fmtSigned(0)).toBe("0.00");
  });
  it("formats months and quarters", () => {
    expect(fmtMonths(14.5)).toBe("14.5 mo");
    expect(fmtMonths(14)).toBe("14 mo");
    expect(fmtMonths(14.26)).toBe("14.3 mo");
    expect(fmtMonths(null)).toBe(NA);
    expect(quarterLabel("2026-Q1")).toBe("Q1 2026");
    expect(quarterLabel("2026")).toBe("2026");
  });
  it("formats integers with fixed grouping", () => {
    expect(fmtInt(1234)).toBe("1,234");
    expect(fmtInt(12)).toBe("12");
    expect(fmtInt(null)).toBe(NA);
  });
});
