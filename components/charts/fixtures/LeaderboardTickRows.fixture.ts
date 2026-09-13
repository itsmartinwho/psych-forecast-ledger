// Sample leaderboard for the gallery and the tests. Three persons plus the two reference rows, as of 2026-09-13.
// Owen has a full tier; Angermayer is provisional; Doblin and the markets are counts only.
import type { LeaderboardData } from "@/components/charts/types";

export const LEADERBOARD_FIXTURE_AS_OF = "2026-09-13";

export const leaderboardTickRowsFixture: LeaderboardData = {
  rows: [
    { id: "owen", label: "Owen", value: 0.19, lo: 0.14, hi: 0.25, n: 41, tier: "T2", hero: true, href: "/forecasters/owen" },
    { id: "angermayer", label: "Angermayer", value: 0.31, lo: 0.21, hi: 0.42, n: 14, tier: "T1", note: "Provisional: fewer than 30 resolved events" },
    { id: "doblin", label: "Doblin", value: 0.36, n: 6, tier: "T0", note: "Fewer than 10 resolved events" },
    { id: "base-rate", label: "Base rate", value: 0.24, lo: 0.19, hi: 0.29, n: 38, tier: "T2", reference: true, note: "Published base rates on the same events, fixed at intake" },
    { id: "market", label: "Markets", value: null, n: 4, tier: "T0", reference: true, note: "Last market quote before each statement; indicative" },
  ],
  coinFlip: 0.25,
  domain: [0, 0.5],
  valueLabel: "Brier",
};
