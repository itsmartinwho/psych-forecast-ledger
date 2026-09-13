// Validate extraction agent output: JSON shape, every post covered, every quote a substring of the cached text.
// Usage: tsx scripts/check-extraction.ts data/statements/raw/extract-free-01.json [...]
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(__dirname, "..");
const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
const textOf = (slug: string): string | null => {
  for (const dir of ["data/raw/posts", "data/raw/paid"]) {
    const f = path.join(ROOT, dir, `${slug}.json`);
    if (fs.existsSync(f)) return norm(JSON.parse(fs.readFileSync(f, "utf8")).text ?? "");
  }
  return null;
};
let totalOk = 0, totalBad = 0;
for (const file of process.argv.slice(2)) {
  let j: any;
  try { j = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log(`${file}: INVALID JSON ${(e as Error).message}`); continue; }
  const packetName: string = j.packet ?? path.basename(file, ".json") + ".md";
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/packets", packetName.replace(/-\d+\.md$/, "-index.json")), "utf8"));
  const expected: string[] = (idx.find((p: any) => p.packet === packetName)?.posts ?? []).map((p: any) => p.slug);
  const covered = new Set((j.posts ?? []).map((p: any) => p.slug));
  const missingPosts = expected.filter((s) => !covered.has(s));
  let ok = 0; const bad: string[] = [];
  for (const s of j.statements ?? []) {
    const text = textOf(s.post_slug);
    if (!text) { bad.push(`${s.post_slug}: no cached text`); continue; }
    const parts = norm(String(s.quote ?? "")).split(" ... ");
    if (parts.length && parts.every((p) => p.length >= 6 && text.includes(p))) ok++; else bad.push(`${s.post_slug}: "${String(s.quote).slice(0, 80)}"`);
  }
  totalOk += ok; totalBad += bad.length;
  console.log(`${path.basename(file)}: posts ${covered.size}/${expected.length}${missingPosts.length ? " MISSING " + missingPosts.join(",") : ""} · statements ${j.statements?.length ?? 0} · quotes verified ${ok} · unverified ${bad.length}`);
  for (const b of bad.slice(0, 8)) console.log("   " + b);
}
console.log(`total verified ${totalOk}, unverified ${totalBad}`);
