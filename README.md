# Forecast Ledger

Scored, sourced predictions in interventional psychiatry and psychedelic medicine. The primary subject is Owen Scott Muir, MD (The Frontier Psychiatrists); Christian Angermayer and Rick Doblin are comparators. The site is a static Next.js build from JSON data that is validated by schemas at build time. Every number on a page traces to a quote, a rule and a source.

## Method in one paragraph

Each person's number is a Brier score on checkable claims. A claim is admitted when the person said in public, on a known date, that a specific thing would or would not happen, and a third party decides the outcome. A claim with a deadline in the person's words is checked at that deadline; a claim with no deadline is checked 24 months after it was made (rules 1.1.0; rules 1.0 scored dated claims only). Words become probabilities through a fixed lexicon (will 0.90, probably 0.70, may 0.50, unlikely 0.30, never 0.10); stated numbers are used as stated. Two independent coders map each claim to a registry event and a deadline; a mismatch voids the item. The registry accepts only events inside the five area definitions; a proposal outside them returns the statement to not admitted (OUT_OF_AREA). Items enter the score only after their deadline or window passes. One event counts once per person. The dated-only score stays visible as a view and a sensitivity variant. The full method, tables and thresholds live in `data/rules/` and on `/methodology`.

## Layout

- `data/rules/` versioned rules: lexicon, anchor table, templates, reason codes, base-rate table, thresholds.
- `data/census/` every forward-looking statement found (the census, before coding).
- `data/statements/` the census with its final status per forecaster; `data/intake/` admitted items and coder B's independent fields; `data/intake/freeze.json` hashes.
- `data/registry/` event registry, outcomes (one per event), rechecks, ground-truth timeline.
- `data/generated/scores.json` the committed score snapshot; `scripts/check-drift.ts` fails the build when it is stale.
- `lib/score/` pure scoring library (Brier, cluster bootstrap, Wilson, calibration, kappa, panels, leaderboard); `lib/data/` schemas, loader, derive layer.
- `components/charts/` hand-written SVG charts with pure layout functions; `app/` pages.
- `scripts/` and `scripts/pipeline/` data collection and the coding pipeline; `prompts/` the finder, coder, consolidation, resolver and recheck instructions.

## Commands

```bash
pnpm install
pnpm test            # scoring, charts, components
pnpm validate        # schemas and referential rules
pnpm snapshot        # recompute data/generated/scores.json
pnpm build           # validate, drift check, static build
pnpm dev
```

## Adding statements after a release

`import-sweep.ts <slug> <research file>` appends verified rows to the census with stable ids; `build-coding-packets.ts --new` packs only uncoded rows into new packets; coder A and coder B agents code them; `build-tiebreak-packet.ts --new` sends the admission splits to coder C; `consolidate-registry.ts prep` lists only unmapped proposals, a grouping agent writes `registry-groups-N.json`, entry agents write `registry-entries-N-*.json`, then `assemble --groups ... --entries ... --created <date> --version <rules>` and `apply` (the map merges with earlier runs); `intake-merge.ts` rebuilds the statements and items (idempotent); `freeze.ts <release>`; `build-resolution-packets.ts 8 --missing`; resolver agents; `apply-outcomes.ts`; `build-recheck-packets.ts 10 --occurred`; recheck agents; `apply-rechecks.ts`; `pnpm snapshot`.

## Site

The pages follow `docs/ux-spec.md`: a masthead with the site name and subject, one page header with the rules stamp, cards named by a noun phrase with a computed takeaway, a glyph legend, a collapsed "How to read" note, and glossary words linked to the method page through the `Term` component. Charts below their minimum n sit in one "Waiting for data" card.

## Pipeline order

fetch-archive, fetch-posts, paid capture (browser session), coverage, build-packets, census extraction (agents), census-merge, import-timeline, import-comparators, build-coding-packets, coder A and coder B (agents), prefilter-audit (coder B's admission check of the set-aside sample), consolidate-registry prep, assemble and apply (a grouping agent with the scope gate, then entry-writing agents, in between), build-tiebreak-packet, tiebreak coder C (agent), intake-merge, freeze, build-resolution-packets, resolver (agents), apply-outcomes, build-recheck-packets, rechecker (agents), apply-rechecks, snapshot, build. Every script appends to `data/audit/log.jsonl`.
