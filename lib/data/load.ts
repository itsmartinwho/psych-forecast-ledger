// Reads every file under a data root and parses it with the zod schemas. Pure function of the files on
// disk: no clock, no network, no React. The React cache() wrapper lives in ./cached.ts so scripts can
// import this module directly.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import * as S from "./schema";
import { DATA_DIR, FORECASTER_FILES, PATHS, dataFile, resolveDataRoot } from "./paths";

export type Dataset = S.Dataset;

/** Default data root when the caller passes none. */
export const DATA_ROOT = path.join(process.cwd(), DATA_DIR);

/** One schema or JSON problem in one file. `row` is the record id when the file is an array of records. */
export interface FileIssue { file: string; row: string | null; path: string; message: string }

export interface FileStat { file: string; present: boolean; rows: number | null }

export interface LoadReport {
  root: string;
  /** The full dataset; null when any file has an issue. */
  dataset: Dataset | null;
  /** Every record that parsed, even when some did not; null when a rules file or coverage failed to parse. */
  partial: Dataset | null;
  issues: FileIssue[];
  files: FileStat[];
  /** Content of the VERSION file, trimmed; null when the file is missing. */
  version_file: string | null;
  /** Releases listed in intake/freeze.json (empty when the file is missing). */
  freeze: FreezeRelease[];
}

export type FreezeRelease = z.infer<typeof S.Freeze>;
const FreezeFile = z.object({ releases: z.array(S.Freeze) });

export class DatasetError extends Error {
  constructor(public readonly root: string, public readonly issues: FileIssue[]) {
    super(`dataset at ${root} has ${issues.length} problem${issues.length === 1 ? "" : "s"}:\n` + issues.map((i) => "  " + formatIssue(i)).join("\n"));
    this.name = "DatasetError";
  }
}

export function formatIssue(i: FileIssue): string {
  const row = i.row ? ` [${i.row}]` : "";
  const at = i.path ? ` ${i.path}` : "";
  return `${i.file}${row}${at}: ${i.message}`;
}

const EMPTY_COVERAGE: S.Coverage = { generated_at: "", archive_count: 0, read: { free: 0, paid: 0, founding: 0 }, missing: [], stubs: [], by_year: {}, words_total: 0 };

/** Record id used in messages: id, event_id, slug or item_id, else the index. */
function rowIdOf(raw: unknown, index: number): string {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["id", "event_id", "slug", "item_id"]) {
      const v = r[k];
      if (typeof v === "string" && v.length > 0) return v;
    }
  }
  return `#${index}`;
}

export function readJsonFile(abs: string): { ok: true; value: unknown } | { ok: false; message: string } {
  let text: string;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch (e) {
    return { ok: false, message: `cannot read: ${(e as Error).message}` };
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, message: `invalid JSON: ${(e as Error).message}` };
  }
}

interface Reader {
  root: string;
  issues: FileIssue[];
  files: FileStat[];
}

/** Parse one file. `fallback` stands in for a missing file; without it a missing file is an issue. */
function parseFile<T>(r: Reader, rel: string, schema: z.ZodType<T>, fallback?: T): T | undefined {
  const abs = dataFile(r.root, rel);
  if (!fs.existsSync(abs)) {
    r.files.push({ file: rel, present: false, rows: null });
    if (fallback !== undefined) return fallback;
    r.issues.push({ file: rel, row: null, path: "", message: "missing required file" });
    return undefined;
  }
  const read = readJsonFile(abs);
  if (!read.ok) {
    r.files.push({ file: rel, present: true, rows: null });
    r.issues.push({ file: rel, row: null, path: "", message: read.message });
    return undefined;
  }
  const raw = read.value;
  r.files.push({ file: rel, present: true, rows: Array.isArray(raw) ? raw.length : null });
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) {
    const p = issue.path.map(String);
    const isRow = Array.isArray(raw) && p.length > 0 && /^\d+$/.test(p[0]);
    const row = isRow ? rowIdOf(raw[Number(p[0])], Number(p[0])) : null;
    r.issues.push({ file: rel, row, path: (isRow ? p.slice(1) : p).join("."), message: issue.message });
  }
  return undefined;
}

