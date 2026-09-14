// Import a verified sweep file (data/research/comparator-<slug>-sweep2.json or owen-offsite-sweep.json) into the
// census as new rows. Existing rows keep their ids; new rows continue the numbering. A row whose quote already
// exists in the census (same normalized wording, or one contains the other) is skipped. Low-confidence rows
// (paraphrase, not the person's own words) enter with the PARAPHRASE prefilter: shown, never coded.
// Usage: tsx scripts/pipeline/import-sweep.ts <slug> <research file> [run id]
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit, norm } from "./common";

interface P { date: string; quote: string; paraphrase: string; source_title: string; source_url: string; source_type: string; area: string; ptype: string; horizon: string; confidence_language: string; specificity: number; source_confidence: string; note?: string }
type Row = { id: string; forecaster: string; statement_date: string; date_precision?: "day" | "month"; quote: string; context?: string; source: Record<string, unknown>; extraction: Record<string, unknown>; finder: Record<string, unknown>; prefilter: { code: string } | null };

const TYPE: Record<string, string> = { own_post: "own_post", interview: "interview", article: "article", conference: "conference", podcast: "podcast", video: "talk", talk: "talk", social: "tweet", tweet: "tweet", filing: "filing", press: "article", other: "other" };
const slug = process.argv[2] as "owen" | "angermayer" | "doblin";
const file = process.argv[3];
const run = process.argv[4] ?? "sweep2-2026-09-14";
if (!slug || !file) { console.error("usage: import-sweep.ts <slug> <research file> [run id]"); process.exit(2); }
const censusPath = rel(`data/census/${slug}.json`);
const census = fs.existsSync(censusPath) ? readJson<Row[]>(censusPath) : [];
const src = readJson<{ predictions: P[] }>(rel(file)).predictions;
const existing = census.map((r) => norm(r.quote));
const seen = (q: string): boolean => existing.some((e) => e === q || e.includes(q) || q.includes(e));
let next = census.reduce((m, r) => Math.max(m, Number(r.id.slice(slug.length + 1))), 0) + 1;
let added = 0, skipped = 0, paraphrase = 0, tooShort = 0;
const sorted = [...src].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
for (const p of sorted) {
  const month = /^\d{4}-\d{2}$/.test(p.date);
  const date = month ? `${p.date}-01` : p.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; console.warn(`skip (date ${p.date}): ${p.quote.slice(0, 60)}`); continue; }
  const isPara = /^PARAPHRASE/i.test(p.quote.trim()) || p.source_confidence === "low";
  const quote = p.quote.replace(/^PARAPHRASE:\s*/i, "").trim().replace(/\s+/g, " ").slice(0, 600);
  if (quote.length < 12) { tooShort++; continue; }
  const nq = norm(quote);
  if (seen(nq)) { skipped++; continue; }
  existing.push(nq);
  if (isPara) paraphrase++;
  const row: Row = {
    id: `${slug}-${String(next++).padStart(4, "0")}`, forecaster: slug, statement_date: date, date_precision: month ? "month" : "day",
    quote, context: (p.paraphrase ?? "").slice(0, 600),
    source: { url: p.source_url, title: (p.source_title ?? "").slice(0, 300), type: TYPE[p.source_type] ?? "other", accessed: "2026-09-14" },
    extraction: { run, sincere: true, own_claim: !isPara, normative: false, forward_looking: true, area_guess: p.area, note: `source confidence ${p.source_confidence}; ${p.ptype}${p.note ? "; " + p.note.slice(0, 200) : ""}`.slice(0, 300) },
    finder: { horizon_text: p.horizon ?? "none", confidence_phrase: p.confidence_language ?? "none", entities: [], runs: [run] },
    prefilter: isPara ? { code: "PARAPHRASE" } : null,
  };
  census.push(row);
  added++;
}
writeJson(censusPath, census);
appendAudit({ script: "import-sweep", forecaster: slug, file, added, skipped, paraphrase, too_short: tooShort, total: census.length });
console.log(`${slug}: ${added} rows added (${paraphrase} paraphrase-only), ${skipped} skipped as duplicates or undated, ${tooShort} too short; census now ${census.length}`);
