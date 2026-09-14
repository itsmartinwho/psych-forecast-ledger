// View models: from the dataset and the score snapshot to chart data and page rows. Pure; no I/O; no clock.
import type { AlmanacData, BoldnessData, BrierSeriesData, CalibrationData, HistogramData, LeaderboardData, MatrixData, RecedingHorizonData, RungBarsData, State, TickDonutData, TrendLanesData } from "@/components/charts/types";
import type { ForecasterScores, ScoreSnapshot, ScoredItem } from "@/lib/score";
import { clusterize, median } from "@/lib/score";
import { addMonths, monthsBetween, yearOf } from "@/lib/dates";
import { fmtInt } from "@/lib/format";
import type { Area, Dataset, Forecaster, Item, Outcome, Recheck, RegistryEvent, Statement, TimelineEvent } from "./schema";

export const COIN_FLIP = 0.25;

export const chartState = (s: ScoredItem["state"]): State => (s === "true" ? "true" : s === "false" ? "false" : s === "void" ? "void" : "pending");

export const STATE_WORD: Record<ScoredItem["state"] | "not_admitted", string> = { true: "True", false: "False", pending: "Pending", known_true: "Known true", void: "Void", unresolved: "Awaiting resolution", not_admitted: "Not admitted" };

/** Sort order of the states on the Statements page: true, false, known true, pending, void, not admitted. */
export const STATE_RANK: Record<ScoredItem["state"] | "not_admitted", number> = { true: 0, false: 1, known_true: 2, pending: 3, unresolved: 3, void: 4, not_admitted: 5 };

export function forecasterBySlug(ds: Dataset): Map<string, Forecaster> {
  return new Map(ds.forecasters.map((f) => [f.slug, f]));
}
export function registryById(ds: Dataset): Map<string, RegistryEvent> {
  return new Map(ds.registry.map((e) => [e.id, e]));
}
export function outcomeById(ds: Dataset): Map<string, Outcome> {
  return new Map(ds.outcomes.map((o) => [o.event_id, o]));
}

// ---- leaderboard -------------------------------------------------------------------------------
export function leaderboardData(ds: Dataset, snap: ScoreSnapshot, opts: { area?: string } = {}): LeaderboardData {
  const fby = forecasterBySlug(ds);
  const hero = ds.forecasters.find((f) => f.hero)?.slug;
  let rows = snap.leaderboard.map((r) => ({
    id: r.slug, label: r.kind === "person" ? fby.get(r.slug)?.short ?? r.name : r.name,
    value: r.brier ? r.brier.point : null, lo: r.brier?.lo, hi: r.brier?.hi, n: r.n_clusters, tier: r.tier,
    hero: r.slug === hero, reference: r.kind === "reference", note: r.note ?? undefined, href: r.kind === "person" ? `/forecasters/${r.slug}` : undefined,
  }));
  if (opts.area) {
    rows = ds.forecasters.map((f) => {
      const a = snap.forecasters[f.slug]?.by_area[opts.area!];
      return { id: f.slug, label: f.short, value: a?.brier ? a.brier.point : null, lo: a?.brier?.lo, hi: a?.brier?.hi, n: a?.n_clusters ?? 0, tier: (a && a.n_clusters >= ds.thresholds.min_clusters_headline ? (a.n_clusters >= ds.thresholds.provisional_below_clusters ? "T2" : "T1") : "T0") as LeaderboardData["rows"][number]["tier"], hero: f.slug === hero, reference: false, note: undefined as string | undefined, href: `/forecasters/${f.slug}` as string | undefined };
    });
  }
  const maxHi = Math.max(0.5, ...rows.map((r) => r.hi ?? r.value ?? 0));
  return { rows, coinFlip: COIN_FLIP, domain: [0, Math.min(1, Math.ceil(maxHi * 10) / 10)], valueLabel: "Brier" };
}

