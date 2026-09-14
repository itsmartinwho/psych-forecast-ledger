// Every JSON file under data/ is parsed with these schemas at build time and by scripts/validate.ts.
// Stage files are separate on purpose: intake records carry no outcome fields, so blindness is structural.
import { z } from "zod";

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-mm-dd");
export const Url = z.string().url();
export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const AREA_SLUGS = ["regulatory", "clinical_trial", "company_market", "payer_policy", "practice_adoption"] as const;
export const AreaSlug = z.enum(AREA_SLUGS);
export type AreaSlug = z.infer<typeof AreaSlug>;

export const FORECASTER_SLUGS = ["owen", "angermayer", "doblin"] as const;
export const ForecasterSlug = z.enum(FORECASTER_SLUGS);
export type ForecasterSlug = z.infer<typeof ForecasterSlug>;
export const REFERENCE_SLUGS = ["base-rate", "market"] as const;
export type ReferenceSlug = (typeof REFERENCE_SLUGS)[number];

export const CoverageTier = z.enum(["A", "B", "C"]);
export const Archetype = z.enum(["clinician", "investor", "advocate", "analyst"]);

export const Forecaster = z.object({
  slug: ForecasterSlug,
  name: z.string(),
  short: z.string(),
  kind: z.literal("person"),
  archetype: Archetype,
  role: z.string().max(200),
  bio: z.string().max(700),
  channels: z.array(z.object({ label: z.string(), url: Url })),
  affiliations: z.array(z.object({ entity: z.string(), role: z.string(), aliases: z.array(z.string()).default([]), from: IsoDate.optional(), to: IsoDate.optional(), note: z.string().max(300).optional() })),
  coverage: z.object({
    tier: CoverageTier,
    corpus: z.string().max(600),
    period: z.object({ from: IsoDate, to: IsoDate }),
    sources: z.array(z.object({ label: z.string(), url: Url.optional(), note: z.string().max(300).optional() })),
    search_strings: z.array(z.string()),
  }),
  hero: z.boolean(),
});
export type Forecaster = z.infer<typeof Forecaster>;

export const Area = z.object({ slug: AreaSlug, name: z.string(), definition: z.string().max(400), order: z.number().int() });
export type Area = z.infer<typeof Area>;

// ---- rules -------------------------------------------------------------------------------------
export const Version = z.object({ version: z.string(), date: IsoDate, as_of: IsoDate, note: z.string().optional() });
export const Thresholds = z.object({
  bootstrap_seed: z.number().int(), bootstrap_resamples: z.number().int().positive(),
  undated_window_months: z.number().int().positive(), undated_sensitivity_months: z.number().int().positive(),
  min_clusters_headline: z.number().int(), provisional_below_clusters: z.number().int(),
  calibration_min_clusters: z.number().int(), calibration_min_per_bin: z.number().int(), murphy_min_clusters: z.number().int(),
  market_min_clusters: z.number().int(), shared_event_min: z.number().int(), timing_min: z.number().int(), affiliated_split_min_clusters: z.number().int(),
  point_band_pct: z.number(), unresolvable_after_months: z.number().int(), report_window_days: z.number().int(),
  market_lookback_days: z.number().int(), market_deadline_tolerance_quarters: z.number().int(),
  probability_clamp: z.tuple([z.number(), z.number()]), quote_max_chars: z.number().int(),
  kappa_target: z.number(), reject_sample_share: z.number(), reject_sample_min: z.number().int(),
});
export type Thresholds = z.infer<typeof Thresholds>;

export const BIN_KEYS = ["A", "B", "C", "D", "E"] as const;
export const Bin = z.enum(BIN_KEYS);
export type Bin = z.infer<typeof Bin>;
export const Lexicon = z.object({
  version: z.string(), note: z.string(),
  bins: z.array(z.object({ bin: Bin, p: z.number(), label: z.string(), phrases: z.array(z.string()) })).length(5),
  sensitivity_maps: z.record(z.string(), z.record(Bin, z.number())),
  sources: z.array(z.string()),
});
export type Lexicon = z.infer<typeof Lexicon>;
export const Anchors = z.object({
  version: z.string(), note: z.string(),
  rules: z.array(z.object({ pattern: z.string(), deadline: z.string().nullable(), origin: z.enum(["stated", "anchor", "table"]).nullable(), tag: z.string().optional(), note: z.string().optional() })),
});
export const TEMPLATE_KEYS = ["drug_approval", "device_authorization", "trial_result", "rule_or_policy", "court_outcome", "company_event", "coverage_decision", "quantity_threshold"] as const;
export const Template = z.enum(TEMPLATE_KEYS);
export type Template = z.infer<typeof Template>;
export const Templates = z.object({ version: z.string(), note: z.string(), templates: z.array(z.object({ template: Template, proposition: z.string(), criterion: z.string(), source: z.string() })).length(8) });
export const BaseRateTable = z.object({
  version: z.string(), note: z.string(),
  classes: z.array(z.object({ class: z.string(), label: z.string(), p: z.number().min(0).max(1).nullable(), median_months: z.number().nullable(), source: z.string(), source_url: Url.nullable() })),
});
export type BaseRateTable = z.infer<typeof BaseRateTable>;

