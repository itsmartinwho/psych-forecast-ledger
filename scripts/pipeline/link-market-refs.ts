// Market references to registry events. The five market questions each mirror one registry proposition;
// the pairing is by canonical slug (from registry-groups.json) so that it survives id assignment.
// Writes event_id into data/market-refs.json and market_ref_id (the longest-running reference) into the event.
import { rel, readJson, writeJson, appendAudit } from "./common";

const PAIRS: Record<string, string> = {
  "M-001": "fda-midomafetamine-ptsd-approval",
  "M-002": "fda-midomafetamine-ptsd-approval",
  "M-003": "fda-midomafetamine-ptsd-approval",
  "M-004": "fda-psilocybin-approval",
  "M-005": "fda-psychedelic-medicine-first-approval",
};

type Group = { slug: string; refs: string[]; gate: string };
type Ref = { id: string; event_id: string; deadline: string | null; prices: { date: string }[] };
type Ev = { id: string; market_ref_id: string | null; title: string };

const groups = readJson<Group[]>(rel("data/intake/registry-groups.json"));
const map = readJson<Record<string, string>>(rel("data/intake/registry-map.json"));
const refs = readJson<Ref[]>(rel("data/market-refs.json"));
const events = readJson<Ev[]>(rel("data/registry/events.json"));
const idOfSlug = (slug: string): string => {
  const g = groups.find((x) => x.slug === slug);
  if (!g) throw new Error(`no group with slug ${slug}`);
  const id = map[g.refs[0]];
  if (!id || !/^E-\d{4}$/.test(id)) throw new Error(`${slug}: refs map to ${id}`);
  return id;
};
const byEvent = new Map<string, Ref[]>();
for (const r of refs) {
  const slug = PAIRS[r.id];
  if (!slug) { console.warn(`${r.id}: no pairing, left as ${r.event_id}`); continue; }
  r.event_id = idOfSlug(slug);
  (byEvent.get(r.event_id) ?? byEvent.set(r.event_id, []).get(r.event_id)!).push(r);
}
for (const [eventId, list] of byEvent) {
  const ev = events.find((e) => e.id === eventId)!;
  const longest = [...list].sort((a, b) => b.prices.length - a.prices.length)[0];
  ev.market_ref_id = longest.id;
  console.log(`${eventId} ${ev.title.slice(0, 60)} <- ${list.map((r) => r.id).join(", ")} (event carries ${longest.id})`);
}
writeJson(rel("data/market-refs.json"), refs);
writeJson(rel("data/registry/events.json"), events);
appendAudit({ script: "link-market-refs", pairs: refs.map((r) => ({ id: r.id, event_id: r.event_id })) });
