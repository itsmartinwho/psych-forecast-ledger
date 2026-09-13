// Sample almanac rows: twenty hand-written records across the three forecasters, 2021 to 2026, as_of 2026-09-13,
// plus a dense variant (140 rows) that exercises the 120-row cap. Generated rows use the seeded PRNG only.
import type { AlmanacData, AlmanacRow, State } from "@/components/charts/types";
import { addDays, addMonths } from "@/lib/dates";
import { mulberry32 } from "@/lib/tokens";

export const ALMANAC_TODAY = "2026-09-13";

const ROWS: AlmanacRow[] = [
  { id: "doblin-0002", date: "2021-03-15", deadline: "2021-06-30", resolved: "2021-05-10", state: "true", p: 0.9, label: "MAPP1 publishes in a top journal this spring", affiliated: true, href: "/items/doblin-0002" },
  { id: "owen-0007", date: "2021-06-14", deadline: "2022-12-31", resolved: "2022-12-31", state: "false", p: 0.7, label: "Spravato REMS eases by end of 2022", href: "/items/owen-0007" },
  { id: "angermayer-0003", date: "2021-09-20", deadline: "2021-12-31", resolved: "2021-11-09", state: "true", p: 0.9, label: "COMP360 phase 2b reads out positive", affiliated: true, href: "/items/angermayer-0003" },
  { id: "owen-0021", date: "2022-02-08", deadline: "2024-12-31", resolved: "2024-12-31", state: "false", p: 0.5, label: "Accelerated TMS gets a CPT code by 2024", href: "/items/owen-0021" },
  { id: "doblin-0011", date: "2022-06-01", deadline: "2023-12-31", resolved: "2023-12-31", state: "false", p: 0.9, label: "MDMA-assisted therapy approved by end of 2023", affiliated: true, href: "/items/doblin-0011" },
  { id: "angermayer-0009", date: "2022-10-12", deadline: "2023-03-31", resolved: "2023-01-09", state: "false", p: 0.7, label: "PCN-101 phase 2 meets its primary endpoint", affiliated: true, href: "/items/angermayer-0009" },
  { id: "owen-0044", date: "2023-01-03", deadline: "2023-12-31", resolved: "2023-10-06", state: "true", p: 0.7, label: "DEA extends telemedicine flexibilities again in 2023", href: "/items/owen-0044" },
  { id: "owen-0058", date: "2023-05-22", deadline: "2024-09-30", resolved: "2024-08-09", state: "true", p: 0.5, label: "Lykos receives a complete response letter", href: "/items/owen-0058" },
  { id: "doblin-0019", date: "2023-12-11", deadline: "2024-12-31", resolved: "2024-08-09", state: "false", p: 0.9, label: "FDA approves MDMA-assisted therapy in 2024", affiliated: true, href: "/items/doblin-0019" },
  { id: "angermayer-0017", date: "2024-01-15", deadline: "2024-12-31", resolved: "2024-12-31", state: "false", p: 0.7, label: "COMP360 phase 3 topline lands in 2024", affiliated: true, href: "/items/angermayer-0017" },
  { id: "owen-0071", date: "2024-03-04", deadline: "2024-12-31", resolved: "2024-08-15", state: "true", p: 0.5, label: "Lykos cuts most of its staff after a CRL", href: "/items/owen-0071" },
  { id: "owen-0088", date: "2024-09-10", deadline: "2025-06-30", resolved: "2025-06-23", state: "true", p: 0.7, label: "COMP005 meets its primary endpoint", hero: true, href: "/items/owen-0088" },
  { id: "angermayer-0024", date: "2025-02-03", deadline: "2025-12-31", resolved: "2025-06-02", state: "true", p: 0.9, label: "atai and Beckley Psytech close their merger in 2025", affiliated: true, href: "/items/angermayer-0024" },
  { id: "doblin-0027", date: "2025-04-21", deadline: "2026-06-30", resolved: "2026-06-30", state: "false", p: 0.7, label: "Lykos resubmits the MDMA NDA by mid-2026", affiliated: true, href: "/items/doblin-0027" },
  { id: "owen-0102", date: "2025-08-18", deadline: "2026-01-31", resolved: "2026-01-31", state: "void", p: 0.5, label: "CMS finalizes a TMS payment change for 2026", href: "/items/owen-0102" },
  { id: "angermayer-0031", date: "2026-01-20", deadline: "2026-12-31", resolved: "2026-07-14", state: "true", p: 0.5, label: "Eli Lilly agrees to acquire atai in 2026", affiliated: true, href: "/items/angermayer-0031" },
  { id: "owen-0117", date: "2026-03-02", deadline: "2026-12-31", state: "pending", p: 0.5, label: "FDA approves COMP360 for TRD by end of 2026", href: "/items/owen-0117" },
  { id: "doblin-0033", date: "2026-05-11", deadline: "2026-12-31", state: "pending", p: 0.7, label: "Lykos wins an advisory vote by end of 2026", affiliated: true, href: "/items/doblin-0033" },
  { id: "owen-0121", date: "2026-06-08", deadline: "2026-11-30", state: "pending", p: 0.3, label: "DEA finalizes the telehealth rule before the flexibilities lapse", href: "/items/owen-0121" },
  { id: "angermayer-0035", date: "2026-08-01", deadline: "2026-12-31", state: "pending", p: 0.7, label: "Compass files the COMP360 NDA in 2026", affiliated: true, href: "/items/angermayer-0035" },
];

export const ledgerAlmanacFixture: AlmanacData = {
  rows: ROWS,
  start: "2021-01-01",
  end: "2026-12-31",
  today: ALMANAC_TODAY,
};

const FORECASTERS = ["owen", "angermayer", "doblin"] as const;
const BINS = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

/** Deterministic filler rows so a chart can be tested past the row cap. */
function generatedRows(count: number, seed: number): AlmanacRow[] {
  const rnd = mulberry32(seed);
  const rows: AlmanacRow[] = [];
  for (let i = 0; i < count; i++) {
    const who = FORECASTERS[i % FORECASTERS.length];
    const date = addDays("2021-05-01", Math.floor(rnd() * 1900));
    const deadline = addMonths(date, 3 + Math.floor(rnd() * 22));
    const p = BINS[Math.floor(rnd() * BINS.length)];
    const roll = rnd();
    let state: State;
    let resolved: string | undefined;
    if (deadline > ALMANAC_TODAY) {
      state = "pending";
    } else if (roll < 0.08) {
      state = "void";
      resolved = deadline;
    } else if (roll < 0.08 + p * 0.9) {
      state = "true";
      resolved = addDays(date, Math.floor(rnd() * Math.max(1, Math.round((Number(deadline.slice(0, 4)) - Number(date.slice(0, 4))) * 365 + 30))));
      if (resolved > deadline) resolved = deadline;
    } else {
      state = "false";
      resolved = deadline;
    }
    const id = `${who}-${String(500 + i).padStart(4, "0")}`;
    rows.push({ id, date, deadline, resolved, state, p, label: `Generated item ${i + 1}`, affiliated: who !== "owen" && rnd() < 0.6 });
  }
  return rows;
}

/** 140 rows: the twenty real ones plus 120 generated, to exercise the cap. */
export const ledgerAlmanacDenseFixture: AlmanacData = {
  rows: [...ROWS, ...generatedRows(120, 20260913)],
  start: "2021-01-01",
  end: "2026-12-31",
  today: ALMANAC_TODAY,
};
