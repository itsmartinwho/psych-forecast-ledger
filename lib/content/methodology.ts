// Methodology page content as typed data. Every table that mirrors a rule file is generated from
// data/rules/*.json, so the page cannot drift from the rules in force. Pure: no clock, no
// randomness, no I/O. Live numbers (coder agreement, sensitivity panel) arrive as props with a
// "not yet published" default until the scoring pipeline exports them.
import { Anchors, BaseRateTable, Lexicon, ReasonCodes, Templates, Version, type Bin } from "@/lib/data/schema";
import anchorsJson from "@/data/rules/anchors.json";
import baseRatesJson from "@/data/rules/base-rates.json";
import lexiconJson from "@/data/rules/lexicon.json";
import reasonCodesJson from "@/data/rules/reason-codes.json";
import templatesJson from "@/data/rules/templates.json";
import thresholdsJson from "@/data/rules/thresholds.json";
import versionJson from "@/data/rules/version.json";

// The rule files are parsed with the shared schemas so a malformed file fails the build, not the reader.
const lexicon = Lexicon.parse(lexiconJson);
const anchors = Anchors.parse(anchorsJson);
const templates = Templates.parse(templatesJson);
const reasonCodes = ReasonCodes.parse(reasonCodesJson);
const baseRates = BaseRateTable.parse(baseRatesJson);
export const RULES_VERSION = Version.parse(versionJson);
/** Thresholds as written in data/rules/thresholds.json (the keys the scoring rules name). */
export const THRESHOLDS = thresholdsJson;

export const COIN_FLIP = 0.25;

// ---- live numbers (injected later) -----------------------------------------------------------
export const NOT_YET_PUBLISHED = "not yet published" as const;
export type NotYetPublished = typeof NOT_YET_PUBLISHED;

/** Coder agreement from the match test (lib/score/kappa.ts), one value per independently coded field. */
export interface KappaLive {
  n_pairs: number;
  admit: number | null;
  event: number | null;
  deadline: number | null;
  bin: number | null;
  asserts: number | null;
  note?: string;
}

export type SensitivityId = "ends_085_015" | "kent" | "flat_075" | "non_affiliated" | "prospective_only" | "undated_pooled" | "loo_max_change";

/** One person's sensitivity panel: the headline mean Brier recomputed under each variant. */
export interface SensitivityLive {
  forecaster: string;
  label: string;
  headline: number | null;
  n_clusters: number;
  rows: { id: SensitivityId; value: number | null; n_clusters: number }[];
}

/** The prefilter audit: coder B re-read a seeded sample of the statements the census finder set aside. */
export interface PrefilterLive { sample_size: number; sample_admitted: number; rejects_total: number; to_code_total: number; estimated_missed: number }

export interface LiveNumbers {
  kappa: KappaLive | NotYetPublished;
  sensitivity: SensitivityLive[] | NotYetPublished;
  prefilter: PrefilterLive | NotYetPublished;
}

export const DEFAULT_LIVE: LiveNumbers = { kappa: NOT_YET_PUBLISHED, sensitivity: NOT_YET_PUBLISHED, prefilter: NOT_YET_PUBLISHED };

// ---- content types ---------------------------------------------------------------------------
export interface Rule { id: string; group: "intake" | "scoring" | "reporting"; rule: string; rationale: string }
export interface LexiconRow { bin: Bin; p: number; label: string; phrases: string[] }
export interface SensitivityMapRow { id: string; values: Record<Bin, number> }
export interface AnchorRow { pattern: string; deadline: string; origin: string; tag: string | null; note: string | null }
export interface QuantityRule { id: string; rule: string }
export interface ReasonRow { code: string; label: string; test: string }
export interface TagRow { tag: string; test: string }
export interface TemplateRow { template: string; proposition: string; criterion: string; source: string }
export interface ReferenceRow { id: "base-rate" | "market" | "coin-flip"; label: string; how: string; min_n: number | null }
export interface BaseRateClassRow { cls: string; label: string; p: number | null; median_months: number | null; source: string; source_url: string | null }
export interface Metric { id: string; name: string; formula: string; min_n: number | null; min_n_source: string; unit: string; note: string }
export interface EvidenceTier { tier: "T0" | "T1" | "T2"; label: string; range: string; shown: string }
export interface CoverageTier { tier: "A" | "B" | "C"; label: string; definition: string }
export interface Control { id: string; control: string; where: string }
export interface SensitivityVariant { id: SensitivityId; label: string; how: string }
export interface ExampleStep { step: string; detail: string }
export interface WorkedExample {
  id: string;
  title: string;
  person: string;
  quote: string;
  source: string;
  statement_date: string;
  steps: ExampleStep[];
  table: { columns: string[]; rows: string[][] };
  result: string;
}
export interface Limit { id: string; limit: string; effect: string }
export interface CorrectionRow { date: string; scope: string; change: string; reason: string; version_from: string; version_to: string }
export interface VersionRow { version: string; date: string; as_of: string; note: string }

