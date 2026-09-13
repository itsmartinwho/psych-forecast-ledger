// Prefilter audit: coder B re-read a seeded 20 percent sample of the statements the census finder set aside
// (prefiltered rejects) and decided admission only. This script turns that file into one summary record,
// data/intake/prefilter-audit.json, which the methodology page reports next to the coder agreement.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";

type Row = { id: string; prefilter: { code: string } | null };
type Sample = { records: { id: string; admit: boolean; reason_code: string | null; note: string | null }[] };

const rows: Row[] = [];
for (const f of ["owen", "angermayer", "doblin"]) { const p = rel(`data/census/${f}.json`); if (fs.existsSync(p)) rows.push(...readJson<Row[]>(p)); }
const rejects = rows.filter((r) => r.prefilter);
const sample = readJson<Sample>(rel("data/intake/coded/coder-b-sample-b.json"));
const admitted = sample.records.filter((r) => r.admit);
const codes: Record<string, number> = {};
for (const r of sample.records) if (!r.admit) codes[r.reason_code ?? "?"] = (codes[r.reason_code ?? "?"] ?? 0) + 1;
const out = {
  run: "intake-2026-09-13",
  coder: "B",
  statements_total: rows.length,
  to_code_total: rows.length - rejects.length,
  rejects_total: rejects.length,
  sample_size: sample.records.length,
  sample_admitted: admitted.length,
  sample_admitted_ids: admitted.map((r) => r.id),
  estimated_missed: Math.round((admitted.length / Math.max(1, sample.records.length)) * rejects.length),
  sample_reason_codes: codes,
};
writeJson(rel("data/intake/prefilter-audit.json"), out);
appendAudit({ script: "prefilter-audit", ...out, sample_admitted_ids: undefined, sample_reason_codes: undefined });
console.log(`prefilter audit: ${out.sample_admitted} of ${out.sample_size} sampled prefiltered statements admitted; ${out.rejects_total} prefiltered of ${out.statements_total}; estimated missed ${out.estimated_missed}`);
