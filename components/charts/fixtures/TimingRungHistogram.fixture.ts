// Sample timing data: months from the stated deadline to the resolution date for 54 resolved predictions.
// Most events landed after the deadline, so the open bin is the tallest and the median sits at +14 months.
import type { HistogramData } from "@/components/charts/types";

export const TIMING_HISTOGRAM_FIXTURE: HistogramData = {
  unit: "months",
  zeroLabel: "deadline",
  rungUnit: "prediction",
  median: 14,
  bins: [
    { lo: -12, hi: -6, count: 2 },
    { lo: -6, hi: 0, count: 5 },
    { lo: 0, hi: 6, count: 8 },
    { lo: 6, hi: 12, count: 9 },
    { lo: 12, hi: Number.POSITIVE_INFINITY, count: 30 },
  ],
};