// ---- formatting and arithmetic helpers (kept local so this module depends on rule files only) ----
/** Squared gap between a probability and a binary outcome; the same formula as lib/score/brier.ts. */
const brier = (p: number, o: 0 | 1): number => (p - o) ** 2;
const mean = (xs: number[]): number | null => (xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length);
export const fmt2 = (x: number): string => x.toFixed(2);
export const fmt3 = (x: number): string => x.toFixed(3);

// ---- headline ---------------------------------------------------------------------------------
export const HEADLINE_PARAGRAPH =
  "Each person's number is a Brier score, computed only on predictions that named a deadline and could be checked against a public source we named before we looked. Each prediction becomes a probability that the event happens by the deadline: the number the person gave, or, when they used words, a fixed table (will = 0.90, probably = 0.70, may = 0.50, unlikely = 0.30, never = 0.10). When the deadline passes, we record 1 if the event happened and 0 if it did not. The score for one prediction is the squared gap between the probability and the outcome: a confident claim that comes true scores 0.01, a confident claim that fails scores 0.81, and 'may' always scores 0.25. A person who predicted the same event several times gets one vote for that event. The headline is the average over events: 0 is perfect, 0.25 is a coin flip, 1 is confidently wrong every time. The range next to it shows how much the number could move if we redrew the events at random; we do not rank two people whose ranges overlap. Beside it we show what the published base rate would have scored on the same events, how often the person was simply on the right side, and the share of their claims that were too vague or undated to check. Plans for the person's own company and inside tips are not counted. Every line links to the quote, the source, the rule we wrote before checking, and the evidence.";

// ---- rules -------------------------------------------------------------------------------------
const T = THRESHOLDS;

export const RULES: Rule[] = [
  { id: "R1", group: "intake", rule: "We read the person's own archive in full first, then search the rest with fixed search strings.", rationale: "A fixed corpus stops us from picking the claims we happen to remember." },
  { id: "R2", group: "intake", rule: "A statement enters only if it is sincere, the person's own claim, forward-looking, and inside the five areas.", rationale: "Jokes, reports, and other people's claims are not forecasts." },
  { id: "R3", group: "intake", rule: "Plans for the person's own company (CONTROL) and inside tips (REPORT) are listed but never scored.", rationale: "A person should not be scored on what they can decide or already know." },
  { id: "R4", group: "intake", rule: "Every event is written from one of eight templates, on the asset, with a named public source, before we look at the outcome.", rationale: "A criterion written after the outcome bends toward it." },
  { id: "R5", group: "intake", rule: "'A and B' splits into two events; 'A or B' is one event.", rationale: "One vote per event keeps a double claim from counting once." },
  { id: "R6", group: "intake", rule: "Only the person's words, read through the anchor table, set a deadline; the coder never invents a date.", rationale: "An invented deadline is the coder's forecast, not the person's." },
  { id: "R7", group: "intake", rule: `A claim with no deadline goes to the undated panel with one uniform window of ${T.undated_window_months} months from the statement date.`, rationale: "Undated claims are scored apart so a soft 'soon' cannot pad or drain the headline." },
  { id: "R8", group: "intake", rule: "A stated number is the probability; a phrase maps to the five-bin lexicon; a denial takes 1 minus the bin value.", rationale: "The same word gets the same number for everyone." },
  { id: "R9", group: "intake", rule: "The strongest phrase in the claim sentence decides the bin; coders never read tone.", rationale: "Tone is where hindsight leaks in." },
  { id: "R10", group: "intake", rule: "A base rate is fixed at intake from an external table by event class and stage; it is halved when the window is shorter than the class median time to decision; with no class there is no base rate.", rationale: "We never learn a base rate from the items we score." },
  { id: "R11", group: "scoring", rule: "An item is scored only when its deadline is on or before the as-of date and the outcome is true or false.", rationale: "A claim that is already true but not yet due is still open to a change of criterion." },
  { id: "R12", group: "scoring", rule: "Outcome is 1 if the event happened by the deadline, else 0; the item score is (p minus outcome) squared.", rationale: "The Brier score rewards confidence only when it is right." },
  { id: "R13", group: "scoring", rule: "All of one person's items on one event form one cluster; the cluster score is the mean of its scored items; every metric counts a cluster as one observation.", rationale: "Repeating a claim six times is not six pieces of evidence." },
  { id: "R14", group: "scoring", rule: "The headline panel and the undated panel are never pooled.", rationale: "Different windows are different questions." },
  { id: "R15", group: "scoring", rule: "Void and pending items are never scored; a void reason is logged on the item.", rationale: "An unscored item stays visible so the reader can count what was left out." },
  { id: "R16", group: "scoring", rule: `The base rate and the market are scored on the same clusters as the person, with their own probability in place of p; the coin flip is the constant ${fmt2(COIN_FLIP)}, not a row.`, rationale: "A score means little without a reference on the same events." },
  { id: "R17", group: "scoring", rule: "Two people are ranked only when both are at least T1, share a coverage tier, and their intervals do not overlap.", rationale: "A rank that the data cannot support is a false claim." },
  { id: "R18", group: "reporting", rule: `Below ${T.min_clusters_headline} resolved clusters we show counts only; from ${T.min_clusters_headline} to ${T.provisional_below_clusters - 1} the score is provisional; from ${T.provisional_below_clusters} it is full.`, rationale: "A mean of six items is a story, not a score." },
  { id: "R19", group: "reporting", rule: "Items on an entity where the person has a disclosed role are scored and flagged; the headline is shown with and without them.", rationale: "The reader decides how much an insider's call is worth." },
  { id: "R20", group: "reporting", rule: "Intake files carry no outcome fields; the resolver never sees p; release files are hashed before scoring.", rationale: "Blindness has to be structural, not a promise." },
  { id: "R21", group: "reporting", rule: "A rule change re-scores everyone, bumps the rules version, and is logged in the corrections log.", rationale: "A number that changed without a log is a number nobody can check." },
];

