// Sample calibration for the gallery and the tests: Owen's headline panel by phrase bin, as of 2026-09-13.
// Bin D is sparse and has no observed share yet; bin A ("will") is the furthest from the ideal line.
import type { CalibrationData } from "@/components/charts/types";

export const CALIBRATION_FIXTURE_AS_OF = "2026-09-13";

export const calibrationPlumbFixture: CalibrationData = {
  bins: [
    { bin: "E", forecast: 0.1, observed: 0.17, n: 12 },
    { bin: "D", forecast: 0.3, observed: null, n: 3 },
    { bin: "C", forecast: 0.5, observed: 0.44, n: 9 },
    { bin: "B", forecast: 0.7, observed: 0.58, n: 26 },
    { bin: "A", forecast: 0.9, observed: 0.71, n: 34 },
  ],
  label: "Owen · headline panel",
};
