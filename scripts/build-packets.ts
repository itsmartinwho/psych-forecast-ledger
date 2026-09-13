// Census packets for the extraction agents: N posts per Markdown file, oldest first, with a JSON index.
// Reads free bodies (data/raw/posts) and paid bodies (data/raw/paid, complete only). Restacks are excluded.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(__dirname, "..");
const WORDS = Number(process.argv[2] ?? 15000);
const MAX_POSTS = 15;
const only = process.argv.includes("--paid") ? "paid" : process.argv.includes("--free") ? "free" : "all";
const prefix = only === "all" ? "extract" : `extract-${only}`;
type Row = { slug: string; audience: string; type: string; post_date: string; title: string; wordcount: number | null; canonical_url: string };
const archive: Row[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/archive.json"), "utf8"));
const read = (dir: string, slug: string) => { const f = path.join(ROOT, dir, `${slug}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const posts = archive
  .filter((r) => r.type !== "restack")
  .sort((a, b) => (a.post_date < b.post_date ? -1 : 1))
  .map((r) => ({ row: r, rec: read("data/raw/posts", r.slug) ?? read("data/raw/paid", r.slug) }))
  .filter((p) => p.rec && p.rec.text && p.rec.text.trim().length > 0 && (p.row.audience === "everyone" || p.rec.complete !== false))
  .filter((p) => only === "all" || (only === "free" ? p.row.audience === "everyone" : p.row.audience !== "everyone"));
const dir = path.join(ROOT, "data/raw/packets");
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (f.startsWith(prefix + "-") || f === `${prefix}-index.json`) fs.rmSync(path.join(dir, f));
const index: { packet: string; posts: { slug: string; date: string; words: number }[] }[] = [];
const chunks: typeof posts[] = [];
let cur: typeof posts = [], curWords = 0;
for (const p of posts) {
  const w = p.rec.text_words ?? 0;
  if (cur.length > 0 && (curWords + w > WORDS || cur.length >= MAX_POSTS)) { chunks.push(cur); cur = []; curWords = 0; }
  cur.push(p); curWords += w;
}
if (cur.length) chunks.push(cur);
for (let c = 0; c < chunks.length; c++) {
  const chunk = chunks[c];
  const name = `${prefix}-${String(c + 1).padStart(2, "0")}.md`;
  const lines: string[] = [`# Packet ${name} · ${chunk.length} posts by Owen Scott Muir · The Frontier Psychiatrists`, ""];
  chunk.forEach((p, k) => {
    lines.push(`\n\n======== POST ${k + 1} of ${chunk.length} ========`);
    lines.push(`slug: ${p.row.slug}`);
    lines.push(`date: ${p.row.post_date.slice(0, 10)}`);
    lines.push(`title: ${p.row.title}`);
    lines.push(`audience: ${p.row.audience}`);
    lines.push(`type: ${p.row.type}`);
    lines.push(`url: https://thefrontierpsychiatrists.substack.com/p/${p.row.slug}`);
    lines.push(`words: ${p.rec.text_words ?? ""}`);
    lines.push(`---- text ----`);
    lines.push(String(p.rec.text).trim());
    lines.push(`---- end ----`);
  });
  fs.writeFileSync(path.join(dir, name), lines.join("\n"));
  index.push({ packet: name, posts: chunk.map((p) => ({ slug: p.row.slug, date: p.row.post_date.slice(0, 10), words: p.rec.text_words ?? 0 })) });
}
fs.writeFileSync(path.join(dir, `${prefix}-index.json`), JSON.stringify(index, null, 1));
console.log(`packets: ${index.length} files, ${posts.length} posts, ${posts.reduce((s, p) => s + (p.rec.text_words ?? 0), 0)} words`);