// ---- lexicon -----------------------------------------------------------------------------------
export const LEXICON_ROWS: LexiconRow[] = lexicon.bins.map((b) => ({ bin: b.bin, p: b.p, label: b.label, phrases: b.phrases }));
export const LEXICON_NOTE = lexicon.note;
export const LEXICON_SOURCES = lexicon.sources;
export const LEXICON_VERSION = lexicon.version;
export const SENSITIVITY_MAPS: SensitivityMapRow[] = Object.entries(lexicon.sensitivity_maps).map(([id, values]) => ({ id, values }));
export const BIN_VALUES: Record<Bin, number> = Object.fromEntries(lexicon.bins.map((b) => [b.bin, b.p])) as Record<Bin, number>;

// ---- anchors -----------------------------------------------------------------------------------
export const ANCHOR_ROWS: AnchorRow[] = anchors.rules.map((r) => ({
  pattern: r.pattern,
  deadline: r.deadline ?? "none",
  origin: r.origin ?? "undated panel",
  tag: r.tag ?? null,
  note: r.note ?? null,
}));
export const ANCHORS_NOTE = anchors.note;
export const ANCHORS_VERSION = anchors.version;

// ---- quantities ----------------------------------------------------------------------------
const quantityTemplate = templates.templates.find((t) => t.template === "quantity_threshold");
export const QUANTITY_RULES: QuantityRule[] = [
  { id: "Q1", rule: "A quantity claim resolves on the named public series only; no substitute series is accepted." },
  { id: "Q2", rule: "A direction claim ('more', 'fewer', 'up', 'down') resolves as a binary at the threshold in the person's words." },
  { id: "Q3", rule: `A bare point number takes a fixed band of plus or minus ${T.point_band_pct} percent; inside the band is true.` },
  { id: "Q4", rule: "A range takes its endpoints; 'at least x' resolves at x; 'about x' takes the band of Q3." },
  { id: "Q5", rule: "If the series has not published 12 months after the deadline, the event is unresolvable and the item is void." },
  { id: "Q6", rule: "Realized values are stored on the outcome and shown; they are never scored as a distance." },
];
export const QUANTITY_CRITERION = quantityTemplate?.criterion ?? "";

// ---- exclusions ----------------------------------------------------------------------------
export const NOT_ADMITTED_ROWS: ReasonRow[] = reasonCodes.not_admitted.map((r) => ({ code: r.code, label: r.label, test: r.test }));
export const VOID_ROWS: ReasonRow[] = reasonCodes.void.map((r) => ({ code: r.code, label: r.label, test: r.test }));
export const TAG_ROWS: TagRow[] = reasonCodes.tags.map((t) => ({ tag: t.tag, test: t.test }));
export const REASON_CODES_VERSION = reasonCodes.version;

// ---- templates -------------------------------------------------------------------------------
export const TEMPLATE_ROWS: TemplateRow[] = templates.templates.map((t) => ({ template: t.template, proposition: t.proposition, criterion: t.criterion, source: t.source }));
export const TEMPLATES_NOTE = templates.note;
export const TEMPLATES_VERSION = templates.version;