// ---- per-forecaster charts ---------------------------------------------------------------------
export function calibrationData(ds: Dataset, f: ForecasterScores, label: string): CalibrationData {
  const names = Object.fromEntries(ds.lexicon.bins.map((b) => [b.bin, b.label]));
  return { bins: f.calibration.bins.map((b) => ({ bin: b.merged_from.length > 1 ? b.merged_from.map((m) => names[m] ?? m).join(" + ") : names[b.bin] ?? b.bin, forecast: b.f, observed: b.observed, n: b.n })), label };
}

export function brierSeriesData(f: ForecasterScores, slug: string, label: string): BrierSeriesData {
  return { series: [{ id: slug, label, hero: true, points: f.over_time.map((p) => ({ period: p.period, value: p.cumulative, n: p.cumulative_n })) }], coinFlip: COIN_FLIP };
}

export function areaRungBars(ds: Dataset, f: ForecasterScores, items: ScoredItem[], heroArea?: string): RungBarsData {
  return {
    groups: ds.areas.map((a) => {
      const resolved = items.filter((i) => i.area === a.slug && i.o !== null);
      const stat = f.by_area[a.slug];
      return { id: a.slug, label: a.short ?? a.name, count: resolved.length, value: stat?.brier ? stat.brier.point : null, n: stat?.n_clusters ?? 0, hero: a.slug === heroArea, href: `/areas/${a.slug}`, faint: resolved.length === 0 };
    }),
    unit: "one rung = one resolved item", valueLabel: "Brier",
  };
}

export function almanacData(ds: Dataset, items: ScoredItem[], opts: { hero?: string; start?: string; end?: string } = {}): AlmanacData {
  const reg = registryById(ds);
  const sorted = [...items].sort((a, b) => (a.first_date < b.first_date ? -1 : a.first_date > b.first_date ? 1 : a.key < b.key ? -1 : 1));
  const rows = sorted.map((i) => ({
    id: i.statement_ids[0], date: i.first_date, deadline: i.deadline, resolved: i.o !== null ? (i.event_date && i.event_date <= i.deadline ? i.event_date : i.deadline) : undefined,
    state: chartState(i.state), p: i.p, label: reg.get(i.event_id)?.title ?? i.event_id, href: `/predictions/${i.statement_ids[0]}`, hero: i.statement_ids[0] === opts.hero, affiliated: i.affiliated,
  }));
  const start = opts.start ?? (rows.length ? rows[0].date : ds.version.as_of);
  const end = opts.end ?? rows.reduce((m, r) => (r.deadline > m ? r.deadline : m), ds.version.as_of);
  return { rows, start, end, today: ds.version.as_of };
}

export function trendLanesData(ds: Dataset, items: ScoredItem[], opts: { hero?: string; areas?: string[]; maxLanes?: number } = {}): TrendLanesData {
  const reg = registryById(ds);
  const lanes = [...items]
    .sort((a, b) => (a.first_date < b.first_date ? -1 : 1))
    .slice(0, opts.maxLanes ?? 30)
    .map((i) => ({
      id: i.key, label: reg.get(i.event_id)?.title ?? i.event_id, start: i.first_date, deadline: i.deadline,
      resolved: i.event_date && i.event_date <= i.deadline ? i.event_date : i.o !== null ? i.deadline : undefined,
      state: chartState(i.state), restatements: i.parts.map((p) => ({ date: p.date, p: p.p })), href: `/predictions/${i.statement_ids[0]}`, hero: i.statement_ids[0] === opts.hero,
    }));
  const start = lanes.length ? lanes.reduce((m, l) => (l.start < m ? l.start : m), lanes[0].start) : "2021-01-01";
  const end = lanes.reduce((m, l) => (l.deadline > m ? l.deadline : m), ds.version.as_of);
  const areas = new Set(opts.areas ?? items.map((i) => i.area));
  const events = ds.timeline.filter((t) => t.date >= start && t.date <= end && areas.has(t.area)).slice(0, 60).map((t) => ({ date: t.date, label: `${t.entity}: ${t.event.slice(0, 80)}`, kind: t.outcome_type, href: `/events#${t.id}` }));
  return { lanes, events, start, end, today: ds.version.as_of };
}

