// Validate a coder output file against its packet: every id present, codes and bins valid, dates well formed.
// Usage: tsx scripts/pipeline/check-coding.ts data/intake/coded/coder-a-code-01.json
import fs from "node:fs";
import path from "node:path";
import { rel, readJson } from "./common";
const CODES = new Set(["VAGUE", "CONTROL", "REPORT", "NORMATIVE", "THIRD_PARTY", "SATIRE", "KNOWN", "OUT_OF_AREA", "NOT_FORECAST", "DUPLICATE", "PARAPHRASE"]);
const BINS = new Set(["A", "B", "C", "D", "E"]);
const ORIGINS = new Set(["stated", "anchor", "table"]);
const TEMPLATES = new Set(["drug_approval", "device_authorization", "trial_result", "rule_or_policy", "court_outcome", "company_event", "coverage_decision", "quantity_threshold"]);
const AREAS = new Set(["regulatory", "clinical_trial", "company_market", "payer_policy", "practice_adoption"]);
const iso = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
let exit = 0;
for (const file of process.argv.slice(2)) {
  const problems: string[] = [];
  type Rec = { id: string; admit: boolean; [k: string]: unknown };
  let out: { records?: Rec[]; [k: string]: unknown };
  try { out = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log(`${file}: INVALID JSON ${(e as Error).message}`); exit = 1; continue; }
  const coder = String(out.coder ?? "").toUpperCase();
  const m = /coder-[abc]-(.+)\.json$/.exec(path.basename(file));
  const packetName = m ? `${m[1]}.json` : null;
  const packet = packetName && fs.existsSync(rel("data/intake/packets", packetName)) ? readJson<{ statements: { id: string; statement_date: string }[] }>(rel("data/intake/packets", packetName)) : null;
  const dates = new Map((packet?.statements ?? []).map((s) => [s.id, s.statement_date]));
  const seen = new Set<string>();
  for (const r of out.records ?? []) {
    const base = String(r.id ?? "").replace(/-[ab]$/, "");
    seen.add(base);
    if (packet && !dates.has(base)) problems.push(`${r.id}: not in packet`);
    if (typeof r.admit !== "boolean") problems.push(`${r.id}: admit must be boolean`);
    if (r.admit === false && !CODES.has(r.reason_code)) problems.push(`${r.id}: rejected without a valid reason_code (${r.reason_code})`);
    if (r.admit === true) {
      const ev = r.event;
      if (!ev || typeof ev.ref !== "string") problems.push(`${r.id}: admitted without event.ref`);
      else if (!/^E-\d{4}$/.test(ev.ref) && !ev.ref.startsWith("new:")) problems.push(`${r.id}: event.ref must be E-NNNN or new:<slug>`);
      else if (ev.ref.startsWith("new:")) {
        if (!TEMPLATES.has(ev.template)) problems.push(`${r.id}: new event needs a valid template (${ev.template})`);
        if (!AREAS.has(ev.area)) problems.push(`${r.id}: new event needs a valid area (${ev.area})`);
        for (const k of ["asset", "entity", "title", "proposition"]) if (typeof ev[k] !== "string" || !ev[k].trim()) problems.push(`${r.id}: new event missing ${k}`);
        if (coder === "A" || coder === "C") { if (typeof ev.criterion !== "string" || ev.criterion.length < 20) problems.push(`${r.id}: new event needs a criterion`); if (!ev.resolution_source || typeof ev.resolution_source.name !== "string") problems.push(`${r.id}: new event needs resolution_source.name`); }
      }
      if (r.deadline !== null && r.deadline !== undefined) {
        if (!iso(r.deadline)) problems.push(`${r.id}: deadline must be yyyy-mm-dd or null (${r.deadline})`);
        else if (dates.get(base) && r.deadline <= dates.get(base)!) problems.push(`${r.id}: deadline ${r.deadline} is not after the statement date ${dates.get(base)}`);
        if (!ORIGINS.has(r.deadline_origin)) problems.push(`${r.id}: deadline_origin must be stated|anchor|table when a deadline is set`);
      }
      if (typeof r.asserts !== "boolean") problems.push(`${r.id}: asserts must be boolean`);
      const hasBin = r.bin !== null && r.bin !== undefined;
      const hasP = r.p_stated !== null && r.p_stated !== undefined;
      if (!hasBin && !hasP) problems.push(`${r.id}: needs bin or p_stated`);
      if (hasBin && !BINS.has(r.bin)) problems.push(`${r.id}: bin must be A to E (${r.bin})`);
      if (hasP && (typeof r.p_stated !== "number" || r.p_stated <= 0 || r.p_stated >= 1)) problems.push(`${r.id}: p_stated must be a number in (0, 1)`);
      if (r.condition && (typeof r.condition.ref !== "string")) problems.push(`${r.id}: condition needs a ref`);
    }
  }
  const missing = [...dates.keys()].filter((id) => !seen.has(id));
  if (missing.length) problems.push(`missing ${missing.length} statement ids: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
  const admitted = (out.records ?? []).filter((r) => r.admit).length;
  console.log(`${path.basename(file)}: records ${out.records?.length ?? 0} · admitted ${admitted} · rejected ${(out.records?.length ?? 0) - admitted} · problems ${problems.length}`);
  for (const p of problems.slice(0, 25)) console.log("   " + p);
  if (problems.length) exit = 1;
}
process.exit(exit);
