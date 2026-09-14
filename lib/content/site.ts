// Site-wide fixed strings: the name, the subject, the tagline, the repository and the coverage phrases.
// Sentence case in code; CSS uppercases the meta register where needed.
export const SITE_NAME = "Forecast Ledger";

export const SUBJECT = "interventional psychiatry and psychedelic medicine";

/** Three homes: the masthead subject popover, the About lede and metadata.description. */
export const TAGLINE = "Quoted, dated predictions scored against public outcomes under one written method. Every score links to the words, the rule and the evidence.";

export const REPO_URL = "https://github.com/itsmartinwho/psych-forecast-ledger";

export const METHOD_PATH = "/methodology";

/** Label of the link inside a term popover. */
export const METHOD_LINK = "Method ›";

export type CoverageTier = "A" | "B" | "C";

/** Dateline phrase for a coverage tier. */
export const COVERAGE_PHRASE: Record<CoverageTier, string> = {
  A: "Full archive (tier A)",
  B: "Archive plus search (tier B)",
  C: "Ad hoc collection (tier C)",
};

export function coveragePhrase(tier: string): string {
  return COVERAGE_PHRASE[tier as CoverageTier] ?? `Tier ${tier}`;
}