export const NOT_ADMITTED_CODES = ["VAGUE", "CONTROL", "REPORT", "NORMATIVE", "THIRD_PARTY", "SATIRE", "KNOWN", "OUT_OF_AREA", "NOT_FORECAST", "DUPLICATE", "PARAPHRASE"] as const;
export const ReasonCode = z.enum(NOT_ADMITTED_CODES);
export type ReasonCode = z.infer<typeof ReasonCode>;
export const VOID_CODES = ["AMBIGUOUS", "CONDITION_UNMET", "UNRESOLVABLE"] as const;
export const VoidReason = z.enum(VOID_CODES);
export type VoidReason = z.infer<typeof VoidReason>;
export const ReasonCodes = z.object({
  version: z.string(),
  not_admitted: z.array(z.object({ code: ReasonCode, label: z.string(), test: z.string() })),
  void: z.array(z.object({ code: VoidReason, label: z.string(), test: z.string() })),
  tags: z.array(z.object({ tag: z.string(), test: z.string() })),
});

// ---- census ------------------------------------------------------------------------------------
export const ItemId = z.string().regex(/^(owen|angermayer|doblin)-\d{4}$/);
export const SourceType = z.enum(["substack_post", "substack_podcast", "substack_video", "substack_thread", "newsletter", "own_post", "podcast", "interview", "talk", "conference", "tweet", "filing", "press", "article", "other"]);
export const Audience = z.enum(["everyone", "only_paid", "founding"]);
export const Source = z.object({
  url: Url, title: z.string().max(300), type: SourceType,
  post_slug: z.string().optional(), audience: Audience.optional(), archive_url: Url.optional(), accessed: IsoDate.optional(),
});
export type Source = z.infer<typeof Source>;

export const StatementStatus = z.enum(["admitted", "not_admitted", "void"]);
/** One forward-looking statement found in the census. Carries no outcome fields. */
export const Statement = z.object({
  id: ItemId,
  forecaster: ForecasterSlug,
  statement_date: IsoDate,
  quote: z.string().min(12).max(600),
  context: z.string().max(600).optional(),
  source: Source,
  date_precision: z.enum(["day", "month"]).optional(),
  extraction: z.object({ run: z.string(), sincere: z.boolean(), own_claim: z.boolean(), normative: z.boolean(), forward_looking: z.boolean(), area_guess: z.string().optional(), note: z.string().max(300).optional() }),
  status: StatementStatus,
  reason_code: ReasonCode.optional(),
  void_reason: VoidReason.optional(),
  coders: z.object({ a_admit: z.boolean().optional(), b_admit: z.boolean().optional(), tiebreak_admit: z.boolean().optional(), a_reason: ReasonCode.optional(), b_reason: ReasonCode.optional(), gate: z.enum(["registry"]).optional() }).optional(),
}).superRefine((s, ctx) => {
  if (s.status === "not_admitted" && !s.reason_code) ctx.addIssue({ code: "custom", message: `${s.id}: not_admitted needs reason_code` });
  if (s.status === "void" && !s.void_reason) ctx.addIssue({ code: "custom", message: `${s.id}: void needs void_reason` });
});
export type Statement = z.infer<typeof Statement>;

