// Save the text of one paid post captured in the user's logged-in browser session into data/raw/paid/<slug>.json.
// Usage: tsx scripts/save-post-text.ts --slug <slug> --file <path-to-text-file>
// Refuses a paywall stub: the text must reach 80 percent of the archive word count and must not end in the paywall marker.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const get = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const slug = get("--slug");
const file = get("--file");
if (!slug || !file) { console.error("usage: --slug <slug> --file <text file>"); process.exit(2); }
const archive: { slug: string; title: string; post_date: string; audience: string; wordcount: number | null; canonical_url: string; type: string; id: number; subtitle?: string | null }[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/archive.json"), "utf8"));
const row = archive.find((r) => r.slug === slug);
if (!row) { console.error(`unknown slug ${slug}`); process.exit(2); }
let text = fs.readFileSync(file, "utf8").replace(/\r/g, "").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
// strip Substack chrome that get_page_text tends to include before the title and after the body
const titleIdx = text.indexOf(row.title);
if (titleIdx > 0 && titleIdx < 600) text = text.slice(titleIdx);
// Cut only trailing page chrome: a footer marker that starts in the last quarter of the text.
const footerMarkers = [/\nDiscussion about this post\b/, /\nReady for more\?/, /\nShare this post\n/, /\nComments\n/, /\nPrevious\nNext\n/, /\n© \d{4} Owen Scott Muir/];
for (const m of footerMarkers) {
  const hit = text.search(m);
  if (hit > text.length * 0.75) text = text.slice(0, hit).trim();
}
// Inline subscribe widgets ("Subscribe" / "Subscribed" / "Type your email...") appear mid-article; drop those short lines only.
text = text.split("\n").filter((line) => !/^(Subscribe|Subscribed|Type your email\.{0,3}|Share|Share this post|Copy link|Facebook|Email|Notes|More|Leave a comment|Get more from .* in the Substack app|Learn more)$/.test(line.trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();
const words = text.split(/\s+/).filter(Boolean).length;
const expected = row.wordcount ?? 0;
const stubMarkers = /(This post is for paid subscribers|Claim my free post|Upgrade to paid|Already a paid subscriber\? Sign in)/i;
const complete = words >= expected * 0.8 && !stubMarkers.test(text.slice(-600));
const out = path.join(ROOT, "data/raw/paid", `${slug}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({
  id: row.id, slug, title: row.title, subtitle: row.subtitle ?? null, post_date: row.post_date, audience: row.audience, type: row.type, canonical_url: row.canonical_url, wordcount: row.wordcount,
  source: "browser_session", fetched_at: new Date().toISOString(), text_sha256: createHash("sha256").update(text).digest("hex"), text_words: words, complete, text,
}));
console.log(JSON.stringify({ slug, words, expected, complete }));
if (!complete) process.exit(1);
