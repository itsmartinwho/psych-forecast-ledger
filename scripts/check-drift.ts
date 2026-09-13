// Recomputes the snapshot and compares it with the committed data/generated/scores.json.
// Prints the top-level keys that differ; exit 1 on any difference or when no snapshot is committed.
// Usage: tsx scripts/check-drift.ts [--root <dir>]
// No side effects on import; main() runs only under tsx.
import fs from "node:fs";
import { readJsonFile } from "@/lib/data/load";
import { PATHS, dataFile, resolveDataRoot } from "@/lib/data/paths";
import { snapshotText, sortKeys } from "./snapshot";

export interface DriftReport { file: string; committed: boolean; changed: string[]; added: string[]; removed: string[] }

export function checkDrift(root?: string): DriftReport {
  const r = resolveDataRoot(root);
  const file = dataFile(r, PATHS.scores);
  if (!fs.existsSync(file)) return { file, committed: false, changed: [], added: [], removed: [] };
  const read = readJsonFile(file);
  if (!read.ok) throw new Error(`${file}: ${read.message}`);
  const committed = (sortKeys(read.value) ?? {}) as Record<string, unknown>;
  const fresh = JSON.parse(snapshotText(r)) as Record<string, unknown>;
  const changed: string[] = [], added: string[] = [], removed: string[] = [];
  for (const k of [...new Set([...Object.keys(committed), ...Object.keys(fresh)])].sort()) {
    if (!(k in committed)) added.push(k);
    else if (!(k in fresh)) removed.push(k);
    else if (JSON.stringify(committed[k]) !== JSON.stringify(fresh[k])) changed.push(k);
  }
  return { file, committed: true, changed, added, removed };
}

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const d = checkDrift(argAfter("--root"));
  if (!d.committed) {
    console.error(`no snapshot at ${d.file}; run pnpm snapshot`);
    process.exit(1);
  }
  const diff = d.changed.length + d.added.length + d.removed.length;
  if (diff === 0) {
    console.log(`snapshot matches ${d.file}`);
    return;
  }
  if (d.changed.length) console.log(`changed: ${d.changed.join(", ")}`);
  if (d.added.length) console.log(`added (not in committed file): ${d.added.join(", ")}`);
  if (d.removed.length) console.log(`removed (only in committed file): ${d.removed.join(", ")}`);
  console.error(`snapshot drift in ${diff} top-level key${diff === 1 ? "" : "s"}; run pnpm snapshot and commit the result`);
  process.exit(1);
}

if (process.argv[1] && /check-drift\.ts$/.test(process.argv[1])) main();
