// The file map under a data root. A data root is data/ (the ledger) or data/fixtures (the miniature).
// Every reader (loader, validator, scripts) resolves files through this map, never by hand.
import fs from "node:fs";
import path from "node:path";
import { FORECASTER_SLUGS, type ForecasterSlug } from "./schema";

export const DATA_DIR = "data";

/** Single files, relative to the data root. */
export const PATHS = {
  version: "VERSION",
  forecasters: "forecasters.json",
  areas: "areas.json",
  rules: {
    version: "rules/version.json",
    lexicon: "rules/lexicon.json",
    anchors: "rules/anchors.json",
    templates: "rules/templates.json",
    thresholds: "rules/thresholds.json",
    baseRates: "rules/base-rates.json",
    reasonCodes: "rules/reason-codes.json",
  },
  registry: "registry/events.json",
  timeline: "registry/timeline.json",
  // Single-file alternatives to the per-forecaster resolutions/ and recheck/ directories. Both layouts load.
  outcomes: "registry/outcomes.json",
  rechecks: "registry/rechecks.json",
  freeze: "intake/freeze.json",
  marketRefs: "market-refs.json",
  corrections: "corrections.json",
  scores: "generated/scores.json",
  raw: {
    archive: "raw/archive.json",
    postsDir: "raw/posts",
    paidDir: "raw/paid",
    coverage: "raw/coverage.json",
  },
} as const;

/** Directories that hold one file per forecaster. */
export const PER_FORECASTER_DIRS = {
  statements: "statements",
  intake: "intake",
  coderB: "intake/coder-b",
  resolutions: "resolutions",
  recheck: "recheck",
} as const;
export type PerForecasterKind = keyof typeof PER_FORECASTER_DIRS;

export function perForecasterFile(kind: PerForecasterKind, slug: ForecasterSlug | string): string {
  return `${PER_FORECASTER_DIRS[kind]}/${slug}.json`;
}

/** The two places a raw post can live, in lookup order. */
export function rawPostFiles(slug: string): string[] {
  return [`${PATHS.raw.postsDir}/${slug}.json`, `${PATHS.raw.paidDir}/${slug}.json`];
}

export const FORECASTER_FILES = FORECASTER_SLUGS.map((slug) => ({
  slug,
  statements: perForecasterFile("statements", slug),
  intake: perForecasterFile("intake", slug),
  coderB: perForecasterFile("coderB", slug),
  resolutions: perForecasterFile("resolutions", slug),
  recheck: perForecasterFile("recheck", slug),
}));

/**
 * Resolve the data root. Accepts the data directory itself or the repo root that contains data/.
 * Default: <cwd>/data.
 */
export function resolveDataRoot(root?: string): string {
  const base = root ? path.resolve(root) : path.resolve(process.cwd(), DATA_DIR);
  if (fs.existsSync(path.join(base, PATHS.version))) return base;
  const nested = path.join(base, DATA_DIR);
  if (fs.existsSync(path.join(nested, PATHS.version))) return nested;
  return base;
}

export function dataFile(root: string, rel: string): string {
  return path.join(root, rel);
}