// ---- reference rows and the halving rule -------------------------------------------------------
export const REFERENCE_ROWS: ReferenceRow[] = [
  { id: "base-rate", label: "Base rate", how: "Mean over resolved clusters, all persons pooled, of the cluster score computed with the base rate in place of p; only clusters where every item carries a base rate.", min_n: T.min_clusters_headline },
  { id: "market", label: "Market", how: `Same as the base rate with the market price in place of p: the last quote up to ${T.market_lookback_days} days before the statement, on a public question whose deadline is within one quarter of the item's.`, min_n: T.market_min_clusters },
  { id: "coin-flip", label: "Coin flip", how: `Not a row. The constant ${fmt2(COIN_FLIP)} is drawn as a reference line: the score of 0.50 on every item.`, min_n: null },
];
export const HALVING_RULE = baseRates.note;
export const BASE_RATE_CLASSES: BaseRateClassRow[] = baseRates.classes.map((c) => ({ cls: c.class, label: c.label, p: c.p, median_months: c.median_months, source: c.source, source_url: c.source_url }));
export const BASE_RATES_VERSION = baseRates.version;

// ---- metrics -------------------------------------------------------------------------------
export const METRICS: Metric[] = [
  {
    id: "M1", name: "Mean Brier (headline)",
    formula: "B_c = mean over scored items i in cluster c of (p_i - o_i)^2. B = mean over resolved clusters c of B_c.",
    min_n: T.min_clusters_headline, min_n_source: "min_clusters_headline", unit: "0 perfect · 0.25 coin flip · 1 confidently wrong",
    note: `Also per area (null below ${T.min_clusters_headline} clusters in the area) and as a cumulative mean by calendar quarter, clusters ordered by resolution date.`,
  },
  {
    id: "M2", name: "Interval and stability",
    formula: `Interval = percentile 2.5 and 97.5 of B over ${T.bootstrap_resamples} resamples of clusters with replacement (mulberry32, seed ${T.bootstrap_seed}, clusters sorted by id first). LOO = max over clusters of |B without c - B|.`,
    min_n: T.min_clusters_headline, min_n_source: "min_clusters_headline", unit: "Brier points",
    note: "The same resample indices serve M4 and M5, so a ratio is bootstrapped jointly with its parts.",
  },
  {
    id: "M3", name: "Hit rate",
    formula: "hit_i = 1 if (p > 0.5 and o = 1) or (p < 0.5 and o = 0), else 0; items with p = 0.5 are excluded. H_c = mean of hit_i in c. H = mean over contributing clusters. Wilson 95 percent interval with n = contributing clusters.",
    min_n: T.min_clusters_headline, min_n_source: "min_clusters_headline", unit: "share of clusters on the right side",
    note: "Hit rate ignores how confident the person was; M1 does not.",
  },
  {
    id: "M4", name: "Base-rate skill (paired)",
    formula: "S_b = clusters whose items all carry a base rate b. BS_b = mean over S_b of the cluster mean of (b_i - o_i)^2. BSS_base = 1 - B(S_b) / BS_b. Interval from the M2 resamples restricted to S_b.",
    min_n: T.min_clusters_headline, min_n_source: "min_clusters_headline", unit: "positive beats the base rate · 0 equals it",
    note: "Reported with n = |S_b| and BS_b as the difficulty of the paired set.",
  },
  {
    id: "M5", name: "Market skill (paired)",
    formula: "As M4 with the market price m_i in place of b_i, on S_m = clusters whose items all carry a market price.",
    min_n: T.market_min_clusters, min_n_source: "market_min_clusters", unit: "positive beats the market",
    note: "Markets are thin in this field; n is usually small.",
  },
  {
    id: "M6", name: "Calibration by bin",
    formula: `Items with a stated or registered p go to the nearest bin. Per bin: forecast = bin p; observed = weighted mean of o with item weight 1 / (items in its cluster); n = clusters touching the bin. A bin with n < ${T.calibration_min_per_bin} merges into its neighbour toward 0.50.`,
    min_n: T.calibration_min_clusters, min_n_source: "calibration_min_clusters", unit: "observed share of true outcomes per bin",
    note: "A cluster contributes one unit across the bins it touches.",
  },
  {
    id: "M7", name: "Murphy decomposition",
    formula: "B = REL - RES + UNC over the M6 bins and weights. REL = sum_k w_k (f_k - obs_k)^2. RES = sum_k w_k (obs_k - obs_bar)^2. UNC = obs_bar (1 - obs_bar).",
    min_n: T.murphy_min_clusters, min_n_source: "murphy_min_clusters", unit: "Brier points",
    note: "REL is how far the words were from the truth; RES is how much the words sorted outcomes; UNC is how hard the events were.",
  },
  {
    id: "M8", name: "Non-affiliated block",
    formula: "M1 to M3 recomputed on clusters where no item carries the affiliated flag.",
    min_n: T.min_clusters_headline, min_n_source: "min_clusters_headline (both sides)", unit: "as M1 to M3",
    note: "Null unless the affiliated side and the non-affiliated side each have at least the minimum number of clusters.",
  },
  {
    id: "M9", name: "Composition",
    formula: "scoreable share = admitted headline items / sincere statements (Wilson, n = sincere). undated share = undated items / admitted. affiliated share = affiliated items / admitted. extreme share = items in bin A or E, or stated p >= 0.85 or <= 0.15, / admitted. concentration = max over events of scored items on that event / all scored items. median lead = median months from statement date to deadline over headline items. max re-dating = max distinct deadlines in one cluster. prospective share = clusters whose items all carry the prospective flag / resolved clusters. Not-admitted counts by reason code.",
    min_n: null, min_n_source: "none (counts)", unit: "shares and counts",
    note: "Composition tells the reader what the score is made of before they read it.",
  },
  {
    id: "M10", name: "Timing",
    formula: "For scored items with state false and a recorded outcome date: months(outcome date) - months(deadline). Median, first and third quartile, n.",
    min_n: null, min_n_source: "none (reported with n)", unit: "months late",
    note: "A right call that came late scores as a miss in M1; M10 shows by how much.",
  },
  {
    id: "M11", name: "Shared events and paired comparison",
    formula: "For every registry event with items from two or more people: each person's deadline, p, state, and cluster score. For a pair (a, b): d_j = B_a,j - B_b,j over shared resolved events j; mean d with a bootstrap interval over events; counts of d < 0, d = 0, d > 0.",
    min_n: T.shared_event_min, min_n_source: "shared_event_min", unit: "Brier points, negative favours a",
    note: "The only comparison that holds the events fixed between two people.",
  },
];

