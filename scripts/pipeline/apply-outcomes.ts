// Merge resolver outputs (data/registry/resolved/resolve-*.json) into data/registry/outcomes.json, validated by the schema.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
import { Outcome } from "../../lib/data/schema";
const dir = rel("data/registry/resolved");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
const existing = fs.existsSync(rel("data/registry/outcomes.json")) ? readJson<Record<string, unknown>[]>(rel("data/registry/outcomes.json")) : [];
const byId = new Map(existing.map((o) => [String(o.event_id), o]));
let ok = 0, bad = 0;
for (const f of files) {
  const out = readJson<{ resolver?: string; outcomes: Record<string, unknown>[] }>(rel("data/registry/resolved", f));
  for (const o of out.outcomes ?? []) {
    const rec = { ...o, resolver: o.resolver ?? out.resolver ?? "R1", resolved_at: o.resolved_at ?? "2026-09-13", version: o.version ?? 1, realized_value: o.realized_value ?? null, date: o.date ?? null, evidence: (o.evidence as unknown[]) ?? [] };
    for (const e of rec.evidence as Record<string, unknown>[]) if (!e.accessed) e.accessed = "2026-09-13";
    const parsed = Outcome.safeParse(rec);
    if (!parsed.success) { bad++; console.error(`${f} ${o.event_id}: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); continue; }
    byId.set(parsed.data.event_id, parsed.data);
    ok++;
  }
}
const all = [...byId.values()].sort((a, b) => (String(a.event_id) < String(b.event_id) ? -1 : 1));
writeJson(rel("data/registry/outcomes.json"), all);
appendAudit({ script: "apply-outcomes", files: files.length, applied: ok, rejected: bad, total: all.length });
console.log(`outcomes: ${all.length} total (${ok} applied, ${bad} rejected)`);