/**
 * Parse an array file row by row. Rows that fail become issues; rows that pass are returned, so the
 * referential rules can still run on a partly broken file and name every problem in one pass.
 */
function parseRows<T>(r: Reader, rel: string, rowSchema: z.ZodType<T>, required = false): T[] {
  const abs = dataFile(r.root, rel);
  if (!fs.existsSync(abs)) {
    r.files.push({ file: rel, present: false, rows: null });
    if (required) r.issues.push({ file: rel, row: null, path: "", message: "missing required file" });
    return [];
  }
  const read = readJsonFile(abs);
  if (!read.ok) {
    r.files.push({ file: rel, present: true, rows: null });
    r.issues.push({ file: rel, row: null, path: "", message: read.message });
    return [];
  }
  if (!Array.isArray(read.value)) {
    r.files.push({ file: rel, present: true, rows: null });
    r.issues.push({ file: rel, row: null, path: "", message: "expected an array of records" });
    return [];
  }
  r.files.push({ file: rel, present: true, rows: read.value.length });
  const out: T[] = [];
  read.value.forEach((raw, index) => {
    const parsed = rowSchema.safeParse(raw);
    if (parsed.success) { out.push(parsed.data); return; }
    const row = rowIdOf(raw, index);
    for (const issue of parsed.error.issues) r.issues.push({ file: rel, row, path: issue.path.map(String).join("."), message: issue.message });
  });
  return out;
}

function perForecaster<T>(r: Reader, pick: (f: (typeof FORECASTER_FILES)[number]) => string, schema: z.ZodType<T>): T[] {
  const out: T[] = [];
  for (const f of FORECASTER_FILES) out.push(...parseRows(r, pick(f), schema));
  return out;
}

/** Read and parse every file. Collects every problem instead of stopping at the first. */
export function parseDataset(root?: string): LoadReport {
  const r: Reader = { root: resolveDataRoot(root), issues: [], files: [] };
  const versionAbs = dataFile(r.root, PATHS.version);
  const version_file = fs.existsSync(versionAbs) ? fs.readFileSync(versionAbs, "utf8").trim() : null;
  r.files.push({ file: PATHS.version, present: version_file !== null, rows: null });
  if (version_file === null) r.issues.push({ file: PATHS.version, row: null, path: "", message: "missing required file" });
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(version_file)) r.issues.push({ file: PATHS.version, row: null, path: "", message: `expected a yyyy-mm-dd date, got "${version_file}"` });

  const version = parseFile(r, PATHS.rules.version, S.Version);
  const thresholds = parseFile(r, PATHS.rules.thresholds, S.Thresholds);
  const lexicon = parseFile(r, PATHS.rules.lexicon, S.Lexicon);
  const anchors = parseFile(r, PATHS.rules.anchors, S.Anchors);
  const templates = parseFile(r, PATHS.rules.templates, S.Templates);
  const base_rates = parseFile(r, PATHS.rules.baseRates, S.BaseRateTable);
  const reason_codes = parseFile(r, PATHS.rules.reasonCodes, S.ReasonCodes);
  const forecasters = parseRows(r, PATHS.forecasters, S.Forecaster, true);
  const areas = parseRows(r, PATHS.areas, S.Area, true);

  const statements = perForecaster(r, (f) => f.statements, S.Statement);
  const items = perForecaster(r, (f) => f.intake, S.Item);
  const coder_b = perForecaster(r, (f) => f.coderB, S.CoderB);
  const outcomes = [...parseRows(r, PATHS.outcomes, S.Outcome), ...perForecaster(r, (f) => f.resolutions, S.Outcome)];
  const rechecks = [...parseRows(r, PATHS.rechecks, S.Recheck), ...perForecaster(r, (f) => f.recheck, S.Recheck)];
  const registry = parseRows(r, PATHS.registry, S.RegistryEvent);
  const timeline = parseRows(r, PATHS.timeline, S.TimelineEvent);
  const market_refs = parseRows(r, PATHS.marketRefs, S.MarketRef);
  const corrections = parseRows(r, PATHS.corrections, S.Correction);
  const coverage = parseFile(r, PATHS.raw.coverage, S.Coverage, EMPTY_COVERAGE);
  const freeze = parseFile(r, PATHS.freeze, FreezeFile, { releases: [] });

  // The partial view exists as soon as every single-object file parsed; it carries the rows that passed.
  const partial: Dataset | null = version && thresholds && lexicon && anchors && templates && base_rates && reason_codes && coverage
    ? {
        version, thresholds, lexicon, anchors, templates, base_rates, reason_codes,
        forecasters, areas,
        statements, items, coder_b,
        registry, timeline, outcomes, rechecks,
        market_refs, coverage, corrections,
      }
    : null;
  const dataset = r.issues.length === 0 ? partial : null;
  return { root: r.root, dataset, partial, issues: r.issues, files: r.files, version_file, freeze: freeze?.releases ?? [] };
}