// ---- registry ----------------------------------------------------------------------------------
export const EventId = z.string().regex(/^E-\d{4}$/);
export const Quantity = z.object({
  metric: z.string().max(200), threshold: z.number().nullable(), direction: z.enum([">=", "<=", ">", "<", "band"]), unit: z.string().max(60), series: z.string().max(300),
  band_pct: z.number().optional(),
});
export const RegistryEvent = z.object({
  id: EventId,
  template: Template,
  area: AreaSlug,
  asset: z.string().max(120),
  entity: z.string().max(120),
  title: z.string().max(160),
  proposition: z.string().max(400),
  criterion: z.string().max(900),
  resolution_source: z.object({ name: z.string().max(200), url: Url.optional() }),
  base_rate_class: z.string().nullable(),
  market_ref_id: z.string().nullable(),
  quantity: Quantity.nullable(),
  readings: z.array(z.string().max(300)),
  created_by: z.string(),
  created_at: IsoDate,
  version: z.string(),
});
export type RegistryEvent = z.infer<typeof RegistryEvent>;

export const OutcomeType = z.enum(["approval", "rejection", "crl", "rule", "scheduling", "legislation", "coverage", "statement", "trial_readout_positive", "trial_readout_negative", "publication", "retraction", "financing", "merger_acquisition", "bankruptcy", "layoffs", "launch", "closure", "breakthrough_designation", "extension", "court", "other"]);
export const TimelineEvent = z.object({
  id: z.string().regex(/^T-\d{4}$/), date: IsoDate, area: AreaSlug, entity: z.string().max(160), event: z.string().max(500),
  outcome_type: OutcomeType, key_number: z.string().max(300).optional(), source_url: Url, source_org: z.string().max(120),
  confidence: z.enum(["high", "medium", "low"]), registry_event_ids: z.array(EventId),
});
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const Cite = z.object({ url: Url, title: z.string().max(300), publisher: z.string().max(120).optional(), date: IsoDate.optional(), accessed: IsoDate });
export type Cite = z.infer<typeof Cite>;
export const OutcomeState = z.enum(["occurred", "not_occurred", "unresolvable"]);
/** Resolution of one registry event. Written by the resolver pass, which never sees p. */
export const Outcome = z.object({
  event_id: EventId,
  state: OutcomeState,
  date: IsoDate.nullable(),            // first date the proposition became true
  checked_through: IsoDate,            // the resolver verified the state as of this date
  realized_value: z.number().nullable(),
  evidence: z.array(Cite),
  note: z.string().max(900),
  resolver: z.string(),
  resolved_at: IsoDate,
  version: z.number().int().positive(),
}).superRefine((o, ctx) => {
  if (o.state === "occurred" && !o.date) ctx.addIssue({ code: "custom", message: `${o.event_id}: occurred needs date` });
  if (o.state !== "unresolvable" && o.evidence.length < 1) ctx.addIssue({ code: "custom", message: `${o.event_id}: ${o.state} needs evidence` });
  if (o.state === "occurred" && o.date && o.date > o.checked_through) ctx.addIssue({ code: "custom", message: `${o.event_id}: date after checked_through` });
});
export type Outcome = z.infer<typeof Outcome>;

export const Recheck = z.object({
  event_id: EventId,
  challenged: z.enum(["state", "date", "criterion", "evidence", "leakage"]),
  argument: z.string().max(1200),
  verdict: z.enum(["upheld", "overturned", "escalated"]),
  applied: z.boolean(),
  rechecker: z.string(),
  rechecked_at: IsoDate,
});
export type Recheck = z.infer<typeof Recheck>;

// ---- intake ------------------------------------------------------------------------------------
export const DeadlineOrigin = z.enum(["stated", "anchor", "table"]);
export const POrigin = z.enum(["stated", "lexicon"]);
export const Panel = z.enum(["dated", "undated"]);
export const TAGS = ["affiliated", "retrospective", "prospective", "table_dated", "denial", "stated_number", "conditional"] as const;
export const Tag = z.enum(TAGS);
export type Tag = z.infer<typeof Tag>;

export const BaseRateUse = z.object({ class: z.string(), p_raw: z.number(), p: z.number(), halved: z.boolean(), median_months: z.number().nullable() });
export const ItemVersion = z.object({ version: z.number().int(), changed_at: IsoDate, reason: z.string().max(600), previous: z.record(z.string(), z.unknown()) });

