// Card titles are conclusions written from the numbers. Pure string work.
import type { ForecasterScores, LeaderboardRow, PanelScores } from "@/lib/score";
import type { Interval } from "@/lib/score";

export const f2 = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(2));
export const f0 = (v: number | null | undefined) => (v === null || v === undefined ? "–" : String(Math.round(v)));
export const pct = (v: number | null | undefined, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? "–" : `${(v * 100).toFixed(d)}%`);
export const ciText = (ci: Interval | null | undefined) => (ci ? `${f2(ci.point)} (${f2(ci.lo)} to ${f2(ci.hi)})` : "–");
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function headlineSentence(short: string, p: PanelScores): string {
  if (p.n_items_total === 0) return `${short} has no dated, admitted claim yet.`;
  if (p.tier === "T0") {
    const resolved = p.n_true + p.n_false;
    if (resolved === 0) return `${short}: ${plural(p.n_pending + p.n_known_true, "dated claim")} pending, none resolved yet.`;
    return `${short}: ${p.n_true} of ${resolved} resolved ${resolved === 1 ? "claim" : "claims"} came true; below 10 events the ledger shows counts, not a score.`;
  }
  const b = p.brier!;
  const verdict = b.point < 0.15 ? "well ahead of a coin flip" : b.point < 0.25 ? "ahead of a coin flip" : b.point < 0.35 ? "no better than a coin flip" : "worse than a coin flip";
  return `${short} scores a Brier of ${f2(b.point)} on ${plural(p.n_clusters, "event")}, ${verdict}${p.label === "provisional" ? " (provisional)" : ""}.`;
}

export function leaderboardTitle(rows: LeaderboardRow[]): string {
  const persons = rows.filter((r) => r.kind === "person");
  const scored = persons.filter((r) => r.brier);
  if (scored.length === 0) return "No forecaster has ten resolved events yet; the board shows counts.";
  const ranked = persons.filter((r) => r.rank !== null);
  if (ranked.length >= 2) return `${ranked[0].name} leads: the intervals do not overlap.`;
  const best = [...scored].sort((a, b) => a.brier!.point - b.brier!.point)[0];
  return scored.length === 1 ? `${best.name} is the only forecaster with a headline score so far.` : "The intervals overlap: the ledger cannot separate the forecasters yet.";
}

export function calibrationTitle(short: string, f: ForecasterScores): string {
  if (!f.calibration.shown) return `Calibration needs 20 resolved events; ${short} has ${f.calibration.n_clusters}.`;
  const will = f.calibration.bins.find((b) => b.bin === "A" || b.merged_from.includes("A"));
  if (will && will.observed !== null) return `When ${short} says "will", it happens ${pct(will.observed)} of the time.`;
  return `${short}'s stated confidence against what happened.`;
}

export function skillSentence(short: string, p: PanelScores): string {
  const s = p.skill_base;
  if (!s.value) return s.n_clusters > 0 ? `Base-rate comparison on ${plural(s.n_clusters, "paired event")}: not enough for a skill score.` : "No paired base rate yet.";
  const v = s.value.point;
  return v > 0 ? `${short} beat the published base rates by ${pct(v)} in Brier terms.` : `The published base rates beat ${short} by ${pct(-v)} in Brier terms.`;
}
