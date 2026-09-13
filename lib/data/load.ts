import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { z } from "zod";
import * as S from "./schema";

export const DATA_ROOT = path.join(process.cwd(), "data");

function readJson<T>(rel: string, schema: z.ZodType<T>, fallback?: T): T {
  const file = path.join(DATA_ROOT, rel);
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing data file: ${rel}`);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 12).map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`invalid ${rel}:\n${issues}${parsed.error.issues.length > 12 ? `\n  ... ${parsed.error.issues.length - 12} more` : ""}`);
  }
  return parsed.data;
}

function readPerForecaster<T>(dir: string, schema: z.ZodType<T[]>): T[] {
  const out: T[] = [];
  for (const slug of S.FORECASTER_SLUGS) {
    const rel = `${dir}/${slug}.json`;
    if (fs.existsSync(path.join(DATA_ROOT, rel))) out.push(...readJson(rel, schema));
  }
  return out;
}

/** Reads and validates every data file. Pure function of the files on disk; no Date.now(). */
export function loadDatasetUncached(): S.Dataset {
  const ds: S.Dataset = {
    version: readJson("rules/version.json", S.Version),
    thresholds: readJson("rules/thresholds.json", S.Thresholds),
    lexicon: readJson("rules/lexicon.json", S.Lexicon),
    anchors: readJson("rules/anchors.json", S.Anchors),
    templates: readJson("rules/templates.json", S.Templates),
    base_rates: readJson("rules/base-rates.json", S.BaseRateTable),
    reason_codes: readJson("rules/reason-codes.json", S.ReasonCodes),
    forecasters: readJson("forecasters.json", z.array(S.Forecaster)),
    areas: readJson("areas.json", z.array(S.Area)),
    statements: readPerForecaster("statements", z.array(S.Statement)),
    items: readPerForecaster("intake", z.array(S.Item)),
    coder_b: readPerForecaster("intake/coder-b", z.array(S.CoderB)),
    registry: readJson("registry/events.json", z.array(S.RegistryEvent), []),
    timeline: readJson("registry/timeline.json", z.array(S.TimelineEvent), []),
    outcomes: readJson("registry/outcomes.json", z.array(S.Outcome), []),
    rechecks: readJson("registry/rechecks.json", z.array(S.Recheck), []),
    market_refs: readJson("market-refs.json", z.array(S.MarketRef), []),
    coverage: readJson("raw/coverage.json", S.Coverage, { generated_at: "", archive_count: 0, read: { free: 0, paid: 0, founding: 0 }, missing: [], stubs: [], by_year: {}, words_total: 0 }),
    corrections: readJson("corrections.json", z.array(S.Correction), []),
  };
  return S.Dataset.parse(ds);
}

export const loadDataset = cache(loadDatasetUncached);