// ---- tiers ---------------------------------------------------------------------------------
export const EVIDENCE_TIERS: EvidenceTier[] = [
  { tier: "T0", label: "counts only", range: `fewer than ${T.min_clusters_headline} resolved clusters`, shown: "counts of true, false, pending, void; no Brier score, no interval, no rank" },
  { tier: "T1", label: "provisional", range: `${T.min_clusters_headline} to ${T.provisional_below_clusters - 1} resolved clusters`, shown: "score and interval, marked provisional; can be ranked against another T1 or T2 person in the same coverage tier when intervals do not overlap" },
  { tier: "T2", label: "full", range: `${T.provisional_below_clusters} or more resolved clusters`, shown: "score, interval, calibration and decomposition when their own minimums are met" },
];

export const COVERAGE_TIERS: CoverageTier[] = [
  { tier: "A", label: "complete archive", definition: "Every item in the person's own channel was read in full; a coverage file lists the posts that were missing or stubs." },
  { tier: "B", label: "archive plus search", definition: "The person's own channel was read in full and secondary sources were added with fixed search strings; secondary coverage is not complete." },
  { tier: "C", label: "search-built", definition: "No complete archive exists; items come from fixed search strings, transcripts and press quotes. The absence of a claim is not evidence." },
];
export const COVERAGE_RANK_NOTE = "A rank is shown only between people in the same coverage tier. A C-tier corpus under-counts claims, and the missing claims are not random.";

