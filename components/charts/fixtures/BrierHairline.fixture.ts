// Sample Brier series for the gallery and the tests: mean Brier per quarter, 2021-Q3 to 2026-Q3, as of 2026-09-13.
// Owen resolves events most quarters; the other two persons are sparse; the base rate runs on every quarter.
import type { BrierSeriesData, SeriesPoint } from "@/components/charts/types";

export const BRIER_FIXTURE_AS_OF = "2026-09-13";

const pt = (period: string, value: number | null, n: number): SeriesPoint => ({ period, value, n });

export const brierHairlineFixture: BrierSeriesData = {
  series: [
    {
      id: "owen",
      label: "Owen",
      hero: true,
      points: [
        pt("2021-Q3", 0.31, 2), pt("2021-Q4", 0.22, 3), pt("2022-Q1", 0.18, 4), pt("2022-Q2", 0.27, 3), pt("2022-Q3", 0.12, 5), pt("2022-Q4", null, 0),
        pt("2023-Q1", 0.19, 4), pt("2023-Q2", 0.35, 2), pt("2023-Q3", 0.16, 6), pt("2023-Q4", 0.21, 5), pt("2024-Q1", 0.14, 4), pt("2024-Q2", 0.42, 3),
        pt("2024-Q3", 0.24, 6), pt("2024-Q4", 0.17, 5), pt("2025-Q1", 0.11, 4), pt("2025-Q2", 0.15, 6), pt("2025-Q3", 0.09, 3), pt("2025-Q4", 0.2, 5),
        pt("2026-Q1", 0.18, 4), pt("2026-Q2", 0.22, 2), pt("2026-Q3", 0.16, 3),
      ],
    },
    {
      id: "angermayer",
      label: "Angermayer",
      points: [
        pt("2021-Q4", 0.44, 1), pt("2022-Q2", 0.36, 2), pt("2022-Q4", null, 0), pt("2023-Q2", 0.29, 3), pt("2023-Q4", 0.38, 2), pt("2024-Q2", 0.47, 3),
        pt("2024-Q4", 0.33, 2), pt("2025-Q2", 0.28, 4), pt("2025-Q4", 0.31, 3), pt("2026-Q2", 0.34, 2),
      ],
    },
    {
      id: "doblin",
      label: "Doblin",
      points: [pt("2021-Q3", 0.52, 1), pt("2022-Q1", 0.48, 2), pt("2023-Q1", 0.61, 1), pt("2023-Q3", 0.55, 2), pt("2024-Q3", 0.66, 3), pt("2025-Q1", 0.49, 2), pt("2026-Q1", 0.41, 2)],
    },
    {
      id: "base-rate",
      label: "Base rate",
      points: [
        pt("2021-Q3", 0.26, 3), pt("2021-Q4", 0.24, 4), pt("2022-Q1", 0.23, 6), pt("2022-Q2", 0.27, 5), pt("2022-Q3", 0.22, 5), pt("2022-Q4", 0.25, 2),
        pt("2023-Q1", 0.24, 5), pt("2023-Q2", 0.28, 5), pt("2023-Q3", 0.23, 8), pt("2023-Q4", 0.26, 7), pt("2024-Q1", 0.22, 4), pt("2024-Q2", 0.29, 6),
        pt("2024-Q3", 0.27, 9), pt("2024-Q4", 0.24, 7), pt("2025-Q1", 0.23, 6), pt("2025-Q2", 0.25, 10), pt("2025-Q3", 0.22, 3), pt("2025-Q4", 0.26, 8),
        pt("2026-Q1", 0.24, 8), pt("2026-Q2", 0.25, 4), pt("2026-Q3", 0.23, 3),
      ],
    },
  ],
  coinFlip: 0.25,
};