/**
 * Load a data root. `root` is the data directory (data/ or data/fixtures); a repo root that contains
 * data/ also works. A missing per-forecaster file is an empty list. Throws DatasetError on any problem.
 */
export function loadDataset(root?: string): Dataset {
  const report = parseDataset(root);
  if (!report.dataset) throw new DatasetError(report.root, report.issues);
  return report.dataset;
}

/** Same as loadDataset; kept for callers that expect the explicit name. */
export const loadDatasetUncached = loadDataset;

/**
 * The shape lib/score reads (its Dataset contract): flat as_of string, camelCase collections, and the
 * per-event outcomes under `resolutions`. Structural, so the schema records pass through unchanged.
 */
export interface ScoreInput {
  version: string;
  rules_version: string;
  forecasters: S.Forecaster[];
  areas: S.Area[];
  statements: S.Statement[];
  items: S.Item[];
  coderB: S.CoderB[];
  resolutions: S.Outcome[];
  rechecks: S.Recheck[];
  registry: S.RegistryEvent[];
  timeline: S.TimelineEvent[];
  baseRates: S.BaseRateTable;
  marketRefs: S.MarketRef[];
  corrections: S.Correction[];
  lexicon: S.Lexicon;
  thresholds: S.Thresholds;
}

/** Map a parsed dataset to the score contract. `versionFile` is the VERSION content; rules as_of stands in when it is absent. */
export function toScoreInput(ds: Dataset, versionFile?: string | null): ScoreInput {
  return {
    version: versionFile ?? ds.version.as_of,
    rules_version: ds.version.version,
    forecasters: ds.forecasters,
    areas: ds.areas,
    statements: ds.statements,
    items: ds.items,
    coderB: ds.coder_b,
    resolutions: ds.outcomes,
    rechecks: ds.rechecks,
    registry: ds.registry,
    timeline: ds.timeline,
    baseRates: ds.base_rates,
    marketRefs: ds.market_refs,
    corrections: ds.corrections,
    lexicon: ds.lexicon,
    thresholds: ds.thresholds,
  };
}

/** Load a root and return both views: the schema dataset and the score contract built from it. */
export function loadBoth(root?: string): { dataset: Dataset; score: ScoreInput } {
  const report = parseDataset(root);
  if (!report.dataset) throw new DatasetError(report.root, report.issues);
  return { dataset: report.dataset, score: toScoreInput(report.dataset, report.version_file) };
}

export function loadScoreInput(root?: string): ScoreInput {
  return loadBoth(root).score;
}
