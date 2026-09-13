// Rebuild data/raw/archive.json as the union of archive pages fetched with two page sizes.
// The Substack archive endpoint drops rows at some offsets (offset 0 with limit 30 returned 23 rows),
// so two passes with different page sizes are unioned by post id.
import fs from "node:fs";
import path from "node:path";
import { getJson } from "./lib/http";

const HOST = "https://thefrontierpsychiatrists.substack.com";
const OUT = path.resolve(__dirname, "../data/raw/archive.json");

type Row = Record<string, unknown> & { id: number; slug: string; post_date: string; audience: string; type: string; title: string; canonical_url: string; wordcount: number | null };

async function page(limit: number): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; offset < 5000; offset += limit) {
    const batch = await getJson<Row[]>(`${HOST}/api/v1/archive?sort=new&offset=${offset}&limit=${limit}`);
    if (!batch.length) break;
    rows.push(...batch);
  }
  return rows;
}

async function main() {
  const existing: Row[] = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
  const byId = new Map<number, Row>(existing.map((r) => [r.id, r]));
  for (const limit of [50, 12]) {
    const rows = await page(limit);
    console.error(`limit=${limit}: ${rows.length} rows`);
    for (const r of rows) byId.set(r.id, r);
  }
  const slim = [...byId.values()]
    .map((r) => ({
      id: r.id, slug: r.slug, title: r.title, subtitle: (r as { subtitle?: string }).subtitle ?? null,
      post_date: r.post_date, audience: r.audience, type: r.type, canonical_url: r.canonical_url,
      wordcount: r.wordcount ?? null, description: (r as { description?: string }).description ?? null,
      tags: ((r as { postTags?: { name: string }[] }).postTags ?? []).map((t) => t.name),
    }))
    .sort((a, b) => (a.post_date < b.post_date ? 1 : -1));
  fs.writeFileSync(OUT, JSON.stringify(slim, null, 1));
  const aud: Record<string, number> = {};
  for (const r of slim) aud[r.audience] = (aud[r.audience] ?? 0) + 1;
  console.error(`archive.json: ${slim.length} unique posts`, aud);
}
main().catch((e) => { console.error(e); process.exit(1); });
