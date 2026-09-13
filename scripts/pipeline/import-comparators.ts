// Import the sourced comparator ledgers of the research scan as census rows (own words only are codable;
// paraphrases are logged with the PARAPHRASE code). Outcome guesses in the research file are NOT copied:
// the coders and the resolver never see them.
import { rel, readJson, writeJson, appendAudit } from "./common";
interface P { date: string; quote: string; paraphrase: string; source_title: string; source_url: string; source_type: string; area: string; ptype: string; horizon: string; confidence_language: string; specificity: number; source_confidence: string }
const TYPE: Record<string, string> = { own_post: "own_post", interview: "interview", article: "article", conference: "conference", podcast: "podcast", video: "talk", social: "tweet", filing: "filing" };
for (const slug of ["angermayer", "doblin"] as const) {
  const src = readJson<{ predictions: P[] }>(rel(`data/research/comparator-${slug}.json`)).predictions;
  const rows = [...src]
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date < b.p.date ? -1 : a.p.date > b.p.date ? 1 : a.i - b.i))
    .map(({ p }, i) => {
      const month = /^\d{4}-\d{2}$/.test(p.date);
      const date = month ? `${p.date}-01` : p.date;
      const paraphrase = /^PARAPHRASE/i.test(p.quote.trim()) || p.source_confidence === "low";
      const quote = p.quote.replace(/^PARAPHRASE:\s*/i, "").trim().slice(0, 600);
      return {
        id: `${slug}-${String(i + 1).padStart(4, "0")}`, forecaster: slug, statement_date: date, date_precision: month ? "month" : "day",
        quote: quote.length >= 12 ? quote : `${quote} (source: ${p.source_title})`.slice(0, 600),
        context: p.paraphrase.slice(0, 600),
        source: { url: p.source_url, title: p.source_title.slice(0, 300), type: TYPE[p.source_type] ?? "other", accessed: "2026-09-13" },
        extraction: { run: "research-2026-09-13", sincere: true, own_claim: !paraphrase, normative: false, forward_looking: true, area_guess: p.area, note: `source confidence ${p.source_confidence}; ${p.ptype}` },
        finder: { horizon_text: p.horizon ?? "none", confidence_phrase: p.confidence_language ?? "none", entities: [], runs: ["research-2026-09-13"] },
        prefilter: paraphrase ? { code: "PARAPHRASE" } : null,
      };
    });
  writeJson(rel(`data/census/${slug}.json`), rows);
  appendAudit({ script: "import-comparators", forecaster: slug, rows: rows.length, paraphrase: rows.filter((r) => r.prefilter).length });
  console.log(`${slug}: ${rows.length} census rows, ${rows.filter((r) => r.prefilter).length} paraphrase-only`);
}
