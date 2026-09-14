// Merge rechecker outputs into data/registry/rechecks.json and apply overturns as new outcome versions (old version kept in the audit log).
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
import { Outcome, Recheck } from "../../lib/data/schema";
const dir = rel("data/registry/rechecked");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
const outcomes = readJson<Record<string, unknown>[]>(rel("data/registry/outcomes.json"));
const byId = new Map(outcomes.map((o) => [String(o.event_id), o]));
const rechecks: unknown[] = [];
let upheld = 0, overturned = 0, escalated = 0, bad = 0;
for (const f of files) {
  const out = readJson<{ rechecker?: string; rechecks: Record<string, unknown>[] }>(rel("data/registry/rechecked", f));
  for (const r of out.rechecks ?? []) {
    const rec = { event_id: r.event_id, challenged: r.challenged, argument: String(r.argument ?? "").slice(0, 1200), verdict: r.verdict, applied: false, rechecker: r.rechecker ?? out.rechecker ?? "X1", rechecked_at: "2026-09-13" };
    const parsed = Recheck.safeParse(rec);
    if (!parsed.success) { bad++; console.error(`${f} ${r.event_id}: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); continue; }
    const cur = byId.get(String(r.event_id));
    if (parsed.data.verdict === "overturned" && cur && r.corrected && typeof r.corrected === "object") {
      const c = r.corrected as Record<string, unknown>;
      const next = { ...cur, state: c.state ?? cur.state, date: c.date ?? null, evidence: [...((c.evidence as unknown[]) ?? []), ...((cur.evidence as unknown[]) ?? [])], note: ((base: string, suffix: string) => `${base.slice(0, Math.max(0, 900 - suffix.length))}${suffix}`)(String(cur.note), ` | overturned on recheck: ${String(r.argument).slice(0, 240)}`), version: Number(cur.version ?? 1) + 1, resolver: `${String(cur.resolver)}+${rec.rechecker}` };
      for (const e of next.evidence as Record<string, unknown>[]) if (!e.accessed) e.accessed = "2026-09-13";
      const ok = Outcome.safeParse(next);
      if (ok.success) { appendAudit({ script: "apply-rechecks", overturned: r.event_id, previous: cur }); byId.set(String(r.event_id), ok.data); parsed.data.applied = true; overturned++; }
      else { console.error(`${r.event_id}: corrected outcome fails schema: ${ok.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); escalated++; parsed.data.verdict = "escalated"; }
    } else if (parsed.data.verdict === "overturned") { escalated++; parsed.data.verdict = "escalated"; }
    else if (parsed.data.verdict === "upheld") upheld++; else escalated++;
    rechecks.push(parsed.data);
  }
}
writeJson(rel("data/registry/rechecks.json"), rechecks);
writeJson(rel("data/registry/outcomes.json"), [...byId.values()].sort((a, b) => (String(a.event_id) < String(b.event_id) ? -1 : 1)));
appendAudit({ script: "apply-rechecks", files: files.length, upheld, overturned, escalated, rejected: bad });
console.log(`rechecks: ${rechecks.length} (upheld ${upheld}, overturned ${overturned}, escalated ${escalated}, rejected ${bad})`);
