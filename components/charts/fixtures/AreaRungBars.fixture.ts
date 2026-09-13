// Sample rung-bar data. Counts are scored forecasts; value is the Brier score; practice adoption sits below the minimum n.
import type { RungBarsData } from "@/components/charts/types";

/** The five areas for the hero forecaster. as_of 2026-09-13. */
export const areaRungBarsFixture: RungBarsData = {
  groups: [
    { id: "regulatory", label: "Regulatory decisions", count: 41, value: 0.19, n: 41, hero: true, href: "/areas/regulatory" },
    { id: "company_market", label: "Company and market", count: 33, value: 0.22, n: 33, href: "/areas/company_market" },
    { id: "clinical_trial", label: "Clinical trial outcomes", count: 27, value: 0.24, n: 27, href: "/areas/clinical_trial" },
    { id: "payer_policy", label: "Payer and policy", count: 18, value: 0.31, n: 18, href: "/areas/payer_policy" },
    { id: "practice_adoption", label: "Practice adoption", count: 6, value: null, n: 6, faint: true, href: "/areas/practice_adoption" },
  ],
  unit: "one rung = one scored forecast",
  valueLabel: "Brier",
};

/** The three forecasters plus the two reference rows. The market row is below the minimum n. */
export const forecasterRungBarsFixture: RungBarsData = {
  groups: [
    { id: "owen", label: "Owen Scott Muir", count: 125, value: 0.23, n: 125, hero: true, href: "/forecasters/owen" },
    { id: "angermayer", label: "Christian Angermayer", count: 38, value: 0.27, n: 38, href: "/forecasters/angermayer" },
    { id: "doblin", label: "Rick Doblin", count: 22, value: 0.34, n: 22, href: "/forecasters/doblin" },
    { id: "base-rate", label: "Base rate", count: 141, value: 0.25, n: 141 },
    { id: "market", label: "Market", count: 9, value: null, n: 9, faint: true },
  ],
  unit: "one rung = one scored forecast",
  valueLabel: "Brier",
};
