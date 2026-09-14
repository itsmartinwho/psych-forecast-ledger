// Takeaways, verdicts and titles written from the numbers. Pure string work: every number in a sentence
// is computed here from the dataset, the score snapshot or the thresholds. No chart words in a takeaway.
import type { RungGroup, RungBarsData, BoldnessData, Tier } from "@/components/charts/types";
import type { ForecasterScores, LeaderboardRow, PanelScores, ScoredItem, SharedEventRow, ScoreSnapshot } from "@/lib/score";
import type { Interval } from "@/lib/score";
import type { Dataset, Forecaster, TimelineEvent } from "./schema";
import type { EventView, PredictionDetail } from "./derive";
import { STATE_WORD } from "./derive";
import { fmtDate, fmtInt } from "@/lib/format";
import { quarterOf, yearOf } from "@/lib/dates";

type ReasonCodeTable = Pick<Dataset["reason_codes"], "not_admitted" | "void">;

export const f2 = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(2));
export const f0 = (v: number | null | undefined) => (v === null || v === undefined ? "–" : String(Math.round(v)));
export const pct = (v: number | null | undefined, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? "–" : `${(v * 100).toFixed(d)}%`);
export const ciText = (ci: Interval | null | undefined) => (ci ? `${f2(ci.point)} (${f2(ci.lo)} to ${f2(ci.hi)})` : "–");
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;

/** "2023-Q2" -> "2023 Q2". Any other string comes back unchanged. */
const periodText = (p: string) => p.replace(/^(\d{4})-(Q[1-4])$/, "$1 $2");

// ---- scoreboard --------------------------------------------------------------------------------
/** The verdict band for a Brier point. */
export function brierBand(point: number): string {
  if (point < 0.15) return "Well ahead of a coin flip";
  if (point < 0.25) return "Ahead of a coin flip";
  if (point < 0.35) return "No better than a coin flip";
  return "Worse than a coin flip";
}

/** The one-line verdict under the score. */
export function scoreboardVerdict(h: PanelScores, minN: number): string {
  if (h.tier === "T0" || !h.brier) {
    if (h.n_true + h.n_false === 0) return "No claim has come due yet.";
    return `A score needs ${fmtInt(minN)} resolved events.`;
  }
  const band = brierBand(h.brier.point);
  return h.tier === "T1" ? `${band}, provisional.` : `${band}.`;
}

/** The big value: the Brier point, or the count of true claims over resolved claims. */
export function scoreValue(h: PanelScores): string {
  return h.brier ? f2(h.brier.point) : `${fmtInt(h.n_true)} of ${fmtInt(h.n_true + h.n_false)}`;
}

/** The interval fragment of the meta line: "95% 0.06 to 0.36". Null without a score. */
export function scoreRange(h: PanelScores): string | null {
  return h.brier ? `95% ${f2(h.brier.lo)} to ${f2(h.brier.hi)}` : null;
}

/** The meta line under the big value. Uppercase by CSS. */
export function scoreSub(h: PanelScores): string {
  return h.brier ? `Brier · ${scoreRange(h)} · ${h.label}` : "Resolved claims came true";
}

/** A metric below its minimum: "needs 10 events · 2 now". */
export function metricNeed(need: number, now: number, unit: string): string {
  return `needs ${fmtInt(need)} ${unit} · ${fmtInt(now)} now`;
}

// ---- leaderboard -------------------------------------------------------------------------------
/** The row fields the takeaway reads; chart rows (label = short name) and snapshot rows both fit. */
export interface BoardRow { label: string; value: number | null; lo?: number; hi?: number; n: number; tier: Tier; reference?: boolean; rank?: number | null }

const overlaps = (a: BoardRow, b: BoardRow) => (a.lo ?? a.value ?? 0) <= (b.hi ?? b.value ?? 0) && (b.lo ?? b.value ?? 0) <= (a.hi ?? a.value ?? 0);

export function leaderboardTakeaway(rows: BoardRow[], minN: number): string {
  const persons = rows.filter((r) => !r.reference);
  const scored = persons.filter((r) => r.value !== null);
  if (scored.length === 0) return `No forecaster has ${fmtInt(minN)} resolved events yet.`;
  if (scored.length === 1) {
    const r = scored[0];
    return `${r.label} is the only forecaster with a score: ${f2(r.value)} on ${plural(r.n, "event")}${r.tier === "T1" ? ", provisional" : ""}.`;
  }
  const best = [...scored].sort((a, b) => (a.value as number) - (b.value as number))[0];
  const hasRank = scored.some((r) => r.rank !== undefined);
  const leads = hasRank ? best.rank === 1 : scored.every((o) => o === best || !overlaps(best, o));
  return leads ? `${best.label} leads; the intervals do not overlap.` : "The intervals overlap; no ranking yet.";
}

