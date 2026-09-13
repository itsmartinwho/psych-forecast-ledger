// Registry consolidation, two phases.
//   prep:  collect every "new:" event proposal from coder outputs into data/intake/registry-proposals.json
//          (deduplicated by normalized title so the consolidation agent reads each distinct wording once).
//   apply: read the agent's data/intake/registry-consolidated.json { events, map } and write data/registry/events.json
//          (existing entries kept, new ones appended with sequential ids) and data/intake/registry-map.json.
//          A map value of "OUT_OF_AREA" records the scope gate: the proposal lies outside the five area definitions.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit, norm } from "./common";
import { RegistryEvent } from "../../lib/data/schema";

type Proposal = { ref: string; template?: string; area?: string; asset?: string; entity?: string; title?: string; proposition?: string; criterion?: string; resolution_source?: { name: string; url?: string }; base_rate_class?: string | null; quantity?: unknown; readings?: string[] };
type Rec = { id: string; admit: boolean; event: Proposal | { ref: string } | null; condition?: Proposal | { ref: string } | null };

function coderFiles(): { coder: string; file: string }[] {
  const dir = rel("data/intake/coded");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^coder-[abc]-.*\.json$/.test(f)).map((f) => ({ coder: f.split("-")[1].toUpperCase(), file: rel("data/intake/coded", f)}));
}

const mode = process.argv[2];
if (mode === "prep") {
  const existing = fs.existsSync(rel("data/registry/events.json")) ? readJson<{ id: string; title: string; proposition: string; asset: string; template: string; area: string }[]>(rel("data/registry/events.json")) : [];
  const proposals: (Proposal & { coder: string; statement_ids: string[]; first_date: string })[] = [];
  const dates = new Map<string, string>();
  for (const f of ["owen", "angermayer", "doblin"]) { const p = rel(`data/census/${f}.json`); if (fs.existsSync(p)) for (const r of readJson<{ id: string; statement_date: string }[]>(p)) dates.set(r.id, r.statement_date); }
  for (const { coder, file } of coderFiles()) {
    const out = readJson<{ records: Rec[] }>(file);
    for (const r of out.records ?? []) {
      for (const ev of [r.event, r.condition]) {
        if (!ev || !("ref" in ev) || !String(ev.ref).startsWith("new:")) continue;
        const key = `${coder}:${ev.ref}`;
        const found = proposals.find((p) => `${p.coder}:${p.ref}` === key);
        const sid = r.id.replace(/-[ab]$/, "");
        if (found) { found.statement_ids.push(sid); if ((dates.get(sid) ?? "9999") < found.first_date) found.first_date = dates.get(sid)!; }
        else proposals.push({ ...(ev as Proposal), coder, statement_ids: [sid], first_date: dates.get(sid) ?? "9999-12-31" });
      }
    }
  }
  proposals.sort((a, b) => (a.first_date < b.first_date ? -1 : 1));
  writeJson(rel("data/intake/registry-proposals.json"), { existing: existing.map((e) => ({ id: e.id, title: e.title, proposition: e.proposition, asset: e.asset, template: e.template, area: e.area })), proposals });
  const distinct = new Set(proposals.map((p) => norm(p.title ?? p.ref))).size;
  appendAudit({ script: "consolidate-registry prep", proposals: proposals.length, distinct_titles: distinct, existing: existing.length });
  console.log(`proposals: ${proposals.length} (${distinct} distinct titles) from ${coderFiles().length} coder files; existing registry ${existing.length}`);
} else if (mode === "apply") {
  const cons = readJson<{ events: Record<string, unknown>[]; map: Record<string, string> }>(rel("data/intake/registry-consolidated.json"));
  const proposals = readJson<{ proposals: { ref: string; coder: string }[] }>(rel("data/intake/registry-proposals.json")).proposals;
  const existing = fs.existsSync(rel("data/registry/events.json")) ? readJson<{ id: string }[]>(rel("data/registry/events.json")) : [];
  const ids = new Set(existing.map((e) => e.id));
  const added: Record<string, unknown>[] = cons.events.filter((e) => !ids.has(String(e.id))).map((e) => ({ ...e, created_by: e.created_by ?? "registry-consolidation", created_at: e.created_at ?? "2026-09-13", version: e.version ?? "1.0.0", readings: e.readings ?? [], market_ref_id: e.market_ref_id ?? null, quantity: e.quantity ?? null, base_rate_class: e.base_rate_class ?? null }));
  // checks: every added entry fits the schema, ids are unique, every proposal ref has a map entry, every mapped id exists
  const problems: string[] = [];
  const all = new Set(ids);
  for (const e of added) {
    const parsed = RegistryEvent.safeParse(e);
    if (!parsed.success) problems.push(`${String(e.id)}: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
    if (all.has(String(e.id))) problems.push(`${String(e.id)}: duplicate id`);
    all.add(String(e.id));
  }
  for (const p of proposals) {
    const key = `${p.coder}:${p.ref}`;
    if (!(key in cons.map)) problems.push(`${key}: no map entry`);
  }
  for (const [k, v] of Object.entries(cons.map)) if (v !== "OUT_OF_AREA" && !all.has(v)) problems.push(`${k}: maps to unknown event ${v}`);
  const referenced = new Set(Object.values(cons.map));
  for (const e of added) if (!referenced.has(String(e.id))) console.warn(`warning: ${String(e.id)} has no proposal ref pointing at it`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  const registry = [...existing, ...added];
  writeJson(rel("data/registry/events.json"), registry);
  writeJson(rel("data/intake/registry-map.json"), cons.map);
  const outOfArea = Object.values(cons.map).filter((v) => v === "OUT_OF_AREA").length;
  appendAudit({ script: "consolidate-registry apply", added: added.length, total: registry.length, mapped_refs: Object.keys(cons.map).length, out_of_area_refs: outOfArea });
  console.log(`registry: ${registry.length} events (${added.length} added); map has ${Object.keys(cons.map).length} refs, ${outOfArea} refused by the scope gate`);
} else {
  console.error("usage: consolidate-registry.ts prep|apply"); process.exit(2);
}
