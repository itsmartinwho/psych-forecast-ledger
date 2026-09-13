// Sample boldness data: three forecasters plus the two reference rows, with per-item points for the people.
// x is |p minus base rate| for one item; y is that item's Brier, so items sit on the few values p can take.
import type { BoldnessData } from "@/components/charts/types";

export const BOLDNESS_FIXTURE: BoldnessData = {
  xLabel: "mean |p − base rate|",
  yLabel: "Brier · lower is better",
  yRule: 0.25,
  points: [
    {
      id: "owen",
      label: "Owen",
      x: 0.21,
      y: 0.19,
      n: 38,
      hero: true,
      items: [
        { x: 0.14, y: 0.09 }, { x: 0.34, y: 0.01 }, { x: 0.2, y: 0.09 }, { x: 0.21, y: 0.09 }, { x: 0.06, y: 0.25 },
        { x: 0.26, y: 0.49 }, { x: 0.14, y: 0.49 }, { x: 0.34, y: 0.01 }, { x: 0.13, y: 0.09 }, { x: 0.2, y: 0.09 },
        { x: 0.27, y: 0.09 }, { x: 0.14, y: 0.09 }, { x: 0.36, y: 0.01 }, { x: 0.06, y: 0.25 }, { x: 0.2, y: 0.49 },
        { x: 0.34, y: 0.81 }, { x: 0.21, y: 0.09 }, { x: 0.14, y: 0.09 }, { x: 0.27, y: 0.01 }, { x: 0.13, y: 0.25 },
      ],
    },
    {
      id: "angermayer",
      label: "Angermayer",
      x: 0.34,
      y: 0.31,
      n: 14,
      items: [
        { x: 0.34, y: 0.01 }, { x: 0.4, y: 0.81 }, { x: 0.34, y: 0.81 }, { x: 0.26, y: 0.09 }, { x: 0.4, y: 0.01 },
        { x: 0.34, y: 0.01 }, { x: 0.21, y: 0.49 }, { x: 0.4, y: 0.01 }, { x: 0.34, y: 0.81 }, { x: 0.36, y: 0.01 },
      ],
    },
    {
      id: "doblin",
      label: "Doblin",
      x: 0.41,
      y: 0.44,
      n: 11,
      items: [
        { x: 0.4, y: 0.81 }, { x: 0.4, y: 0.81 }, { x: 0.34, y: 0.01 }, { x: 0.4, y: 0.81 }, { x: 0.44, y: 0.01 },
        { x: 0.4, y: 0.01 }, { x: 0.4, y: 0.81 }, { x: 0.44, y: 0.01 },
      ],
    },
    { id: "base-rate", label: "Base rate", x: 0, y: 0.24, n: 38 },
    { id: "market", label: "Market", x: 0.12, y: 0.21, n: 9 },
  ],
};
