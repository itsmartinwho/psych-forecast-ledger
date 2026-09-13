// Fetch every free post body from the Substack API into data/raw/posts/<slug>.json.
// Serial, one request per second, resumable (skips slugs already stored with a body).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getJson, retryCount } from "./lib/http";
import { htmlToText } from "./lib/html-to-text";

const HOST = "https://thefrontierpsychiatrists.substack.com";
const ROOT = path.resolve(__dirname, "..");
const ARCHIVE = path.join(ROOT, "data/raw/archive.json");
const OUT = path.join(ROOT, "data/raw/posts");

type ArchiveRow = { id: number; slug: string; title: string; post_date: string; audience: string; canonical_url: string; wordcount: number | null; type: string };
type PostApi = { id: number; slug: string; title: string; subtitle?: string; post_date: string; audience: string; canonical_url: string; wordcount: number | null; body_html: string | null; type: string };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const archive: ArchiveRow[] = JSON.parse(fs.readFileSync(ARCHIVE, "utf8"));
  const rows = process.argv.includes("--all") ? archive : archive.filter((r) => r.audience === "everyone");
  let done = 0, skipped = 0;
  const failed: string[] = [];
  const started = Date.now();
  for (const row of rows) {
    const file = path.join(OUT, `${row.slug}.json`);
    if (fs.existsSync(file)) {
      try {
        const prev = JSON.parse(fs.readFileSync(file, "utf8"));
        if (prev.body_html && prev.body_html.length > 0) { skipped++; continue; }
      } catch { /* refetch */ }
    }
    try {
      const p = await getJson<PostApi>(`${HOST}/api/v1/posts/${row.slug}`);
      const body_html = p.body_html ?? "";
      const text = htmlToText(body_html);
      const words = text.split(/\s+/).filter(Boolean).length;
      const rec = {
        id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle ?? null, post_date: p.post_date, audience: p.audience,
        type: p.type, canonical_url: p.canonical_url, wordcount: p.wordcount,
        source: "api" as const, fetched_at: new Date().toISOString(),
        body_sha256: createHash("sha256").update(body_html).digest("hex"),
        text_words: words,
        complete: body_html.length > 0 && (p.audience === "everyone" || (p.wordcount ?? 0) * 0.8 <= words),
        body_html, text,
      };
      fs.writeFileSync(file, JSON.stringify(rec));
      done++;
      if (done % 25 === 0) console.error(`${done} fetched, ${skipped} skipped, ${failed.length} failed, ${retryCount()} retries, ${Math.round((Date.now() - started) / 1000)}s`);
    } catch (e) {
      failed.push(row.slug);
      console.error(`FAILED ${row.slug}: ${(e as Error).message}`);
    }
  }
  console.error(`DONE fetched=${done} skipped=${skipped} failed=${failed.length} retries=${retryCount()}`);
  if (failed.length) console.error("failed slugs:", failed.join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
