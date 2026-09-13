// Import the 217 sourced ground-truth events of the research scan into data/registry/timeline.json.
import { rel, readJson, writeJson, appendAudit } from "./common";
interface R { date: string; area: string; entity: string; event: string; outcome_type: string; key_number?: string; source_url: string; source_org: string; confidence: "high" | "medium" | "low" }
const src = readJson<{ events: R[] }>(rel("data/research/events.json")).events;
const TYPE: Record<string, string> = { rule: "rule", statement: "statement", other: "other", legislation: "legislation", launch: "launch", scheduling: "scheduling", extension: "extension", guidance: "rule", financing: "financing", breakthrough_designation: "breakthrough_designation", publication: "publication", adcomm_vote: "statement", crl: "crl", approval: "approval", trial_readout_positive: "trial_readout_positive", trial_readout_negative: "trial_readout_negative", layoff: "layoffs", bankruptcy: "bankruptcy", closure: "closure", merger_acquisition: "merger_acquisition", enforcement: "court", retraction: "retraction", trial_readout_mixed: "publication" };
const rows = src
  .map((e) => {
    let date = e.date, note = "";
    if (/^\d{4}-\d{2}$/.test(date)) { date = `${date}-01`; note = " (month precision)"; }
    return { date, area: e.area, entity: e.entity.slice(0, 160), event: (e.event + note).slice(0, 500), outcome_type: TYPE[e.outcome_type] ?? "other", key_number: e.key_number?.slice(0, 300), source_url: e.source_url, source_org: e.source_org.slice(0, 120), confidence: e.confidence, registry_event_ids: [] as string[] };
  })
  .filter((e) => /^https?:\/\//.test(e.source_url))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.entity.localeCompare(b.entity)))
  .map((e, i) => ({ id: `T-${String(i + 1).padStart(4, "0")}`, ...e }));
writeJson(rel("data/registry/timeline.json"), rows);
appendAudit({ script: "import-timeline", source: "data/research/events.json", rows: rows.length, dropped: src.length - rows.length });
console.log(`timeline: ${rows.length} events written (${src.length - rows.length} dropped for a bad URL)`);