/** An admitted statement with its intake fields (coder A). No outcome fields. */
export const Item = z.object({
  id: ItemId,
  forecaster: ForecasterSlug,
  statement_date: IsoDate,
  quote: z.string().min(12).max(600),
  context: z.string().max(600).optional(),
  source: Source,
  area: AreaSlug,
  event_id: EventId,
  condition_event_id: EventId.nullable(),
  asserts: z.boolean(),                          // true: asserts the proposition; false: denies it
  deadline: IsoDate.nullable(),
  deadline_origin: DeadlineOrigin.nullable(),
  deadline_text: z.string().max(200).nullable(),
  panel: Panel,
  p: z.number().min(0.01).max(0.99),
  p_origin: POrigin,
  p_note: z.string().max(200).optional(),   // e.g. "coder B bin C; mean of 0.70 and 0.50"
  bin: Bin.nullable(),
  phrase: z.string().max(120).nullable(),
  stated_number: z.string().max(60).nullable(),
  tags: z.array(Tag),
  base_rate: BaseRateUse.nullable(),
  market_ref_id: z.string().nullable(),
  coder: z.string(),
  rule_version: z.string(),
  intake_at: IsoDate,
  hindsight_scan: z.enum(["clean", "flagged", "reviewed"]),
  version: z.number().int().positive(),
  history: z.array(ItemVersion),
}).superRefine((it, ctx) => {
  if (it.panel === "dated" && !it.deadline) ctx.addIssue({ code: "custom", message: `${it.id}: dated item needs a deadline` });
  if (it.panel === "undated" && it.deadline) ctx.addIssue({ code: "custom", message: `${it.id}: undated item must not carry a deadline` });
  if (it.deadline && it.deadline <= it.statement_date) ctx.addIssue({ code: "custom", message: `${it.id}: deadline must follow the statement date` });
  if (it.p_origin === "lexicon" && !it.bin) ctx.addIssue({ code: "custom", message: `${it.id}: lexicon p needs a bin` });
  if (it.p_origin === "stated" && !it.stated_number) ctx.addIssue({ code: "custom", message: `${it.id}: stated p needs stated_number` });
  if (it.condition_event_id && !it.tags.includes("conditional")) ctx.addIssue({ code: "custom", message: `${it.id}: conditional items carry the tag` });
});
export type Item = z.infer<typeof Item>;

/** Coder B's independent fields for the match test. */
export const CoderB = z.object({
  id: ItemId, admit: z.boolean(), reason_code: ReasonCode.nullable(),
  event_id: EventId.nullable(), deadline: IsoDate.nullable(), bin: Bin.nullable(), asserts: z.boolean().nullable(), coder: z.string(), coded_at: IsoDate,
});
export type CoderB = z.infer<typeof CoderB>;

export const Freeze = z.object({ release: z.string(), frozen_at: z.string(), files: z.array(z.object({ path: z.string(), sha256: Sha256 })), note: z.string().optional() });

export const MarketRef = z.object({
  id: z.string().regex(/^M-\d{3}$/), event_id: EventId, venue: z.enum(["polymarket", "kalshi", "metaculus", "manifold"]), url: Url, question: z.string().max(300),
  deadline: IsoDate.nullable(), prices: z.array(z.object({ date: IsoDate, p: z.number().min(0).max(1) })).min(1),
});
export type MarketRef = z.infer<typeof MarketRef>;

export const Coverage = z.object({
  generated_at: z.string(), archive_count: z.number().int(), read: z.object({ free: z.number().int(), paid: z.number().int(), founding: z.number().int() }),
  missing: z.array(z.string()), stubs: z.array(z.string()), by_year: z.record(z.string(), z.number().int()), words_total: z.number().int(),
});
export type Coverage = z.infer<typeof Coverage>;

export const Correction = z.object({ date: IsoDate, scope: z.string().max(120), change: z.string().max(600), reason: z.string().max(600), version_from: z.string(), version_to: z.string() });
export type Correction = z.infer<typeof Correction>;

export const Dataset = z.object({
  version: Version, thresholds: Thresholds, lexicon: Lexicon, anchors: Anchors, templates: Templates, base_rates: BaseRateTable, reason_codes: ReasonCodes,
  forecasters: z.array(Forecaster), areas: z.array(Area),
  statements: z.array(Statement), items: z.array(Item), coder_b: z.array(CoderB),
  registry: z.array(RegistryEvent), timeline: z.array(TimelineEvent), outcomes: z.array(Outcome), rechecks: z.array(Recheck),
  market_refs: z.array(MarketRef), coverage: Coverage, corrections: z.array(Correction),
});
export type Dataset = z.infer<typeof Dataset>;