// ---- hindsight controls ---------------------------------------------------------------------
export const HINDSIGHT_CONTROLS: Control[] = [
  { id: "H1", control: "Stage files: statements and items carry no outcome fields, so a coder cannot see an outcome while coding.", where: "lib/data/schema.ts (Statement, Item)" },
  { id: "H2", control: "Registry before look: the event proposition, criterion, source and readings are written at intake and versioned.", where: "data/rules/templates.json; registry event fields created_at, version" },
  { id: "H3", control: "Blind resolver: the resolver pass writes the outcome and its evidence without seeing p or the person's words.", where: "Outcome records (resolver, evidence, checked_through)" },
  { id: "H4", control: "Anchor table: a deadline comes only from the person's words; 'soon' and 'eventually' send the item to the undated panel.", where: "data/rules/anchors.json" },
  { id: "H5", control: "Lexicon: the strongest phrase decides the bin; tone, context and later posts are never read into p.", where: "data/rules/lexicon.json" },
  { id: "H6", control: "KNOWN code: a statement made after the deciding body announced the outcome is not admitted.", where: "data/rules/reason-codes.json" },
  { id: "H7", control: "Freeze: every release file is hashed (sha256) at freeze; scores are recomputed from the frozen files only.", where: "Freeze record (release, files, sha256)" },
  { id: "H8", control: "Retrospective flag: every item coded after its outcome was public carries the retrospective tag; the prospective share is reported next to the score.", where: "Item tags retrospective, prospective" },
  { id: "H9", control: "Hindsight scan: each item is marked clean, flagged or reviewed after a second read for outcome words in the coding.", where: "Item field hindsight_scan" },
  { id: "H10", control: "Second coder: coder B codes admit, event, deadline, bin and asserts without seeing coder A; agreement is reported as kappa; a disagreement on event or deadline voids the item (AMBIGUOUS) and is never adjudicated toward a reading.", where: "CoderB records; lib/score/kappa.ts" },
  { id: "H11", control: "Rechecks: any outcome can be challenged on state, date, criterion, evidence or leakage; the verdict and whether it was applied are logged.", where: "Recheck records" },
  { id: "H12", control: "Corrections log: a change to any published number or rule is logged with the version it moved from and to.", where: "Corrections records; this page" },
  { id: "H13", control: "Registry scope gate: when proposed events are merged into the registry, an event outside the five area definitions gets no entry, and its statement returns to not admitted (OUT_OF_AREA). The gate reads subject area only, never outcomes or odds.", where: "data/areas.json; prompts/registry-consolidate.md; Statement coders.gate" },
];

// ---- sensitivity variants (static definitions) -------------------------------------------------
const mapText = (values: Record<Bin, number>): string => (["A", "B", "C", "D", "E"] as Bin[]).map((b) => `${b} ${fmt2(values[b])}`).join(", ");
const ends85 = lexicon.sensitivity_maps.ends85;
const kent = lexicon.sensitivity_maps.kent;
const flat75 = lexicon.sensitivity_maps.flat75;

export const SENSITIVITY_VARIANTS: SensitivityVariant[] = [
  { id: "ends_085_015", label: "Softer ends", how: ends85 ? `Lexicon map ${mapText(ends85)}: 'will' and 'never' lose some confidence; the middle bins do not move.` : "Lexicon map with A 0.85 and E 0.15; other bins unchanged." },
  { id: "kent", label: "Kent words", how: kent ? `Lexicon map ${mapText(kent)}: the Kent (1964) scale for words of estimative probability.` : "Lexicon map A 0.93, B 0.75, C 0.50, D 0.25, E 0.07." },
  { id: "flat_075", label: "Flat 0.75", how: flat75 ? `Lexicon map ${mapText(flat75)}: every phrase is 0.75 on the side it leans to; 'may' stays 0.50.` : "Every lexicon item is 0.75 on the asserted side; 'may' stays 0.50." },
  { id: "non_affiliated", label: "Non-affiliated only", how: "Clusters with any affiliated item are removed." },
  { id: "prospective_only", label: "Prospective only", how: "Only clusters whose items all carry the prospective flag." },
  { id: "undated_pooled", label: "Undated pooled", how: `Headline and undated clusters pooled, the undated ones at their ${T.undated_window_months}-month window.` },
  { id: "loo_max_change", label: "Leave one out", how: "The largest change in the headline when one cluster is left out (the M2 stability number)." },
];
export const SENSITIVITY_NOTE = `A lexicon variant changes only items whose p came from the lexicon: p = variant[bin] when the item asserts the event, else 1 - variant[bin]. Stated and registered probabilities never change. Each variant is null below ${T.min_clusters_headline} resolved clusters.`;

