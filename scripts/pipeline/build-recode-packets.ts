// Re-coding packets: statements a release coded as not admitted for a given reason, packed again for two coders
// who now see the full registry. Release 1.0 coders worked with an empty registry and proposed events as they went,
// so a claim that names an event the registry now holds may have been read as VAGUE. The packets carry the earlier
// reason so the coder knows what to test again. Writes data/intake/packets/recode-NN.json (numbering continues).
// Usage: tsx scripts/pipeline/build-recode-packets.ts <slug> <REASON[,REASON]> [size]
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";

type Row = { id: string; forecaster: string; statement_date: string; quote: string; context?: string; source: { url: string; title: string; type: string; post_slug?: string }; extraction: { area_guess?: string; note?: string }; finder: { horizon_text: string; confidence_phrase: string; entities: string[] }; prefilter: { code: string } | null };
type Statement = { id: string; status: string; reason_code?: string };

const slug = process.argv[2];
const reasons = new Set((process.argv[3] ?? "VAGUE").split(","));
const SIZE = Number(process.argv[4] ?? 40);
if (!slug) { console.error("usage: build-recode-packets.ts <slug> <REASON[,REASON]> [size]"); process.exit(2); }
const census = readJson<Row[]>(rel(`data/census/${slug}.json`));
const statements = new Map(readJson<Statement[]>(rel(`data/statements/${slug}.json`)).map((s) => [s.id, s]));
const forecasters = readJson<{ slug: string; affiliations: unknown[] }[]>(rel("data/forecasters.json"));
const dir = rel("data/intake/packets");
fs.mkdirSync(dir, { recursive: true });
// statements already re-coded (a coder-a-recode file holds them) are not packed again
const done = new Set<string>();
const codedDir = rel("data/intake/coded");
if (fs.existsSync(codedDir)) for (const f of fs.readdirSync(codedDir).filter((x) => x.startsWith("coder-a-recode-") && x.endsWith(".json"))) for (const r of readJson<{ records: { id: string }[] }>(rel("data/intake/coded", f)).records ?? []) done.add(r.id.replace(/-[ab]$/, ""));
const pool = census.filter((r) => !r.prefilter && !done.has(r.id)).filter((r) => { const s = statements.get(r.id); return s && s.status === "not_admitted" && s.reason_code && reasons.has(s.reason_code); });
const view = (r: Row) => ({ id: r.id, forecaster: r.forecaster, statement_date: r.statement_date, quote: r.quote, context: r.context ?? "", post_title: r.source.title, source_url: r.source.url, area_guess: r.extraction.area_guess ?? "", horizon_text: r.finder.horizon_text, confidence_phrase: r.finder.confidence_phrase, entities: r.finder.entities, finder_note: r.extraction.note ?? "", earlier_reason: statements.get(r.id)?.reason_code ?? "" });
let n = fs.readdirSync(dir).filter((x) => /^recode-\d+\.json$/.test(x)).reduce((m, x) => Math.max(m, Number(x.slice(7, -5))), 0);
const packets: string[] = [];
for (let i = 0; i < pool.length; i += SIZE) {
  n++;
  const name = `recode-${String(n).padStart(2, "0")}.json`;
  writeJson(rel("data/intake/packets", name), { packet: name, note: `re-coding pass: statements not admitted in release 1.0 as ${[...reasons].join("/")}, read again against the full registry`, affiliations: Object.fromEntries(forecasters.map((f) => [f.slug, f.affiliations])), statements: pool.slice(i, i + SIZE).map(view) });
  packets.push(name);
}
appendAudit({ script: "build-recode-packets", forecaster: slug, reasons: [...reasons], statements: pool.length, packets: packets.length });
console.log(`recode packets: ${packets.length} (${pool.length} statements): ${packets.join(", ")}`);
