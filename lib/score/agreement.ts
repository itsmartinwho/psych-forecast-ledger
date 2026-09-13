import type { CoderB, Item, Recheck, Statement, Thresholds } from "@/lib/data/schema";
import { cohenKappa, weightedKappa } from "./kappa";

export interface AgreementReport {
  admission: { kappa: number | null; n: number; agree: number };
  event: { kappa: number | null; n: number; agree: number };
  deadline: { kappa: number | null; n: number; agree: number };
  bin: { kappa: number | null; weighted_kappa: number | null; n: number; agree: number };
  recheck: { n: number; upheld: number; overturned: number; escalated: number; upheld_share: number | null };
  target: number;
  below_target: string[];
}

/** M11: Cohen's kappa per coded field between coder A (intake) and coder B, plus recheck outcomes. */
export function agreement(statements: Statement[], items: Item[], coderB: CoderB[], rechecks: Recheck[], th: Thresholds): AgreementReport {
  const bById = new Map(coderB.map((b) => [b.id, b]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const admitA: boolean[] = [], admitB: boolean[] = [];
  for (const s of statements) {
    const b = bById.get(s.id);
    if (!b || s.coders?.a_admit === undefined) continue;
    admitA.push(s.coders.a_admit); admitB.push(b.admit);
  }
  const evA: string[] = [], evB: string[] = [], dlA: string[] = [], dlB: string[] = [], binA: string[] = [], binB: string[] = [];
  for (const b of coderB) {
    const a = itemById.get(b.id);
    if (!a || !b.admit) continue;
    evA.push(a.event_id); evB.push(b.event_id ?? "none");
    dlA.push(a.deadline ?? "none"); dlB.push(b.deadline ?? "none");
    if (a.bin && b.bin) { binA.push(a.bin); binB.push(b.bin); }
  }
  const agreeCount = <T>(x: T[], y: T[]) => x.filter((v, i) => v === y[i]).length;
  const rc = { n: rechecks.length, upheld: rechecks.filter((r) => r.verdict === "upheld").length, overturned: rechecks.filter((r) => r.verdict === "overturned").length, escalated: rechecks.filter((r) => r.verdict === "escalated").length };
  const report: AgreementReport = {
    admission: { kappa: cohenKappa(admitA, admitB), n: admitA.length, agree: agreeCount(admitA, admitB) },
    event: { kappa: cohenKappa(evA, evB), n: evA.length, agree: agreeCount(evA, evB) },
    deadline: { kappa: cohenKappa(dlA, dlB), n: dlA.length, agree: agreeCount(dlA, dlB) },
    bin: { kappa: cohenKappa(binA, binB), weighted_kappa: weightedKappa(binA, binB, ["E", "D", "C", "B", "A"]), n: binA.length, agree: agreeCount(binA, binB) },
    recheck: { ...rc, upheld_share: rc.n ? rc.upheld / rc.n : null },
    target: th.kappa_target,
    below_target: [],
  };
  for (const [k, v] of Object.entries({ admission: report.admission.kappa, event: report.event.kappa, deadline: report.deadline.kappa, bin: report.bin.weighted_kappa })) {
    if (v !== null && v < th.kappa_target) report.below_target.push(k);
  }
  return report;
}