// ---- worked examples ---------------------------------------------------------------------------
const doblinP = [BIN_VALUES.A, BIN_VALUES.A, BIN_VALUES.A, BIN_VALUES.A, BIN_VALUES.A, BIN_VALUES.B];
const doblinBriers = doblinP.map((p) => brier(p, 0));
/** Cluster Brier of the Doblin MDMA worked example: five wrong 'will' items and one wrong 'probably'. */
export const DOBLIN_CLUSTER_BRIER = mean(doblinBriers) ?? 0;
const brierA0 = brier(BIN_VALUES.A, 0);
const brierB0 = brier(BIN_VALUES.B, 0);

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: "doblin-mdma",
    title: "A repeated claim: one event, six deadlines, one vote",
    person: "Rick Doblin",
    quote: "Six statements that FDA would approve MDMA-assisted therapy for PTSD, each with its own date.",
    source: "MAPS bulletins, conference talks and press interviews; each item links to its own quote.",
    statement_date: "six statement dates",
    steps: [
      { step: "Admit", detail: "Each statement is sincere, his own, forward-looking and regulatory. Each is admitted." },
      { step: "Register", detail: "One registry event, template drug_approval: 'FDA approves MDMA-assisted therapy (midomafetamine) for PTSD.' Resolution source: Drugs@FDA; sponsor release as a secondary source." },
      { step: "Date", detail: "The anchor table reads six deadlines from his words, from 2021-12-31 to 2024-08-31. Every deadline is on or before the as-of date, so every item is in the scoring window." },
      { step: "Probability", detail: `Five statements use 'will' (bin A, p ${fmt2(BIN_VALUES.A)}). One uses 'probably' or 'likely' (bin B, p ${fmt2(BIN_VALUES.B)}). No stated numbers.` },
      { step: "Resolve", detail: "The event had not occurred by any of the six deadlines (a complete response letter, not an approval, in August 2024). Outcome 0 for all six." },
      { step: "Score items", detail: `(${fmt2(BIN_VALUES.A)} - 0)^2 = ${fmt2(brierA0)} for each 'will' item; (${fmt2(BIN_VALUES.B)} - 0)^2 = ${fmt2(brierB0)} for the 'probably' item.` },
      { step: "Score the cluster", detail: `(5 x ${fmt2(brierA0)} + ${fmt2(brierB0)}) / 6 = ${fmt3(DOBLIN_CLUSTER_BRIER)}. This cluster is one observation in his headline mean.` },
      { step: "Hit rate", detail: "Every item had p above 0.5 and outcome 0, so the cluster hit is 0." },
      { step: "Timing", detail: "If the event occurs later, each of the six items records the months between its deadline and the outcome date in M10." },
    ],
    table: {
      columns: ["items", "phrase bin", "p", "outcome", "item Brier", "subtotal"],
      rows: [
        ["5", "A 'will'", fmt2(BIN_VALUES.A), "0 (false)", fmt2(brierA0), fmt2(5 * brierA0)],
        ["1", "B 'probably'", fmt2(BIN_VALUES.B), "0 (false)", fmt2(brierB0), fmt2(brierB0)],
        ["6", "", "", "", "sum / 6", fmt3(DOBLIN_CLUSTER_BRIER)],
      ],
    },
    result: `Cluster Brier ${fmt3(DOBLIN_CLUSTER_BRIER)}: one vote in the headline mean, whether he said it once or six times.`,
  },
  {
    id: "owen-comp360-ketafree",
    title: "A compound claim: two events, one deadline, pending",
    person: "Owen Scott Muir",
    quote: "COMP360 and KetaFree (IV Ketamine) will be approved for MDD by FDA.",
    source: "The Frontier Psychiatrists, 'Ten 2026 Predictions on Which to Hang Your Hat.', 2026-01-01.",
    statement_date: "2026-01-01",
    steps: [
      { step: "Admit", detail: "Sincere, his own claim, forward-looking, regulatory. Neither drug is made by an entity in his affiliations table, so no affiliated flag." },
      { step: "Split", detail: "'A and B' is two claims. Two registry events from the drug_approval template: FDA approves COMP360 (psilocybin) for major depressive disorder; FDA approves KetaFree (IV ketamine) for major depressive disorder. Each event is its own cluster." },
      { step: "Date", detail: "The post is an annual predictions list published on 1 January, so the anchor table sets the deadline to 2026-12-31 for both events (origin: anchor)." },
      { step: "Probability", detail: `'will' is bin A, so p = ${fmt2(BIN_VALUES.A)} for each event (origin: lexicon). No stated number.` },
      { step: "Tags", detail: "Coded before the outcome was public, so both items carry the prospective flag." },
      { step: "State", detail: `As of ${RULES_VERSION.as_of} the deadline has not passed. Both items are pending and count as zero observations in every metric.` },
      { step: "Known true", detail: "If FDA approves one drug before 2026-12-31, the row shows 'known true, enters on 2026-12-31'. It is still pending in every metric until that date." },
      { step: "What it will score", detail: `On 2026-12-31 each event scores (${fmt2(BIN_VALUES.A)} - 1)^2 = ${fmt2(brier(BIN_VALUES.A, 1))} if approved by then, or (${fmt2(BIN_VALUES.A)} - 0)^2 = ${fmt2(brier(BIN_VALUES.A, 0))} if not. The two events are two votes.` },
    ],
    table: {
      columns: ["event", "deadline", "p", "origin", "state", "enters"],
      rows: [
        ["FDA approves COMP360 for MDD", "2026-12-31", fmt2(BIN_VALUES.A), "lexicon A", "pending", "2026-12-31"],
        ["FDA approves KetaFree for MDD", "2026-12-31", fmt2(BIN_VALUES.A), "lexicon A", "pending", "2026-12-31"],
      ],
    },
    result: "Two pending clusters. They add to the pending count now and to the score after 2026-12-31.",
  },
];

