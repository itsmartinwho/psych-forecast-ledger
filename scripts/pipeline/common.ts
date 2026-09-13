import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const ROOT = path.resolve(__dirname, "../..");
export const rel = (...p: string[]) => path.join(ROOT, ...p);
export const readJson = <T = unknown>(p: string): T => JSON.parse(fs.readFileSync(p, "utf8")) as T;
export const writeJson = (p: string, v: unknown) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 1) + "\n"); };
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Normalization used for quote verification: curly quotes, dashes, ellipses and whitespace. */
export const norm = (s: string) =>
  s.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/…/g, "...").replace(/[–—]/g, "-").replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase();

const textCache = new Map<string, { text: string; rec: RawPost } | null>();
export interface RawPost { slug: string; title: string; post_date: string; audience: string; type: string; canonical_url: string; text: string; text_words?: number; complete?: boolean }
export function rawPost(slug: string): { text: string; rec: RawPost } | null {
  if (textCache.has(slug)) return textCache.get(slug)!;
  for (const dir of ["data/raw/posts", "data/raw/paid"]) {
    const f = rel(dir, `${slug}.json`);
    if (fs.existsSync(f)) { const rec = readJson<RawPost>(f); const v = { text: norm(rec.text ?? ""), rec }; textCache.set(slug, v); return v; }
  }
  textCache.set(slug, null);
  return null;
}

/** A quote verifies when every " ... " part is a substring of the normalized post text. */
export function quoteVerifies(quote: string, text: string): boolean {
  const parts = norm(quote).split(" ... ").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((p) => p.length >= 6 && text.includes(p));
}

export function appendAudit(entry: Record<string, unknown>) {
  fs.mkdirSync(rel("data/audit"), { recursive: true });
  fs.appendFileSync(rel("data/audit/log.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
}

export const isoDate = (d: string): string => d.slice(0, 10);
