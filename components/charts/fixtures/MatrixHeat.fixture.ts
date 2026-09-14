// Fixture: three forecasters by the five areas, as the overview shows them. Short names come from data/areas.json.
import type { MatrixData } from "@/components/charts/types";

const AREAS = [
  { id: "regulatory", label: "Regulatory decisions", short: "Regulatory" },
  { id: "clinical_trial", label: "Trial outcomes", short: "Trials" },
  { id: "company_market", label: "Company and market outcomes", short: "Company" },
  { id: "payer_policy", label: "Payer and policy", short: "Payer" },
  { id: "practice_adoption", label: "Practice adoption", short: "Practice" },
];

export const matrixHeatFixture: MatrixData = {
  rows: [
    { id: "owen", label: "Muir", href: "/forecasters/owen" },
    { id: "angermayer", label: "Angermayer", href: "/forecasters/angermayer" },
    { id: "doblin", label: "Doblin", href: "/forecasters/doblin" },
  ],
  cols: AREAS.map((a) => ({ ...a, href: `/areas/${a.id}` })),
  cells: [
    { row: "owen", col: "regulatory", value: 0.19, n: 11, best: true },
    { row: "owen", col: "clinical_trial", value: null, n: 3, best: false },
    { row: "owen", col: "company_market", value: null, n: 2, best: false },
    { row: "owen", col: "payer_policy", value: null, n: 4, best: false },
    { row: "owen", col: "practice_adoption", value: null, n: 1, best: false },
    { row: "angermayer", col: "regulatory", value: null, n: 3, best: false },
    { row: "angermayer", col: "clinical_trial", value: null, n: 2, best: false },
    { row: "angermayer", col: "company_market", value: null, n: 0, best: false },
    { row: "angermayer", col: "payer_policy", value: null, n: 0, best: false },
    { row: "angermayer", col: "practice_adoption", value: null, n: 2, best: false },
    { row: "doblin", col: "regulatory", value: 0.4, n: 9, best: false },
    { row: "doblin", col: "clinical_trial", value: null, n: 3, best: false },
    { row: "doblin", col: "company_market", value: null, n: 0, best: false },
    { row: "doblin", col: "payer_policy", value: null, n: 1, best: false },
    { row: "doblin", col: "practice_adoption", value: null, n: 0, best: false },
  ],
  steps: 5,
  valueLabel: "Brier",
};

/** The same matrix without short names: the layout must still keep the full names apart. */
export const matrixHeatLongLabelsFixture: MatrixData = { ...matrixHeatFixture, cols: AREAS.map((a) => ({ id: a.id, label: a.label, href: `/areas/${a.id}` })) };
