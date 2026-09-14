// Coding packets: statements to code (no prefilter) in packets of N, plus a seeded 20 percent sample of
// prefiltered rejects for coder B's admission check. Writes data/intake/packets/code-NN.json and sample-b.json.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
import { mulberry32 } from "../../lib/tokens";
const SIZE = Number((process.argv.find((a) => /^\d+$/.test(a)) ?? 40));
// --new: keep the existing packets and coder files; write packets only for statements no coder-A file has coded,
// numbered after the highest existing packet. Used for the sweep rows added after release 1.0.
const onlyNew = process.argv.includes("--new");
type Row = { id: string; forecaster: string; statement_date: string; quote: string; context?: string; source: { url: string; title: string; type: string; post_slug?: string }; extraction: { area_guess?: string; note?: string }; finder: { horizon_text: string; confidence_phrase: string; entities: string[] }; prefilter: { code: string } | null };
const rows: Row[] = [];
for (const f of ["owen", "angermayer", "doblin"]) { const p = rel(`data/census/${f}.json`); if (fs.existsSync(p)) rows.push(...readJson<Row[]>(p)); }
const forecasters = readJson<{ slug: string; name: string; affiliations: { entity: string; role: string; aliases: string[] }[] }[]>(rel("data/forecasters.json"));
const view = (r: Row) => ({ id: r.id, forecaster: r.forecaster, statement_date: r.statement_date, quote: r.quote, context: r.context ?? "", post_title: r.source.title, source_url: r.source.url, area_guess: r.extraction.area_guess ?? "", horizon_text: r.finder.horizon_text, confidence_phrase: r.finder.confidence_phrase, entities: r.finder.entities, finder_note: r.extraction.note ?? "" });
const dir = rel("data/intake/packets");
const codedDir = rel("data/intake/coded");
const coded = new Set<string>();
if (onlyNew && fs.existsSync(codedDir)) for (const f of fs.readdirSync(codedDir).filter((x) => x.startsWith("coder-a-") && x.endsWith(".json"))) for (const r of readJson<{ records: { id: string }[] }>(rel("data/intake/coded", f)).records ?? []) coded.add(r.id.replace(/-[ab]$/, ""));
const toCode = rows.filter((r) => !r.prefilter && !(onlyNew && coded.has(r.id)));
let first = 1;
if (onlyNew) { fs.mkdirSync(dir, { recursive: true }); first = fs.readdirSync(dir).filter((x) => /^code-\d+\.json$/.test(x)).reduce((m, x) => Math.max(m, Number(x.slice(5, -5))), 0) + 1; }
else { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }
const packets: string[] = [];
for (let i = 0; i < toCode.length; i += SIZE) {
  const name = `code-${String(Math.floor(i / SIZE) + first).padStart(2, "0")}.json`;
  writeJson(rel("data/intake/packets", name), { packet: name, affiliations: Object.fromEntries(forecasters.map((f) => [f.slug, f.affiliations])), statements: toCode.slice(i, i + SIZE).map(view) });
  packets.push(name);
}
// seeded 20 percent sample of prefiltered rejects, minimum 50, for coder B only (not rebuilt under --new)
const rejects = onlyNew ? [] : rows.filter((r) => r.prefilter);
const rnd = mulberry32(20260913);
const shuffled = [...rejects].sort(() => rnd() - 0.5);
const sample = shuffled.slice(0, Math.max(50, Math.ceil(rejects.length * 0.2))).map(view);
if (!onlyNew) writeJson(rel("data/intake/packets", "sample-b.json"), { packet: "sample-b.json", note: "prefiltered rejects: coder B decides admission only", affiliations: Object.fromEntries(forecasters.map((f) => [f.slug, f.affiliations])), statements: sample });
appendAudit({ script: "build-coding-packets", to_code: toCode.length, packets: packets.length, reject_sample: sample.length, rejects: rejects.length });
console.log(`coding packets: ${packets.length} (${toCode.length} statements), reject sample ${sample.length} of ${rejects.length}`);