export function statusDonut(counts: ScoreSnapshot["status"][string], opts: { includeNotAdmitted?: boolean } = {}): TickDonutData {
  const segments = ([
    { id: "true", label: "true", count: counts.true, tone: "ink" },
    { id: "false", label: "false", count: counts.false, tone: "gray-2" },
    { id: "known_true", label: "known true", count: counts.known_true, tone: "gray-3" },
    { id: "pending", label: "pending", count: counts.pending + counts.unresolved, tone: "muted" },
    { id: "void", label: "void", count: counts.void, tone: "faint" },
    ...(opts.includeNotAdmitted ? [{ id: "not_admitted", label: "not admitted", count: counts.not_admitted, tone: "gray-7" }] : []),
  ] as TickDonutData["segments"]).filter((s) => s.count > 0);
  const total = segments.reduce((s, x) => s + x.count, 0);
  return { segments, total, centerLabel: fmtInt(total), unit: opts.includeNotAdmitted ? "statements" : "items" };
}

// ---- admission and reasons ---------------------------------------------------------------------
/** Rung bar data with the count each rung stands for. */
export type RungBarsWithUnit = RungBarsData & { rungUnit: number };

const RUNG_UNITS = [1, 5, 10, 25, 50, 100] as const;
const RUNGS_MAX = 60;

/** The smallest rung unit that keeps the longest ladder at 60 rungs or fewer. */
export function rungUnitFor(max: number): number {
  return RUNG_UNITS.find((u) => Math.ceil(max / u) <= RUNGS_MAX) ?? RUNG_UNITS[RUNG_UNITS.length - 1];
}

/** Found, sincere, admitted (including void) and resolved: the census as four ladders. */
export function admissionFunnel(ds: Dataset, snap: ScoreSnapshot, slug?: string): RungBarsWithUnit {
  const statements = slug ? ds.statements.filter((s) => s.forecaster === slug) : ds.statements;
  const forecasters = slug ? ds.forecasters.filter((f) => f.slug === slug) : ds.forecasters;
  const found = statements.length;
  const sincere = forecasters.reduce((n, f) => n + (snap.forecasters[f.slug]?.composition.sincere ?? 0), 0);
  const admitted = statements.filter((s) => s.status !== "not_admitted").length;
  const resolved = snap.items.filter((i) => i.o !== null && (!slug || i.forecaster === slug)).length;
  return {
    groups: [
      { id: "found", label: "Found", count: found },
      { id: "sincere", label: "Sincere", count: sincere },
      { id: "admitted", label: "Admitted", count: admitted, hero: true },
      { id: "resolved", label: "Resolved", count: resolved },
    ],
    unit: "statements", rungUnit: rungUnitFor(found),
  };
}

/** Not-admitted statements by reason code, largest first, each linked to the filtered Statements page. */
export function reasonRungBars(ds: Dataset, slug?: string): RungBarsWithUnit {
  const statements = ds.statements.filter((s) => s.status === "not_admitted" && (!slug || s.forecaster === slug));
  const counts = new Map<string, number>();
  for (const s of statements) if (s.reason_code) counts.set(s.reason_code, (counts.get(s.reason_code) ?? 0) + 1);
  const order: string[] = ds.reason_codes.not_admitted.map((r) => r.code);
  const labels = new Map<string, string>(ds.reason_codes.not_admitted.map((r) => [r.code, r.label]));
  const groups = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([code, count]) => ({ id: code, label: labels.get(code) ?? code, count, href: `/predictions?scope=not&r=${code}${slug ? `&f=${slug}` : ""}` }));
  const max = groups.reduce((m, g) => Math.max(m, g.count), 0);
  return { groups, unit: "statements", rungUnit: rungUnitFor(max) };
}

