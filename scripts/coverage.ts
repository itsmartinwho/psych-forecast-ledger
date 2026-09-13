// Compares raw/archive.json (every post the archive lists) with the bodies stored under raw/posts and
// raw/paid, and writes raw/coverage.json. Exit 1 when a listed post has no body unless --allow-missing.
// Usage: tsx scripts/coverage.ts [--root <dir>] [--allow-missing]
// No side effects on import: tests call computeCoverage() directly; main() runs only under tsx.
import fs from "node:fs";
import { readJsonFile } from "@/lib/data/load";
import { PATHS, dataFile, rawPostFiles, resolveDataRoot } from "@/lib/data/paths";

interface ArchiveRow { slug: string; audience?: string; post_date?: string; type?: string; wordcount?: number | null }
interface RawPost { complete?: boolean; text?: string; text_words?: number; wordcount?: number | null }
interface AudienceCount { archive: number; read: number; missing: number; incomplete: number }

/** Superset of the Coverage schema (generated_at, archive_count, read, missing, stubs, by_year, words_total) plus the plain names. */
export interface CoverageReport {
  generated_at: string;
  as_of: string;
  archive_count: number;
  archive: number;
  read: { free: number; paid: number; founding: number };
  free_read: number;
  paid_read: number;
  missing: string[];
  incomplete: string[];
  stubs: string[];
  excluded_restacks: string[];
  by_audience: Record<string, AudienceCount>;
  by_year: Record<string, number>;
  by_year_read: Record<string, number>;
  words_total: number;
}

function readVersion(root: string): string {
  const abs = dataFile(root, PATHS.version);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8").trim() : "";
}

export function computeCoverage(root?: string): CoverageReport {
  const r = resolveDataRoot(root);
  const archiveRes = readJsonFile(dataFile(r, PATHS.raw.archive));
  if (!archiveRes.ok) throw new Error(`${PATHS.raw.archive}: ${archiveRes.message}`);
  if (!Array.isArray(archiveRes.value)) throw new Error(`${PATHS.raw.archive}: expected an array of posts`);
  const rows = archiveRes.value as ArchiveRow[];
  const as_of = readVersion(r);

  const read = { free: 0, paid: 0, founding: 0 };
  const missing: string[] = [];
  const incomplete: string[] = [];
  const excluded: string[] = [];
  const by_audience: Record<string, AudienceCount> = {};
  const by_year: Record<string, number> = {};
  const by_year_read: Record<string, number> = {};
  let words_total = 0;

  for (const row of rows) {
    // Restacks carry no body of the author's own; they are listed but never expected on disk.
    if (row.type === "restack") { excluded.push(row.slug); continue; }
    const audience = row.audience ?? "everyone";
    const year = row.post_date && /^\d{4}/.test(row.post_date) ? row.post_date.slice(0, 4) : "unknown";
    const a = (by_audience[audience] ??= { archive: 0, read: 0, missing: 0, incomplete: 0 });
    a.archive += 1;
    by_year[year] = (by_year[year] ?? 0) + 1;

    let post: RawPost | null = null;
    for (const rel of rawPostFiles(row.slug)) {
      const abs = dataFile(r, rel);
      if (!fs.existsSync(abs)) continue;
      const res = readJsonFile(abs);
      if (res.ok && res.value && typeof res.value === "object") post = res.value as RawPost;
      break;
    }
    if (!post || typeof post.text !== "string" || post.text.length === 0) { missing.push(row.slug); a.missing += 1; continue; }
    a.read += 1;
    by_year_read[year] = (by_year_read[year] ?? 0) + 1;
    if (audience === "everyone") read.free += 1; else if (audience === "founding") read.founding += 1; else read.paid += 1;
    if (post.complete === false) { incomplete.push(row.slug); a.incomplete += 1; }
    words_total += post.text_words ?? post.text.split(/\s+/).filter(Boolean).length;
  }
  missing.sort();
  incomplete.sort();
  excluded.sort();
  const archive = rows.length - excluded.length;
  return {
    generated_at: as_of, as_of,
    archive_count: archive, archive,
    read, free_read: read.free, paid_read: read.paid + read.founding,
    missing, incomplete, stubs: [...incomplete], excluded_restacks: excluded,
    by_audience, by_year, by_year_read, words_total,
  };
}

export function writeCoverage(report: CoverageReport, root?: string): string {
  const file = dataFile(resolveDataRoot(root), PATHS.raw.coverage);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
  return file;
}

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const root = argAfter("--root");
  const report = computeCoverage(root);
  const file = writeCoverage(report, root);
  console.log(`archive ${report.archive} · free read ${report.free_read} · paid read ${report.paid_read} · missing ${report.missing.length} · incomplete ${report.incomplete.length} · restacks excluded ${report.excluded_restacks.length}`);
  for (const [aud, c] of Object.entries(report.by_audience)) console.log(`  ${aud.padEnd(10)} archive ${c.archive}  read ${c.read}  missing ${c.missing}  incomplete ${c.incomplete}`);
  if (report.missing.length) console.log(`missing: ${report.missing.slice(0, 20).join(", ")}${report.missing.length > 20 ? ` … ${report.missing.length - 20} more` : ""}`);
  console.log(`wrote ${file}`);
  if (report.missing.length && !process.argv.includes("--allow-missing")) process.exit(1);
}

if (process.argv[1] && /coverage\.ts$/.test(process.argv[1])) main();
