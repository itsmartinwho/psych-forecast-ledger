// Census merge: extraction outputs (data/statements/raw/extract-*.json) plus the research seed
// (data/research/owen-candidates.json) become one census file: data/census/owen.json.
// Every quote is verified against the cached post text; duplicates collapse; ids are assigned in date order.
import fs from "node:fs";
import { ROOT, rel, readJson, writeJson, norm, rawPost, quoteVerifies, appendAudit, sha256 } from "./common";

interface RawStatement { post_slug: string; quote: string; context?: string; sincere?: boolean; own_claim?: boolean; normative?: boolean; forward_looking?: boolean; area_guess?: string; horizon_text?: string; confidence_phrase?: string; entities?: string[]; note?: string }
interface Extraction { run: string; packet: string; posts: { slug: string; read: boolean; statements_found: number }[]; statements: RawStatement[] }
interface ResearchCandidate { slug: string; post_date: string; url: string; quote: string; paraphrase: string; area: string; ptype: string; horizon: string; confidence_language: string; direction: string; specificity: number; satire_or_irony: boolean; is_author_claim: boolean; resolution_hint?: string; entities?: string[] }

export interface CensusRow {
  id: string; forecaster: "owen"; statement_date: string; quote: string; context?: string;
  source: { url: string; title: string; type: "substack_post" | "substack_podcast" | "substack_video" | "substack_thread"; post_slug: string; audience: "everyone" | "only_paid" | "founding" };
  extraction: { run: string; sincere: boolean; own_claim: boolean; normative: boolean; forward_looking: boolean; area_guess?: string; note?: string };
  finder: { horizon_text: string; confidence_phrase: string; entities: string[]; runs: string[] };
  prefilter: { code: "SATIRE" | "THIRD_PARTY" | "NORMATIVE" | "NOT_FORECAST" } | null;
}

const rawDir = rel("data/statements/raw");
const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).filter((f) => /^extract-.*\.json$/.test(f)).sort() : [];
const drafts: (Omit<CensusRow, "id"> & { key: string; order: number })[] = [];
const readPosts = new Set<string>();
let unverified = 0, dupes = 0, order = 0;

function typeOf(t: string): CensusRow["source"]["type"] { return t === "podcast" ? "substack_podcast" : t === "video" ? "substack_video" : t === "thread" ? "substack_thread" : "substack_post"; }

function add(slug: string, quote: string, run: string, fields: Partial<Omit<CensusRow, "id" | "source" | "statement_date" | "quote">> & { context?: string; horizon_text?: string; confidence_phrase?: string; entities?: string[]; sincere: boolean; own_claim: boolean; normative: boolean; forward_looking: boolean; area_guess?: string; note?: string }) {
  const post = rawPost(slug);
  if (!post) { unverified++; return; }
  const q = quote.trim().replace(/\s+/g, " ");
  if (q.length < 12 || !quoteVerifies(q, post.text)) { unverified++; return; }
  const clipped = q.length > 600 ? q.slice(0, 597).replace(/\s+\S*$/, "") + "..." : q;
  const nq = norm(clipped);
  // duplicate: same post and one quote contains the other (or 80 percent token overlap)
  for (const d of drafts) {
    if (d.source.post_slug !== slug) continue;
    const a = norm(d.quote), b = nq;
    const tokensA = new Set(a.split(" ")), tokensB = b.split(" ");
    const overlap = tokensB.filter((t) => tokensA.has(t)).length / Math.max(1, Math.min(tokensA.size, tokensB.length));
    if (a.includes(b) || b.includes(a) || overlap >= 0.8) { dupes++; if (!d.finder.runs.includes(run)) d.finder.runs.push(run); if (b.length > a.length) d.quote = clipped; return; }
  }
  const rec = post.rec;
  drafts.push({
    key: `${slug}|${nq.slice(0, 60)}`, order: order++,
    forecaster: "owen", statement_date: rec.post_date.slice(0, 10), quote: clipped, context: fields.context?.slice(0, 600),
    source: { url: `https://thefrontierpsychiatrists.substack.com/p/${slug}`, title: rec.title.slice(0, 300), type: typeOf(rec.type), post_slug: slug, audience: rec.audience as CensusRow["source"]["audience"] },
    extraction: { run, sincere: fields.sincere, own_claim: fields.own_claim, normative: fields.normative, forward_looking: fields.forward_looking, area_guess: fields.area_guess, note: fields.note?.slice(0, 300) },
    finder: { horizon_text: fields.horizon_text ?? "none", confidence_phrase: fields.confidence_phrase ?? "none", entities: fields.entities ?? [], runs: [run] },
    prefilter: !fields.sincere ? { code: "SATIRE" } : !fields.own_claim ? { code: "THIRD_PARTY" } : fields.normative ? { code: "NORMATIVE" } : !fields.forward_looking ? { code: "NOT_FORECAST" } : null,
  });
}

for (const f of files) {
  const x = readJson<Extraction>(rel("data/statements/raw", f));
  for (const p of x.posts ?? []) if (p.read !== false) readPosts.add(p.slug);
  for (const s of x.statements ?? []) add(s.post_slug, s.quote, x.run ?? f, { context: s.context, sincere: s.sincere !== false, own_claim: s.own_claim !== false, normative: s.normative === true, forward_looking: s.forward_looking !== false, area_guess: s.area_guess, horizon_text: s.horizon_text, confidence_phrase: s.confidence_phrase, entities: s.entities, note: s.note });
}
const fromExtraction = drafts.length;
// research seed: the 640 read-only candidates of 2026-09-13, verified the same way
const seed = readJson<{ candidates: ResearchCandidate[] }>(rel("data/research/owen-candidates.json")).candidates;
for (const c of seed) add(c.slug, c.quote, "research-2026-09-13", { context: c.paraphrase, sincere: !c.satire_or_irony, own_claim: c.is_author_claim, normative: false, forward_looking: true, area_guess: c.area, horizon_text: c.horizon, confidence_phrase: c.confidence_language, entities: c.entities, note: c.resolution_hint ? `hint: ${c.resolution_hint}` : undefined });

drafts.sort((a, b) => (a.statement_date < b.statement_date ? -1 : a.statement_date > b.statement_date ? 1 : a.source.post_slug < b.source.post_slug ? -1 : a.source.post_slug > b.source.post_slug ? 1 : a.order - b.order));
const rows: CensusRow[] = drafts.map((d, i) => { const { key, order, ...rest } = d; void key; void order; return { id: `owen-${String(i + 1).padStart(4, "0")}`, ...rest }; });
writeJson(rel("data/census/owen.json"), rows);
const toCode = rows.filter((r) => !r.prefilter).length;
const summary = { files: files.length, posts_read: readPosts.size, statements: rows.length, from_extraction: fromExtraction, from_research_only: rows.length - fromExtraction, duplicates_collapsed: dupes, unverified_dropped: unverified, prefiltered: rows.length - toCode, to_code: toCode };
appendAudit({ script: "census-merge", ...summary, output_sha256: sha256(JSON.stringify(rows)) });
console.log(JSON.stringify(summary));
void ROOT;
