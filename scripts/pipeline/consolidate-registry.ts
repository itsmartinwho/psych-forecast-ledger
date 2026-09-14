// Registry consolidation, two phases.
//   prep:  collect every "new:" event proposal from coder outputs into data/intake/registry-proposals.json
//          (deduplicated by normalized title so the consolidation agent reads each distinct wording once).
//   assemble: build data/intake/registry-consolidated.json from registry-groups.json and registry-entries-*.json
//   apply: read data/intake/registry-consolidated.json { events, map } and write data/registry/events.json
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
  // refs the registry already mapped (a previous consolidation) are not proposed again
  const mapped = fs.existsSync(rel("data/intake/registry-map.json")) ? readJson<Record<string, string>>(rel("data/intake/registry-map.json")) : {};
  const dates = new Map<string, string>();
  for (const f of ["owen", "angermayer", "doblin"]) { const p = rel(`data/census/${f}.json`); if (fs.existsSync(p)) for (const r of readJson<{ id: string; statement_date: string }[]>(p)) dates.set(r.id, r.statement_date); }
  for (const { coder, file } of coderFiles()) {
    const out = readJson<{ records: Rec[] }>(file);
    for (const r of out.records ?? []) {
      for (const ev of [r.event, r.condition]) {
        if (!ev || !("ref" in ev) || !String(ev.ref).startsWith("new:")) continue;
        const key = `${coder}:${ev.ref}`;
        if (key in mapped) continue;
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
} else if (mode === "assemble") {
  // assemble: registry-groups.json (phase 1: canonical groups with the scope gate) plus registry-entries-*.json
  // (phase 2: one full entry per in-scope group, keyed by slug) become registry-consolidated.json { events, map }.
  type Group = { slug: string; title: string; template: string; area: string; gate: "in" | "OUT_OF_AREA"; gate_reason: string | null; refs: string[]; inverted_refs?: string[]; proposition?: string; statement_ids: string[]; first_date: string };
  type Entry = { slug: string; template: string; area: string; asset: string; entity: string; title: string; proposition: string; criterion: string; resolution_source: { name: string; url?: string }; base_rate_class: string | null; quantity: unknown; readings: string[] };
  // --groups <file> and --entries <prefix> select one consolidation run (default: the release-1.0 files)
  const argAfter = (flag: string, dflt: string): string => { const i = process.argv.indexOf(flag); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
  const groupsFile = argAfter("--groups", "data/intake/registry-groups.json");
  const entriesPrefix = argAfter("--entries", "registry-entries-");
  const groups = readJson<Group[]>(rel(groupsFile));
  const proposals = readJson<{ proposals: { ref: string; coder: string }[] }>(rel("data/intake/registry-proposals.json")).proposals;
  const existing = fs.existsSync(rel("data/registry/events.json")) ? readJson<{ id: string }[]>(rel("data/registry/events.json")) : [];
  const entries = new Map<string, Entry>();
  for (const f of fs.readdirSync(rel("data/intake")).filter((x) => x.startsWith(entriesPrefix) && x.endsWith(".json") && (entriesPrefix !== "registry-entries-" || /^registry-entries-\d+\.json$/.test(x)))) for (const e of readJson<Entry[]>(rel("data/intake", f))) { if (entries.has(e.slug)) console.error(`${e.slug}: entry appears twice (${f})`); entries.set(e.slug, e); }
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const g of groups) for (const r of g.refs) seen.set(r, (seen.get(r) ?? 0) + 1);
  for (const p of proposals) { const k = `${p.coder}:${p.ref}`; if (!seen.has(k)) problems.push(`${k}: in no group`); else if (seen.get(k)! > 1) problems.push(`${k}: in ${seen.get(k)} groups`); }
  const inScope = groups.filter((g) => g.gate === "in").sort((x, y) => (x.first_date < y.first_date ? -1 : x.first_date > y.first_date ? 1 : x.slug < y.slug ? -1 : 1));
  let next = existing.reduce((m, e) => Math.max(m, Number(e.id.slice(2))), 0) + 1;
  const events: Record<string, unknown>[] = [];
  const map: Record<string, string> = {};
  for (const g of inScope) {
    const e = entries.get(g.slug);
    if (!e) { problems.push(`${g.slug}: no entry written`); continue; }
    if (e.template !== g.template || e.area !== g.area) problems.push(`${g.slug}: entry template/area (${e.template}/${e.area}) differ from the group (${g.template}/${g.area})`);
    const id = `E-${String(next++).padStart(4, "0")}`;
    events.push({ id, template: e.template, area: e.area, asset: e.asset, entity: e.entity, title: e.title, proposition: e.proposition, criterion: e.criterion, resolution_source: e.resolution_source, base_rate_class: e.base_rate_class ?? null, market_ref_id: null, quantity: e.quantity ?? null, readings: e.readings ?? [], created_by: "registry-consolidation", created_at: argAfter("--created", "2026-09-13"), version: argAfter("--version", "1.0.0") });
    for (const r of g.refs) map[r] = id;
  }
  for (const g of groups.filter((x) => x.gate !== "in")) for (const r of g.refs) map[r] = "OUT_OF_AREA";
  // refs whose own proposition is the negation of the canonical one: intake-merge flips their asserts and p_stated
  const inverted: string[] = [];
  for (const g of inScope) for (const r of g.inverted_refs ?? []) { if (!g.refs.includes(r)) problems.push(`${g.slug}: inverted ref ${r} is not in the group`); else inverted.push(r); }
  for (const slug of entries.keys()) if (!groups.some((g) => g.slug === slug && g.gate === "in")) console.warn(`warning: entry ${slug} matches no in-scope group`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  writeJson(rel("data/intake/registry-consolidated.json"), { events, map, inverted });
  appendAudit({ script: "consolidate-registry assemble", groups: groups.length, in_scope: inScope.length, out_of_area: groups.length - inScope.length, events: events.length, mapped_refs: Object.keys(map).length, inverted_refs: inverted.length });
  console.log(`assembled ${events.length} events from ${inScope.length} in-scope groups (${groups.length - inScope.length} groups refused by the scope gate); map has ${Object.keys(map).length} refs, ${inverted.length} inverted`);
} else if (mode === "apply") {
  const cons = readJson<{ events: Record<string, unknown>[]; map: Record<string, string>; inverted?: string[] }>(rel("data/intake/registry-consolidated.json"));
  const proposals = readJson<{ proposals: { ref: string; coder: string }[] }>(rel("data/intake/registry-proposals.json")).proposals;
  const inverted = cons.inverted ?? [];
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
  for (const r of inverted) if (!(r in cons.map) || cons.map[r] === "OUT_OF_AREA") problems.push(`${r}: inverted ref is not mapped to an event`);
  const referenced = new Set(Object.values(cons.map));
  for (const e of added) if (!referenced.has(String(e.id))) console.warn(`warning: ${String(e.id)} has no proposal ref pointing at it`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  const registry = [...existing, ...added];
  writeJson(rel("data/registry/events.json"), registry);
  // merge with the map and inverted list of earlier consolidations: old refs keep their entries
  const oldMap = fs.existsSync(rel("data/intake/registry-map.json")) ? readJson<Record<string, string>>(rel("data/intake/registry-map.json")) : {};
  const oldInverted = fs.existsSync(rel("data/intake/registry-inverted.json")) ? readJson<string[]>(rel("data/intake/registry-inverted.json")) : [];
  writeJson(rel("data/intake/registry-map.json"), { ...oldMap, ...cons.map });
  writeJson(rel("data/intake/registry-inverted.json"), [...new Set([...oldInverted, ...inverted])]);
  const outOfArea = Object.values(cons.map).filter((v) => v === "OUT_OF_AREA").length;
  appendAudit({ script: "consolidate-registry apply", added: added.length, total: registry.length, mapped_refs: Object.keys(cons.map).length, out_of_area_refs: outOfArea });
  console.log(`registry: ${registry.length} events (${added.length} added); map has ${Object.keys(cons.map).length} refs, ${outOfArea} refused by the scope gate, ${inverted.length} inverted`);
} else {
  console.error("usage: consolidate-registry.ts prep|assemble|apply"); process.exit(2);
}
