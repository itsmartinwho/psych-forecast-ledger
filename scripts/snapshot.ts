// Loads a data root, scores it, and writes data/generated/scores.json with keys in stable order.
// Usage: tsx scripts/snapshot.ts [--root <dir>] [--out <file>]
// No side effects on import: check-drift and the tests import the helpers; main() runs only under tsx.
import fs from "node:fs";
import path from "node:path";
import { loadBoth, type Dataset, type ScoreInput } from "@/lib/data/load";
import { PATHS, dataFile, resolveDataRoot } from "@/lib/data/paths";
import * as score from "@/lib/score";

/**
 * lib/score's entry is computeSnapshot(db) on the score contract (flat version string, camelCase
 * collections). Its first cut was computeScores(ds) on the schema dataset. Both are accepted, and the
 * matching view is passed, so this script keeps working while lib/score settles.
 */
export function computeSnapshotOf(views: { dataset: Dataset; score: ScoreInput }): unknown {
  const api = score as unknown as { computeSnapshot?: (db: ScoreInput) => unknown; computeScores?: (ds: Dataset) => unknown };
  if (api.computeSnapshot) return api.computeSnapshot(views.score);
  if (api.computeScores) return api.computeScores(views.dataset);
  throw new Error("lib/score exports neither computeSnapshot nor computeScores");
}

/** Deep copy with object keys sorted; arrays keep their order. Makes the JSON diffable across runs. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  return value;
}

export function renderSnapshot(snapshot: unknown): string {
  return JSON.stringify(sortKeys(snapshot), null, 2) + "\n";
}

/** Render the snapshot for a root without writing it. */
export function snapshotText(root?: string): string {
  return renderSnapshot(computeSnapshotOf(loadBoth(root)));
}

export function writeSnapshot(root?: string, out?: string): { file: string; bytes: number } {
  const r = resolveDataRoot(root);
  const text = snapshotText(r);
  const file = out ? path.resolve(out) : dataFile(r, PATHS.scores);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return { file, bytes: Buffer.byteLength(text) };
}

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const { file, bytes } = writeSnapshot(argAfter("--root"), argAfter("--out"));
  console.log(`wrote ${file} (${bytes} bytes)`);
}

if (process.argv[1] && /snapshot\.ts$/.test(process.argv[1])) main();