export function boldnessData(ds: Dataset, snap: ScoreSnapshot): BoldnessData {
  const hero = ds.forecasters.find((f) => f.hero)?.slug;
  const points = ds.forecasters.flatMap((f) => {
    const s = snap.forecasters[f.slug];
    const y = s.headline.brier?.point ?? null;
    const x = s.boldness.mean_abs_p_minus_b ?? s.boldness.mean_abs_p_minus_half;
    if (y === null || x === null) return [];
    return [{ id: f.slug, label: f.short, x, y, n: s.headline.n_clusters, hero: f.slug === hero }];
  });
  return { points, xLabel: "mean distance of p from the base rate", yLabel: "Brier", yRule: COIN_FLIP, xDomain: [0, 0.6], yDomain: [0, 0.6] };
}

export function timingHistogram(f: ForecasterScores): HistogramData {
  const edges = [-12, -6, -3, 0, 3, 6, 12, 24];
  const bins: HistogramData["bins"] = [];
  const v = f.timing.values.map((x) => x.months);
  bins.push({ lo: -Infinity, hi: edges[0], count: v.filter((m) => m < edges[0]).length, label: "earlier" });
  for (let i = 0; i < edges.length - 1; i++) bins.push({ lo: edges[i], hi: edges[i + 1], count: v.filter((m) => m >= edges[i] && m < edges[i + 1]).length });
  bins.push({ lo: edges[edges.length - 1], hi: Infinity, count: v.filter((m) => m >= edges[edges.length - 1]).length, label: "later" });
  return { bins, median: median(v) ?? undefined, unit: "months after the deadline", zeroLabel: "deadline", rungUnit: "one rung = one item" };
}

export function matrixData(ds: Dataset, snap: ScoreSnapshot): MatrixData {
  const cells = snap.matrix.map((c) => ({ row: c.forecaster, col: c.area, value: c.brier, n: c.n_clusters }));
  const shown = cells.filter((c) => c.value !== null);
  const best = shown.length ? shown.reduce((m, c) => (c.value! < m.value! ? c : m), shown[0]) : null;
  return {
    rows: ds.forecasters.map((f) => ({ id: f.slug, label: f.short, href: `/forecasters/${f.slug}` })),
    cols: ds.areas.map((a) => ({ id: a.slug, label: a.name, short: a.short, href: `/areas/${a.slug}` })),
    cells: cells.map((c) => ({ ...c, best: best ? c.row === best.row && c.col === best.col : false })),
    steps: 5, valueLabel: "Brier",
  };
}

export function recedingHorizon(ds: Dataset, clusterItems: ScoredItem[], label: string): RecedingHorizonData | null {
  const points = clusterItems.flatMap((i) => i.parts.map((p) => ({ statementDate: p.date, predictedDate: i.deadline, p: p.p, label: `${label} · by ${i.deadline}`, href: `/predictions/${p.id}` })));
  if (new Set(points.map((p) => p.predictedDate)).size < 2) return null;
  const outcome = outcomeById(ds).get(clusterItems[0].event_id);
  return { points: points.sort((a, b) => (a.statementDate < b.statementDate ? -1 : 1)), actualDate: outcome?.state === "occurred" ? outcome.date ?? undefined : undefined, today: ds.version.as_of, label };
}

// ---- ledger rows ------------------------------------------------------------------------------
export type LedgerState = ScoredItem["state"] | "not_admitted";
/** One Statements row. b = Brier; rl = reason label; kt = known-true deadline or ""; sr = state rank. */
export interface LedgerRow { id: string; f: string; fn: string; d: string; y: number; a: string; s: LedgerState; r: string; rl: string; p: number | null; b: number | null; pn: "dated" | "undated" | ""; dl: string; kt: string; sr: number; t: string; e: string; q: string }

