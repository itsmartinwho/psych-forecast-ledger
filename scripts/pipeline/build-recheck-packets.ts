// Recheck packets: every recorded outcome with its registry event, for the adversarial pass.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
const SIZE = Number(process.argv[2] ?? 10);
const registry = new Map(readJson<{ id: string }[]>(rel("data/registry/events.json")).map((e) => [e.id, e]));
const outcomes = readJson<{ event_id: string }[]>(rel("data/registry/outcomes.json"));
const dir = rel("data/registry/recheck-packets");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
let n = 0;
for (let i = 0; i < outcomes.length; i += SIZE) {
  n++;
  writeJson(rel("data/registry/recheck-packets", `recheck-${String(n).padStart(2, "0")}.json`), { packet: `recheck-${String(n).padStart(2, "0")}.json`, cases: outcomes.slice(i, i + SIZE).map((o) => ({ event: registry.get(o.event_id), outcome: o })) });
}
appendAudit({ script: "build-recheck-packets", outcomes: outcomes.length, packets: n });
console.log(`recheck packets: ${n} (${outcomes.length} outcomes)`);
