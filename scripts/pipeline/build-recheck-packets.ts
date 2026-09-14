// Recheck packets: every recorded outcome with its registry event, for the adversarial pass.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
const SIZE = Number(process.argv[2] ?? 10);
const registry = new Map(readJson<{ id: string }[]>(rel("data/registry/events.json")).map((e) => [e.id, e]));
const onlyOccurred = process.argv.includes("--occurred");
const rechecked = fs.existsSync(rel("data/registry/rechecks.json")) ? new Set(readJson<{ event_id: string }[]>(rel("data/registry/rechecks.json")).map((r) => r.event_id)) : new Set<string>();
// --occurred: only outcomes recorded as occurred (the ones that move a score); outcomes already rechecked are skipped
const outcomes = readJson<{ event_id: string; state: string }[]>(rel("data/registry/outcomes.json")).filter((o) => (!onlyOccurred || o.state === "occurred") && !rechecked.has(o.event_id));
const dir = rel("data/registry/recheck-packets");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
let n = 0;
for (let i = 0; i < outcomes.length; i += SIZE) {
  n++;
  writeJson(rel("data/registry/recheck-packets", `recheck-${String(n).padStart(2, "0")}.json`), { packet: `recheck-${String(n).padStart(2, "0")}.json`, cases: outcomes.slice(i, i + SIZE).map((o) => ({ event: registry.get(o.event_id), outcome: o })) });
}
appendAudit({ script: "build-recheck-packets", outcomes: outcomes.length, packets: n });
console.log(`recheck packets: ${n} (${outcomes.length} outcomes)`);