export function ledgerRows(ds: Dataset, snap: ScoreSnapshot): LedgerRow[] {
  const reg = registryById(ds);
  const fby = forecasterBySlug(ds);
  const items = new Map(ds.items.map((i) => [i.id, i]));
  const scoredByStatement = new Map<string, ScoredItem>();
  for (const s of snap.items) for (const id of s.statement_ids) scoredByStatement.set(id, s);
  const labels = new Map([...ds.reason_codes.not_admitted, ...ds.reason_codes.void].map((r) => [r.code as string, r.label]));
  return ds.statements
    .map((st) => {
      const it = items.get(st.id);
      const sc = scoredByStatement.get(st.id);
      const s = (st.status === "admitted" ? (sc?.state ?? "pending") : st.status === "void" ? "void" : "not_admitted") as LedgerState;
      const r = st.reason_code ?? st.void_reason ?? (sc?.void_reason ?? "");
      const dl = sc ? sc.deadline : it?.deadline ?? "";
      return {
        id: st.id, f: st.forecaster, fn: fby.get(st.forecaster)?.short ?? st.forecaster, d: st.statement_date, y: yearOf(st.statement_date),
        a: it?.area ?? "", s, r, rl: labels.get(r) ?? r, p: it ? it.p : null, b: sc?.brier ?? null, pn: (it ? it.panel : "") as LedgerRow["pn"], dl,
        kt: s === "known_true" ? dl : "", sr: STATE_RANK[s],
        t: it ? reg.get(it.event_id)?.title ?? it.event_id : "", e: it?.event_id ?? "", q: st.quote.length > 140 ? st.quote.slice(0, 137).replace(/\s+\S*$/, "") + "..." : st.quote,
      };
    })
    .sort((a, b) => (a.d > b.d ? -1 : a.d < b.d ? 1 : a.id < b.id ? -1 : 1));
}

// ---- detail views -----------------------------------------------------------------------------
export interface PredictionDetail {
  statement: Statement; forecaster: Forecaster; item: Item | null; scored: ScoredItem | null; event: RegistryEvent | null; condition: RegistryEvent | null;
  outcome: Outcome | null; rechecks: Recheck[]; cluster: ScoredItem[]; coderB: Dataset["coder_b"][number] | null; prev: string | null; next: string | null; timeline: TimelineEvent[];
}

export function predictionDetail(ds: Dataset, snap: ScoreSnapshot, id: string): PredictionDetail | null {
  const st = ds.statements.find((s) => s.id === id);
  if (!st) return null;
  const forecaster = forecasterBySlug(ds).get(st.forecaster)!;
  const item = ds.items.find((i) => i.id === id) ?? null;
  const scored = snap.items.find((s) => s.statement_ids.includes(id)) ?? null;
  const reg = registryById(ds);
  const event = item ? reg.get(item.event_id) ?? null : null;
  const condition = item?.condition_event_id ? reg.get(item.condition_event_id) ?? null : null;
  const outcome = item ? outcomeById(ds).get(item.event_id) ?? null : null;
  const rechecks = item ? ds.rechecks.filter((r) => r.event_id === item.event_id) : [];
  const cluster = item ? snap.items.filter((s) => s.forecaster === st.forecaster && s.event_id === item.event_id) : [];
  const coderB = ds.coder_b.find((b) => b.id === id) ?? null;
  const siblings = ds.statements.filter((s) => s.forecaster === st.forecaster).sort((a, b) => (a.statement_date < b.statement_date ? -1 : a.statement_date > b.statement_date ? 1 : a.id < b.id ? -1 : 1));
  const idx = siblings.findIndex((s) => s.id === id);
  const timeline = event ? ds.timeline.filter((t) => t.registry_event_ids.includes(event.id)) : [];
  return { statement: st, forecaster, item, scored, event, condition, outcome, rechecks, cluster, coderB, prev: idx > 0 ? siblings[idx - 1].id : null, next: idx < siblings.length - 1 ? siblings[idx + 1].id : null, timeline };
}

