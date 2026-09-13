// Resolution packets: registry events (all of them, so known-true items can be shown) in packets of N,
// each with the ground-truth timeline entries whose entity or text mentions the event's asset. The resolver never sees items or p.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit, norm } from "./common";
const SIZE = Number(process.argv[2] ?? 8);
const only = process.argv.includes("--missing");
type Ev = { id: string; template: string; area: string; asset: string; entity: string; title: string; proposition: string; criterion: string; resolution_source: { name: string; url?: string }; quantity: unknown; readings: string[] };
const registry = readJson<Ev[]>(rel("data/registry/events.json"));
const timeline = readJson<{ id: string; date: string; area: string; entity: string; event: string; source_url: string; source_org: string; key_number?: string }[]>(rel("data/registry/timeline.json"));
const outcomes = fs.existsSync(rel("data/registry/outcomes.json")) ? new Set(readJson<{ event_id: string }[]>(rel("data/registry/outcomes.json")).map((o) => o.event_id)) : new Set<string>();
const events = registry.filter((e) => !only || !outcomes.has(e.id));
const dir = rel("data/registry/packets");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
let n = 0;
for (let i = 0; i < events.length; i += SIZE) {
  const chunk = events.slice(i, i + SIZE).map((e) => {
    const keys = new Set([...words(e.asset), ...words(e.entity)]);
    const related = timeline.filter((t) => { const tw = norm(`${t.entity} ${t.event}`); return [...keys].some((k) => tw.includes(k)); }).slice(0, 12);
    return { ...e, related_timeline: related.map((t) => ({ id: t.id, date: t.date, entity: t.entity, event: t.event, source_url: t.source_url, source_org: t.source_org, key_number: t.key_number })) };
  });
  n++;
  writeJson(rel("data/registry/packets", `resolve-${String(n).padStart(2, "0")}.json`), { packet: `resolve-${String(n).padStart(2, "0")}.json`, as_of: "2026-09-13", events: chunk });
}
appendAudit({ script: "build-resolution-packets", events: events.length, packets: n });
console.log(`resolution packets: ${n} (${events.length} events)`);
