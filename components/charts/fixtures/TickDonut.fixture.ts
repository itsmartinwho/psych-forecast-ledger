// Sample tick-donut data. The outcome mix has 84 records (one tick each); the census has 486 (100 ticks, one accent segment).
import type { TickDonutData } from "@/components/charts/types";

/** Outcomes of the hero forecaster's scored items, as_of 2026-09-13. No accent segment. */
export const tickDonutFixture: TickDonutData = {
  segments: [
    { id: "true", label: "True", count: 39, tone: "ink" },
    { id: "false", label: "False", count: 24, tone: "gray-3" },
    { id: "pending", label: "Pending", count: 15, tone: "faint" },
    { id: "void", label: "Void", count: 6, tone: "gray-7" },
  ],
  total: 84,
  centerLabel: "Outcomes of scored forecasts",
  unit: "forecasts",
};

/** The census across the three forecasters: admitted statements take the accent; reason codes fill the rest. */
export const tickDonutCensusFixture: TickDonutData = {
  segments: [
    { id: "admitted", label: "Admitted", count: 212, tone: "accent" },
    { id: "vague", label: "Vague", count: 118, tone: "gray-2" },
    { id: "control", label: "Own venture", count: 61, tone: "gray-3" },
    { id: "report", label: "Report", count: 44, tone: "muted" },
    { id: "other", label: "Other codes", count: 37, tone: "faint" },
    { id: "void", label: "Void", count: 14, tone: "gray-7" },
  ],
  total: 486,
  centerLabel: "Census of forward-looking statements",
  unit: "statements",
};
