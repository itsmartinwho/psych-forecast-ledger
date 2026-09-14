// Intake merge: coder A, coder B and tiebreak C outputs plus the registry map become the census status,
// the intake items and the coder-B match file. Rules: both admit and event and deadline match -> admitted;
// event or deadline mismatch -> VOID AMBIGUOUS; an event the registry gate refused -> not admitted OUT_OF_AREA;
// admission split -> coder C decides (then C's fields are
// matched against the admitting coder); bin mismatch -> mean p with a p_note.
import fs from "node:fs";
import { rel, readJson, writeJson, appendAudit } from "./common";
import { addMonths, monthsBetween } from "../../lib/dates";
import { Item, Statement, CoderB } from "../../lib/data/schema";

type Ev = { ref: string; template?: string; area?: string; asset?: string; entity?: string } | null;
interface RecA { id: string; admit: boolean; reason_code: string | null; event: Ev; condition: Ev; asserts: boolean | null; deadline: string | null; deadline_origin: "stated" | "anchor" | "table" | null; deadline_text: string | null; bin: string | null; p_stated: number | null; phrase: string | null; affiliated: boolean | null; tags: string[] | null; base_rate_class: string | null; stage_note: string | null; note: string | null }
interface RecB { id: string; admit: boolean; reason_code: string | null; event: Ev; condition: Ev; deadline: string | null; deadline_origin: string | null; asserts: boolean | null; bin: string | null; p_stated: number | null; note: string | null }
type CensusRow = { id: string; forecaster: "owen" | "angermayer" | "doblin"; statement_date: string; quote: string; context?: string; source: Statement["source"]; date_precision?: "day" | "month"; extraction: Statement["extraction"]; finder: { horizon_text: string; confidence_phrase: string; entities: string[] }; prefilter: { code: string } | null };

const rules = readJson<{ version: string }>(rel("data/rules/version.json"));
const lexicon = readJson<{ bins: { bin: string; p: number }[] }>(rel("data/rules/lexicon.json"));
const binP = Object.fromEntries(lexicon.bins.map((b) => [b.bin, b.p]));
const baseRates = readJson<{ classes: { class: string; p: number | null; median_months: number | null }[] }>(rel("data/rules/base-rates.json"));
const registry = readJson<{ id: string; area: string }[]>(rel("data/registry/events.json"));
const registryIds = new Set(registry.map((e) => e.id));
const registryArea = new Map(registry.map((e) => [e.id, e.area]));
const map = fs.existsSync(rel("data/intake/registry-map.json")) ? readJson<Record<string, string>>(rel("data/intake/registry-map.json")) : {};
const thresholds = readJson<{ undated_window_months: number; probability_clamp: [number, number] }>(rel("data/rules/thresholds.json"));

const loadCoder = <T extends { id: string }>(letter: string): Map<string, T> => {
  const m = new Map<string, T>();
  const dir = rel("data/intake/coded");
  if (!fs.existsSync(dir)) return m;
  for (const f of fs.readdirSync(dir).filter((x) => x.startsWith(`coder-${letter}-`) && x.endsWith(".json"))) for (const r of readJson<{ records: T[] }>(rel("data/intake/coded", f)).records ?? []) m.set(r.id, r);
  return m;
};
const A = loadCoder<RecA>("a"), B = loadCoder<RecB>("b"), C = loadCoder<RecA>("c");

// the registry scope gate: the consolidation step maps a proposal outside the five area definitions to "OUT_OF_AREA"
const gated = (coder: string, ev: Ev): boolean => !!ev && map[`${coder}:${ev.ref}`] === "OUT_OF_AREA";
// polarity: a coder's proposal that the registry merged as the negation of the canonical proposition has its
// asserts flag and any stated number flipped, so that p always refers to the registry proposition
const inverted = new Set<string>(fs.existsSync(rel("data/intake/registry-inverted.json")) ? readJson<string[]>(rel("data/intake/registry-inverted.json")) : []);
const isInverted = (coder: string, ev: Ev): boolean => !!ev && inverted.has(`${coder}:${ev.ref}`);
const assertsOf = (coder: string, rec: { event: Ev; asserts: boolean | null }): boolean | null => rec.asserts === null || rec.asserts === undefined ? null : isInverted(coder, rec.event) ? !rec.asserts : rec.asserts;
const pStatedOf = (coder: string, rec: { event: Ev; p_stated: number | null }): number | null => rec.p_stated === null || rec.p_stated === undefined ? null : isInverted(coder, rec.event) ? 1 - rec.p_stated : rec.p_stated;
const resolveRef = (coder: string, ev: Ev): string | null => {
  if (!ev) return null;
  if (registryIds.has(ev.ref)) return ev.ref;
  const mapped = map[`${coder}:${ev.ref}`];
  return mapped && registryIds.has(mapped) ? mapped : null;
};
const pOf = (bin: string | null, p_stated: number | null, asserts: boolean | null): number | null => {
  if (p_stated !== null && p_stated !== undefined) return p_stated;
  if (!bin || !(bin in binP)) return null;
  const v = binP[bin];
  return asserts === false ? 1 - v : v;
};
const clamp = (p: number) => Math.min(thresholds.probability_clamp[1], Math.max(thresholds.probability_clamp[0], p));

