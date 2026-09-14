// Tiebreak packet: every statement where coder A and coder B disagree on admission, in the coding-packet
// shape, for coder C. Writes data/intake/packets/tiebreak-01.json and data/intake/splits-needing-tiebreak.json.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";

type Rec = { id: string; admit: boolean };
type Packet = { packet: string; affiliations: Record<string, unknown>; statements: { id: string; [k: string]: unknown }[] };

const dir = rel("data/intake/coded");
const load = (letter: string) => {
  const m = new Map<string, Rec>();
  for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(`coder-${letter}-code-`) && x.endsWith(".json"))) for (const r of readJson<{ records: Rec[] }>(rel("data/intake/coded", f)).records ?? []) m.set(r.id, r);
  return m;
};
const A = load("a"), B = load("b");
// --new: leave existing tiebreak packets alone, skip statements a coder-C file already decided, number after the last packet
const onlyNew = process.argv.includes("--new");
const decided = new Set<string>();
if (onlyNew) for (const f of fs.readdirSync(dir).filter((x) => x.startsWith("coder-c-") && x.endsWith(".json"))) for (const r of readJson<{ records: Rec[] }>(rel("data/intake/coded", f)).records ?? []) decided.add(r.id.replace(/-[ab]$/, ""));
const packets = fs.readdirSync(rel("data/intake/packets")).filter((x) => /^code-\d+\.json$/.test(x)).map((x) => readJson<Packet>(rel("data/intake/packets", x)));
const affiliations = packets[0].affiliations;
const rows = packets.flatMap((p) => p.statements);
const admitOf = (m: Map<string, Rec>, id: string): boolean | null => { const r = m.get(id) ?? m.get(`${id}-a`); return r ? r.admit : null; };
const split = rows.filter((s) => { const a = admitOf(A, s.id), b = admitOf(B, s.id); return a !== null && b !== null && a !== b && !(onlyNew && decided.has(s.id)); });
const SIZE = Number((process.argv.find((a) => /^\d+$/.test(a)) ?? 21));
let n = 0;
if (onlyNew) n = fs.readdirSync(rel("data/intake/packets")).filter((x) => /^tiebreak-\d+\.json$/.test(x)).reduce((m, x) => Math.max(m, Number(x.slice(9, -5))), 0);
else for (const f of fs.readdirSync(rel("data/intake/packets")).filter((x) => /^tiebreak-\d+\.json$/.test(x))) fs.unlinkSync(rel("data/intake/packets", f));
for (let i = 0; i < split.length; i += SIZE) {
  n++;
  const name = `tiebreak-${String(n).padStart(2, "0")}.json`;
  writeJson(rel("data/intake/packets", name), { packet: name, note: "admission splits between coder A and coder B: coder C decides", affiliations, statements: split.slice(i, i + SIZE) });
}
if (!onlyNew) writeJson(rel("data/intake/splits-needing-tiebreak.json"), split.map((s) => s.id));
appendAudit({ script: "build-tiebreak-packet", statements: rows.length, splits: split.length, packets: n });
console.log(`tiebreak packets: ${n} (${split.length} statements of ${rows.length})`);
