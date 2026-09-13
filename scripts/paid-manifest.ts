// List paid and founding posts still missing a complete captured text: data/raw/paid-manifest.json.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(__dirname, "..");
const archive: { slug: string; title: string; post_date: string; audience: string; wordcount: number | null; canonical_url: string; type: string }[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/archive.json"), "utf8"));
const paidDir = path.join(ROOT, "data/raw/paid");
const rows = archive.filter((r) => r.audience !== "everyone").sort((a, b) => (a.post_date < b.post_date ? 1 : -1)).map((r) => {
  const f = path.join(paidDir, `${r.slug}.json`);
  let done = false, words = 0;
  if (fs.existsSync(f)) { try { const j = JSON.parse(fs.readFileSync(f, "utf8")); done = Boolean(j.complete); words = j.text_words ?? 0; } catch { /* redo */ } }
  return { slug: r.slug, title: r.title, date: r.post_date.slice(0, 10), audience: r.audience, type: r.type, wordcount: r.wordcount, url: `https://thefrontierpsychiatrists.substack.com/p/${r.slug}`, done, words };
});
fs.writeFileSync(path.join(ROOT, "data/raw/paid-manifest.json"), JSON.stringify(rows, null, 1));
const todo = rows.filter((r) => !r.done);
console.log(`paid posts ${rows.length}, complete ${rows.length - todo.length}, todo ${todo.length}`);
