// Sample lineage data: twelve items from the three forecasters over 2021 to 2026 and the timeline events that
// moved them. Every date is a fixed string; as_of is 2026-09-13. Owen's accelerated-TMS lane is the hero.
import type { TrendLanesData } from "@/components/charts/types";

export const TREND_LANES_FIXTURE: TrendLanesData = {
  start: "2021-01-01",
  end: "2027-06-30",
  today: "2026-09-13",
  events: [
    { date: "2021-05-10", label: "MAPP1 published", kind: "publication" },
    { date: "2022-06-06", label: "MAPP2 topline", kind: "trial_readout_positive" },
    { date: "2023-06-23", label: "FDA psychedelic guidance", kind: "rule" },
    { date: "2023-12-12", label: "Lykos NDA filed", kind: "other" },
    { date: "2024-06-04", label: "AdComm votes no", kind: "statement" },
    { date: "2024-08-09", label: "MDMA CRL", kind: "crl" },
    { date: "2025-01-21", label: "Spravato monotherapy", kind: "approval" },
    { date: "2025-06-23", label: "COMP005 topline", kind: "trial_readout_positive" },
    { date: "2025-11-20", label: "DEA telehealth extended", kind: "extension" },
    { date: "2026-01-30", label: "CMS TMS code", kind: "coverage" },
    { date: "2026-07-15", label: "Lilly buys atai", kind: "merger_acquisition" },
  ],
  lanes: [
    { id: "owen-0007", label: "TMS payment rise", start: "2021-09-14", deadline: "2022-12-31", resolved: "2022-11-02", state: "true", restatements: [{ date: "2022-03-08", p: 0.7 }], href: "/items/owen-0007" },
    { id: "doblin-0002", label: "MDMA approval 2023", start: "2021-06-22", deadline: "2023-12-31", resolved: "2023-12-31", state: "false", restatements: [{ date: "2022-05-11", p: 0.9 }, { date: "2023-05-02", p: 0.7 }], href: "/items/doblin-0002" },
    { id: "angermayer-0003", label: "MDMA approval 2024", start: "2021-10-05", deadline: "2024-12-31", resolved: "2024-08-09", state: "false", restatements: [{ date: "2023-01-11", p: 0.9 }, { date: "2024-02-20", p: 0.7 }], href: "/items/angermayer-0003" },
    { id: "angermayer-0011", label: "COMP360 phase 3 positive", start: "2022-03-15", deadline: "2025-12-31", resolved: "2025-06-23", state: "true", restatements: [{ date: "2024-11-06", p: 0.9 }], href: "/items/angermayer-0011" },
    { id: "owen-0040", label: "Ketamine clinic closures", start: "2022-08-30", deadline: "2023-08-30", state: "void", href: "/items/owen-0040" },
    { id: "doblin-0014", label: "Psilocybin rescheduled", start: "2022-11-02", deadline: "2026-12-31", state: "pending", restatements: [{ date: "2024-04-17", p: 0.7 }, { date: "2026-02-02", p: 0.5 }], href: "/items/doblin-0014" },
    { id: "owen-0021", label: "Spravato monotherapy", start: "2023-02-09", deadline: "2025-06-30", resolved: "2025-01-21", state: "true", restatements: [{ date: "2024-09-03", p: 0.7 }], href: "/items/owen-0021" },
    { id: "owen-0034", label: "DEA telehealth rule final", start: "2023-10-11", deadline: "2024-12-31", resolved: "2024-12-31", state: "false", restatements: [{ date: "2024-06-18", p: 0.5 }], href: "/items/owen-0034" },
    { id: "owen-0052", label: "Accelerated TMS covered", start: "2024-05-21", deadline: "2027-05-31", state: "pending", hero: true, restatements: [{ date: "2025-01-14", p: 0.5 }, { date: "2025-10-09", p: 0.7 }, { date: "2026-06-03", p: 0.9 }], href: "/items/owen-0052" },
    { id: "doblin-0009", label: "Lykos resubmission", start: "2024-09-10", deadline: "2026-12-31", state: "pending", restatements: [{ date: "2025-08-18", p: 0.5 }], href: "/items/doblin-0009" },
    { id: "angermayer-0019", label: "atai acquired", start: "2025-03-04", deadline: "2026-12-31", resolved: "2026-07-15", state: "true", href: "/items/angermayer-0019" },
    { id: "owen-0058", label: "Compass approval 2026", start: "2025-09-02", deadline: "2026-12-31", state: "pending", href: "/items/owen-0058" },
  ],
};