const stats = { statements: 0, admitted: 0, void_ambiguous: 0, not_admitted: 0, gate_out_of_area: 0, split_to_c: 0, uncoded: 0, bin_mismatch: 0, undated: 0, dated: 0 };
const splitsNeeded: string[] = [];
for (const slug of ["owen", "angermayer", "doblin"] as const) {
  const p = rel(`data/census/${slug}.json`);
  if (!fs.existsSync(p)) continue;
  const census = readJson<CensusRow[]>(p);
  const statements: Statement[] = [], items: Item[] = [], coderB: CoderB[] = [];
  for (const row of census) {
    stats.statements++;
    const base = { id: row.id, forecaster: row.forecaster, statement_date: row.statement_date, quote: row.quote, context: row.context, source: row.source, date_precision: row.date_precision, extraction: row.extraction };
    if (row.prefilter) { statements.push({ ...base, status: "not_admitted", reason_code: row.prefilter.code as Statement["reason_code"] } as Statement); stats.not_admitted++; continue; }
    // split compound claims: A may have -a/-b records; treat each as its own item keyed by the suffixed id is not
    // supported by the schema (one item per statement), so the first record (-a or plain) stands and -b is noted.
    const a = A.get(row.id) ?? A.get(`${row.id}-a`);
    const b = B.get(row.id) ?? B.get(`${row.id}-a`);
    if (!a || !b) { stats.uncoded++; statements.push({ ...base, status: "not_admitted", reason_code: "NOT_FORECAST", coders: {} } as Statement); continue; }
    let decider: RecA | null = null;
    let admitted = a.admit && b.admit;
    if (a.admit !== b.admit) {
      const c = C.get(row.id) ?? C.get(`${row.id}-a`);
      if (!c) { splitsNeeded.push(row.id); stats.split_to_c++; statements.push({ ...base, status: "not_admitted", reason_code: a.reason_code ?? b.reason_code ?? "VAGUE", coders: { a_admit: a.admit, b_admit: b.admit, a_reason: a.reason_code ?? undefined, b_reason: b.reason_code ?? undefined } } as Statement); continue; }
      admitted = c.admit;
      decider = c;
    }
    const coders = { a_admit: a.admit, b_admit: b.admit, tiebreak_admit: decider ? decider.admit : undefined, a_reason: a.reason_code ?? undefined, b_reason: b.reason_code ?? undefined };
    if (!admitted) {
      const reason = (decider ? decider.reason_code : a.reason_code ?? b.reason_code) ?? "VAGUE";
      statements.push({ ...base, status: "not_admitted", reason_code: reason as Statement["reason_code"], coders } as Statement); stats.not_admitted++; continue;
    }
    // the admitting coder whose fields are used: A when both admit, else the tiebreak against the admitting side
    const primary: RecA = a.admit ? a : (decider as RecA);
    const other: { event: Ev; deadline: string | null; bin: string | null; p_stated: number | null; asserts: boolean | null } = a.admit && b.admit ? b : (decider && a.admit ? { event: decider.event, deadline: decider.deadline, bin: decider.bin, p_stated: decider.p_stated, asserts: decider.asserts } : b);
    const coderP = primary === a ? "A" : "C", coderO = other === b ? "B" : "C";
    const evP = resolveRef(coderP, primary.event);
    const evO = resolveRef(coderO, other.event);
    const asP = assertsOf(coderP, primary), asO = assertsOf(coderO, other);
    const psP = pStatedOf(coderP, primary), psO = pStatedOf(coderO, other);
    const dlP = primary.deadline ?? null, dlO = other.deadline ?? null;
    coderB.push({ id: row.id, admit: b.admit, reason_code: (b.reason_code ?? null) as CoderB["reason_code"], event_id: evO && /^E-\d{4}$/.test(evO) ? evO : null, deadline: dlO, bin: (b.bin ?? null) as CoderB["bin"], asserts: b.asserts ?? null, coder: "B", coded_at: "2026-09-13" });
    if (gated(primary === a ? "A" : "C", primary.event)) {
      statements.push({ ...base, status: "not_admitted", reason_code: "OUT_OF_AREA", coders: { ...coders, gate: "registry" } } as Statement); stats.gate_out_of_area++; continue;
    }
    if (!evP || !evO || evP !== evO || dlP !== dlO) {
      statements.push({ ...base, status: "void", void_reason: "AMBIGUOUS", coders } as Statement); stats.void_ambiguous++; continue;
    }
    const pP = pOf(primary.bin, psP, asP), pO = pOf(other.bin, psO, asO);
    if (pP === null) { statements.push({ ...base, status: "void", void_reason: "AMBIGUOUS", coders } as Statement); stats.void_ambiguous++; continue; }
    let p = pP, p_note: string | undefined;
    if (pO !== null && Math.abs(pP - pO) > 1e-9 && psP === null) { p = (pP + pO) / 2; p_note = `coders disagreed on the bin (${primary.bin} vs ${other.bin}); mean of ${pP.toFixed(2)} and ${pO.toFixed(2)}`; stats.bin_mismatch++; }
    const panel = dlP ? "headline" : "undated";
    if (panel === "headline") stats.dated++; else stats.undated++;
    const tags = new Set<string>(primary.tags ?? []);
    if (primary.affiliated) tags.add("affiliated");
    if (asP === false) tags.add("denial");
    if (primary.p_stated !== null) tags.add("stated_number");
    if (primary.condition) tags.add("conditional");
    if (primary.deadline_origin === "table") tags.add("table_dated");
    tags.add("retrospective");
    const cls = primary.base_rate_class ? baseRates.classes.find((c) => c.class === primary.base_rate_class) : undefined;
    let base_rate: Item["base_rate"] = null;
    if (cls && cls.p !== null) {
      const window = monthsBetween(row.statement_date, dlP ?? addMonths(row.statement_date, thresholds.undated_window_months));
      const halved = cls.median_months !== null && window < cls.median_months;
      base_rate = { class: cls.class, p_raw: cls.p, p: halved ? cls.p / 2 : cls.p, halved, median_months: cls.median_months };
    }
    const condRef = primary.condition ? resolveRef(primary === a ? "A" : "C", primary.condition) : null;
    const item: Item = {
      id: row.id, forecaster: row.forecaster, statement_date: row.statement_date, quote: row.quote, context: row.context, source: row.source,
      area: (registryArea.get(evP) ?? "regulatory") as Item["area"], event_id: evP, condition_event_id: condRef && /^E-\d{4}$/.test(condRef) ? condRef : null,
      asserts: asP !== false, deadline: dlP, deadline_origin: dlP ? (primary.deadline_origin ?? "anchor") : null, deadline_text: primary.deadline_text ?? null, panel,
      p: clamp(p), p_origin: primary.p_stated !== null ? "stated" : "lexicon", p_note, bin: (primary.bin ?? null) as Item["bin"], phrase: primary.phrase ?? null, stated_number: primary.p_stated !== null ? String(primary.p_stated) : null,
      tags: [...tags] as Item["tags"], base_rate, market_ref_id: null, coder: primary === a ? "A" : "C", rule_version: rules.version, intake_at: "2026-09-13", hindsight_scan: "clean", version: 1, history: [],
    };
    const parsed = Item.safeParse(item);
    if (!parsed.success) { console.error(`${row.id}: item fails schema: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`); statements.push({ ...base, status: "void", void_reason: "AMBIGUOUS", coders } as Statement); stats.void_ambiguous++; continue; }
    items.push(parsed.data);
    statements.push({ ...base, status: "admitted", coders } as Statement);
    stats.admitted++;
  }
  writeJson(rel(`data/statements/${slug}.json`), statements);
  writeJson(rel(`data/intake/${slug}.json`), items);
  writeJson(rel(`data/intake/coder-b/${slug}.json`), coderB);
}
if (splitsNeeded.length) writeJson(rel("data/intake/splits-needing-tiebreak.json"), splitsNeeded);
appendAudit({ script: "intake-merge", ...stats });
console.log(JSON.stringify(stats));