/** Snapshot rows mapped to the takeaway shape with short names. */
export function boardRows(rows: LeaderboardRow[], forecasters: Pick<Forecaster, "slug" | "short">[]): BoardRow[] {
  const short = new Map<string, string>(forecasters.map((f) => [f.slug, f.short]));
  return rows.map((r) => ({ label: r.kind === "person" ? short.get(r.slug) ?? r.name : r.name, value: r.brier ? r.brier.point : null, lo: r.brier?.lo, hi: r.brier?.hi, n: r.n_clusters, tier: r.tier, reference: r.kind === "reference", rank: r.rank }));
}

// ---- per-forecaster charts ---------------------------------------------------------------------
export function overTimeTakeaway(f: ForecasterScores): string {
  const s = f.over_time;
  if (s.length === 0) return "No claim has come due yet.";
  const first = s[0];
  const last = s[s.length - 1];
  const head = `Cumulative Brier ${f2(last.cumulative)} after ${plural(last.cumulative_n, "event")}`;
  if (s.length === 1) return `${head}.`;
  const dir = last.cumulative > first.cumulative ? "up from" : last.cumulative < first.cumulative ? "down from" : "level with";
  return `${head}, ${dir} ${f2(first.cumulative)} in ${periodText(first.period)}.`;
}

export function admissionTakeaway(funnel: RungBarsData): string {
  const count = (id: string) => funnel.groups.find((g) => g.id === id)?.count ?? 0;
  const found = count("found");
  const admitted = count("admitted");
  const resolved = count("resolved");
  if (admitted === 0) return "No statement has passed intake yet.";
  return `1 in ${fmtInt(Math.round(found / admitted))} statements is a checkable claim; ${fmtInt(resolved)} are resolved.`;
}

export function reasonsTakeaway(groups: RungGroup[]): string {
  const n = groups.reduce((s, g) => s + g.count, 0);
  if (n === 0) return "Every statement passed intake.";
  const top = groups.reduce((m, g) => (g.count > m.count ? g : m), groups[0]);
  return `${top.label} accounts for ${fmtInt(top.count)} of ${fmtInt(n)} statements not admitted.`;
}

export function areasTakeaway(byArea: ForecasterScores["by_area"], areas: { slug: string; name: string }[]): string {
  const rows = areas.map((a) => ({ name: a.name, n: byArea[a.slug]?.n_clusters ?? 0 }));
  const n = rows.reduce((s, r) => s + r.n, 0);
  if (n === 0) return "No claim has come due yet.";
  const top = rows.reduce((m, r) => (r.n > m.n ? r : m), rows[0]);
  return `${top.name} holds ${fmtInt(top.n)} of ${plural(n, "resolved event")}.`;
}

export function calibrationTakeaway(short: string, f: ForecasterScores): string {
  const will = f.calibration.bins.find((b) => b.bin === "A" || b.merged_from.includes("A"));
  if (will && will.observed !== null) return `When ${short} says "will", it happens ${pct(will.observed)} of the time.`;
  return `${short}'s stated confidence against what happened.`;
}

export function matrixTakeaway(snap: ScoreSnapshot, ds: Pick<Dataset, "forecasters" | "areas">): string {
  const shown = snap.matrix.filter((c) => c.shown && c.brier !== null);
  if (shown.length === 0) return "No forecaster has enough resolved events in one area yet.";
  const best = shown.reduce((m, c) => ((c.brier as number) < (m.brier as number) ? c : m), shown[0]);
  const short = ds.forecasters.find((f) => f.slug === best.forecaster)?.short ?? best.forecaster;
  const area = ds.areas.find((a) => a.slug === best.area)?.name ?? best.area;
  return `${short} scores best in ${area}: Brier ${f2(best.brier)} on ${plural(best.n_clusters, "event")}.`;
}

export function boldnessTakeaway(data: BoldnessData): string {
  const p = data.points.find((x) => x.hero) ?? data.points[0];
  if (!p) return "No forecaster has a score yet.";
  return `${p.label} sits ${f2(p.x)} from the base rate on average, at Brier ${f2(p.y)}.`;
}

export function timingTakeaway(f: ForecasterScores): string {
  const t = f.timing;
  if (t.n === 0 || t.median === null) return "No false claim has later come true.";
  return `Median miss ${plural(Math.round(t.median), "month")} late on ${plural(t.n, "claim")}.`;
}

// ---- ledgers and lanes -------------------------------------------------------------------------
/** The most recent resolved items: how many came true. */
export function recentTakeaway(items: ScoredItem[]): string {
  const resolved = items.filter((i) => i.o !== null);
  if (resolved.length === 0) return "No claim has come due yet.";
  const t = resolved.filter((i) => i.o === 1).length;
  return `${fmtInt(t)} of the last ${fmtInt(resolved.length)} came true.`;
}

export function claimsTakeaway(items: ScoredItem[]): string {
  if (items.length === 0) return "No admitted claim yet.";
  const year = Math.min(...items.map((i) => yearOf(i.first_date)));
  const resolved = items.filter((i) => i.o !== null).length;
  const pending = items.filter((i) => i.state === "pending" || i.state === "known_true" || i.state === "unresolved").length;
  return `${plural(items.length, "claim")} since ${year}; ${fmtInt(resolved)} resolved, ${fmtInt(pending)} pending.`;
}