// ---- known limits ------------------------------------------------------------------------------
export const LIMITS: Limit[] = [
  { id: "L1", limit: "Small n.", effect: `Below ${T.provisional_below_clusters} resolved clusters the interval is wide and the score is provisional; one cluster can move it (see the leave-one-out number).` },
  { id: "L2", limit: "Retrospective coding in release 1.0.", effect: "Items from 2021 to mid-2026 were coded after their outcomes were public. The controls reduce hindsight; they do not remove it. The prospective share says how much of the score is clean." },
  { id: "L3", limit: "Coverage differs by person.", effect: "A C-tier corpus under-counts claims. Ranks are shown only inside one coverage tier." },
  { id: "L4", limit: "The lexicon is a convention.", effect: "'will' is 0.90 because the literature puts it there, not because the person meant it. The sensitivity panel shows how much the choice matters." },
  { id: "L5", limit: "Window-close scoring punishes a late right call.", effect: "A claim that came true after its deadline is a miss. The timing metric reports the lag so the reader can judge it." },
  { id: "L6", limit: "Base-rate classes come from other fields and stages.", effect: "A class may fit an event loosely. Items with no fitting class have no base rate, and the reference row abstains on them." },
  { id: "L7", limit: "Markets are thin.", effect: "Few events have a public market question with a matching deadline; market skill usually has a small n." },
  { id: "L8", limit: "Splits and readings are coder decisions.", effect: "How a compound claim splits and which label counts as the claimed indication are logged at intake, but they are choices." },
  { id: "L9", limit: "One event can dominate.", effect: "A person who wrote often about one program has a score that leans on that program. Concentration reports the share." },
  { id: "L10", limit: `The ${T.undated_window_months}-month undated window is a convention.`, effect: `The ${T.undated_sensitivity_months}-month run is a check, not a second answer. The undated panel is never pooled with the headline.` },
  { id: "L11", limit: "The registry is generous on indication.", effect: "An approval narrower than the claimed indication counts as true when the reading was logged at intake. This favours the person." },
];

// ---- corrections log placeholder ---------------------------------------------------------------
export const CORRECTIONS: CorrectionRow[] = [];
export const CORRECTIONS_EMPTY = "No corrections yet. A row is added here for every change to a published number or rule.";
export const CORRECTIONS_COLUMNS = ["date", "scope", "change", "reason", "from", "to"] as const;

// ---- version history ---------------------------------------------------------------------------
export const VERSION_HISTORY: VersionRow[] = [
  { version: RULES_VERSION.version, date: RULES_VERSION.date, as_of: RULES_VERSION.as_of, note: RULES_VERSION.note ?? "First release." },
];

// ---- page bundle -----------------------------------------------------------------------------
export const METHODOLOGY = {
  version: RULES_VERSION,
  thresholds: THRESHOLDS,
  coinFlip: COIN_FLIP,
  headline: HEADLINE_PARAGRAPH,
  rules: RULES,
  lexicon: { rows: LEXICON_ROWS, note: LEXICON_NOTE, sources: LEXICON_SOURCES, version: LEXICON_VERSION, maps: SENSITIVITY_MAPS },
  anchors: { rows: ANCHOR_ROWS, note: ANCHORS_NOTE, version: ANCHORS_VERSION },
  quantities: { rules: QUANTITY_RULES, criterion: QUANTITY_CRITERION },
  exclusions: { notAdmitted: NOT_ADMITTED_ROWS, voidCodes: VOID_ROWS, tags: TAG_ROWS, version: REASON_CODES_VERSION },
  templates: { rows: TEMPLATE_ROWS, note: TEMPLATES_NOTE, version: TEMPLATES_VERSION },
  references: { rows: REFERENCE_ROWS, halving: HALVING_RULE, classes: BASE_RATE_CLASSES, version: BASE_RATES_VERSION },
  metrics: METRICS,
  evidenceTiers: EVIDENCE_TIERS,
  coverageTiers: COVERAGE_TIERS,
  coverageRankNote: COVERAGE_RANK_NOTE,
  hindsight: HINDSIGHT_CONTROLS,
  sensitivity: { variants: SENSITIVITY_VARIANTS, note: SENSITIVITY_NOTE },
  examples: WORKED_EXAMPLES,
  limits: LIMITS,
  corrections: { rows: CORRECTIONS, empty: CORRECTIONS_EMPTY, columns: CORRECTIONS_COLUMNS },
  versions: VERSION_HISTORY,
} as const;

export type Methodology = typeof METHODOLOGY;