export interface ForecasterView {
  forecaster: Forecaster; scores: ForecasterScores; items: ScoredItem[]; dated: ScoredItem[]; undated: ScoredItem[];
  clusters: ReturnType<typeof clusterize>; commitments: Statement[]; reports: Statement[]; notAdmitted: Record<string, Statement[]>; voids: Statement[];
  statements: Statement[];
}
export function forecasterView(ds: Dataset, snap: ScoreSnapshot, slug: string): ForecasterView | null {
  const forecaster = forecasterBySlug(ds).get(slug);
  if (!forecaster) return null;
  const items = snap.items.filter((i) => i.forecaster === slug);
  const statements = ds.statements.filter((s) => s.forecaster === slug);
  const notAdmitted: Record<string, Statement[]> = {};
  for (const s of statements) if (s.status === "not_admitted" && s.reason_code) (notAdmitted[s.reason_code] ??= []).push(s);
  return {
    forecaster, scores: snap.forecasters[slug], items, dated: items.filter((i) => i.panel === "dated"), undated: items.filter((i) => i.panel === "undated"),
    clusters: clusterize(items), commitments: notAdmitted.CONTROL ?? [], reports: notAdmitted.REPORT ?? [], notAdmitted, voids: statements.filter((s) => s.status === "void"), statements,
  };
}

export interface EventView { event: RegistryEvent; outcome: Outcome | null; items: ScoredItem[]; statements: Statement[]; timeline: TimelineEvent[]; rechecks: Recheck[] }
export function eventViews(ds: Dataset, snap: ScoreSnapshot): EventView[] {
  const outcomes = outcomeById(ds);
  const byStatement = new Map(ds.statements.map((s) => [s.id, s]));
  return ds.registry.map((e) => {
    const items = snap.items.filter((i) => i.event_id === e.id);
    return { event: e, outcome: outcomes.get(e.id) ?? null, items, statements: items.flatMap((i) => i.statement_ids.map((id) => byStatement.get(id)!).filter(Boolean)), timeline: ds.timeline.filter((t) => t.registry_event_ids.includes(e.id)), rechecks: ds.rechecks.filter((r) => r.event_id === e.id) };
  });
}

/** Status counts of the items in one area, in the shape of snap.status. */
export function areaStatusCounts(snap: ScoreSnapshot, area: string): ScoreSnapshot["status"][string] {
  const items = snap.items.filter((i) => i.area === area);
  const n = (state: ScoredItem["state"]) => items.filter((i) => i.state === state).length;
  return { true: n("true"), false: n("false"), pending: n("pending"), known_true: n("known_true"), void: n("void"), unresolved: n("unresolved"), not_admitted: 0, undated: items.filter((i) => i.panel === "undated").length };
}

/** One Sensitivity row: a short variant name, the Brier (null below the minimum) and the cluster count. */
export interface SensitivityRow { id: string; name: string; note: string; brier: number | null; n: number }

/** The sensitivity panel as table rows with short names. Variant names come from the lexicon maps. */
export function sensitivityRows(ds: Dataset, f: ForecasterScores): SensitivityRow[] {
  const maps = ds.lexicon.sensitivity_maps;
  const mapName = (key: string): string => {
    const m = maps[key];
    if (!m) return key;
    const vals = Object.values(m);
    if (key === "kent") return "Kent words";
    if (new Set(vals.filter((v) => v !== 0.5)).size === 1 || (m.A === m.B && m.D === m.E)) return `Flat ${m.A.toFixed(2)}`;
    return `Lexicon ends ${m.A.toFixed(2)}/${m.E.toFixed(2)}`;
  };
  const names: Record<string, string> = {
    baseline: "Headline",
    dated_only: "Dated items only",
    non_affiliated: "Non-affiliated only",
    prospective_only: "Prospective only",
    undated_36: `Undated ${ds.thresholds.undated_sensitivity_months} months`,
  };
  return Object.entries(f.sensitivity).map(([id, r]) => ({ id, name: names[id] ?? (id.startsWith("map_") ? mapName(id.slice(4)) : id), note: r.note, brier: r.brier, n: r.n_clusters }));
}

export function areaOf(ds: Dataset, slug: string): Area | undefined {
  return ds.areas.find((a) => a.slug === slug);
}

export function undatedDeadline(ds: Dataset, statementDate: string): string {
  return addMonths(statementDate, ds.thresholds.undated_window_months);
}

export function leadMonths(item: Item): number | null {
  return item.deadline ? monthsBetween(item.statement_date, item.deadline) : null;
}