export function lanesTakeaway(lanes: { length: number }, events: { length: number }): string {
  return `${plural(lanes.length, "claim")} against ${plural(events.length, "event")} in the field.`;
}

export function horizonTakeaway(short: string, event: string, k: number, date: string | null): string {
  const head = `${short} promised ${event} ${plural(k, "time")}`;
  return date ? `${head}; it happened on ${fmtDate(date)}.` : `${head}; it has not happened.`;
}

export function sharedTakeaway(shared: SharedEventRow[]): string {
  const n = shared.length;
  if (n === 0) return "No event has claims from more than one forecaster.";
  return `${plural(n, "event")} ${n === 1 ? "has" : "have"} claims from more than one forecaster.`;
}

export function sensitivityTakeaway(f: ForecasterScores): string {
  const base = f.sensitivity.baseline?.brier ?? null;
  if (base === null) return "The headline has no score to test yet.";
  let delta = 0;
  for (const [key, v] of Object.entries(f.sensitivity)) {
    if (key === "baseline" || v.brier === null) continue;
    delta = Math.max(delta, Math.abs(v.brier - base));
  }
  return `Other rules move the headline by at most ${f2(delta)}.`;
}

export function statusTakeaway(counts: { true: number; false: number }): string {
  const r = counts.true + counts.false;
  if (r === 0) return "No claim has come due yet.";
  return `${fmtInt(counts.true)} of ${plural(r, "resolved claim")} came true.`;
}

// ---- events ------------------------------------------------------------------------------------
export function registryTakeaway(events: Pick<EventView, "outcome">[]): string {
  const n = events.length;
  if (n === 0) return "No registry event yet.";
  const occurred = events.filter((e) => e.outcome?.state === "occurred").length;
  const open = events.filter((e) => e.outcome === null).length;
  return `${fmtInt(occurred)} of ${plural(n, "event")} have occurred; ${fmtInt(open)} are open.`;
}

export function groundTruthTakeaway(timeline: Pick<TimelineEvent, "date">[]): string {
  if (timeline.length === 0) return "No ground-truth event yet.";
  const latest = timeline.reduce((m, t) => (quarterOf(t.date) > m ? quarterOf(t.date) : m), quarterOf(timeline[0].date));
  const k = timeline.filter((t) => quarterOf(t.date) === latest).length;
  return `${plural(k, "event")} in ${periodText(latest)}.`;
}

// ---- titles and phrases ------------------------------------------------------------------------
export function reasonLabel(codes: ReasonCodeTable, code: string | null | undefined): string {
  if (!code) return "";
  return codes.not_admitted.find((r) => r.code === code)?.label ?? codes.void.find((r) => r.code === code)?.label ?? code;
}

/** H1 of a statement page: the state word, then the fact that explains it. */
export function statementTitle(detail: Pick<PredictionDetail, "statement" | "scored">, codes: ReasonCodeTable): string {
  const st = detail.statement;
  if (st.status === "not_admitted") return `${STATE_WORD.not_admitted} · ${reasonLabel(codes, st.reason_code)}`;
  if (st.status === "void") return `${STATE_WORD.void} · ${reasonLabel(codes, st.void_reason)}`;
  const sc = detail.scored;
  if (!sc) return "Admitted";
  switch (sc.state) {
    case "true":
    case "false":
      return `${STATE_WORD[sc.state]} · Brier ${f2(sc.brier)}`;
    case "known_true":
      return `${STATE_WORD.known_true} · enters ${fmtDate(sc.deadline)}`;
    case "pending":
      return `${STATE_WORD.pending} · due ${fmtDate(sc.deadline)}`;
    case "void":
      return `${STATE_WORD.void} · ${reasonLabel(codes, sc.void_reason)}`;
    default:
      return `${STATE_WORD.unresolved} · due ${fmtDate(sc.deadline)}`;
  }
}

export const COVERAGE_PHRASE: Record<Forecaster["coverage"]["tier"], string> = { A: "Full archive (tier A)", B: "Archive plus search (tier B)", C: "Ad hoc collection (tier C)" };

export function coveragePhrase(tier: Forecaster["coverage"]["tier"]): string {
  return COVERAGE_PHRASE[tier];
}

/** The first `n` parts of a role string split on ";", trimmed. "Psychiatrist; CMO, Radial; author" -> two fragments. */
export function roleParts(role: string, n = 2): string[] {
  return role
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, n);
}

/** Pipeline takeaway: coder agreement on admission. */
export function agreementTakeaway(a: { kappa: number | null; n: number }): string {
  if (a.kappa === null || a.n === 0) return "Coder agreement is not measured yet.";
  return `Coder agreement on admission: κ ${f2(a.kappa)} on ${plural(a.n, "statement")}.`;
}
