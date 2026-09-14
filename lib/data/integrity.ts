import type { Dataset } from "./schema";

/** Referential rules beyond the per-file schemas. Returns human-readable problems; empty means clean. */
export function integrityProblems(ds: Dataset): string[] {
  const problems: string[] = [];
  const forecasters = new Set(ds.forecasters.map((f) => f.slug));
  const events = new Map(ds.registry.map((e) => [e.id, e]));
  const statementIds = new Map(ds.statements.map((s) => [s.id, s]));
  const itemIds = new Set<string>();
  const classes = new Set(ds.base_rates.classes.map((c) => c.class));
  const marketIds = new Set(ds.market_refs.map((m) => m.id));

  if (ds.forecasters.filter((f) => f.hero).length !== 1) problems.push("exactly one forecaster must carry hero: true");
  for (const s of ds.statements) {
    if (!forecasters.has(s.forecaster)) problems.push(`${s.id}: unknown forecaster ${s.forecaster}`);
    if (s.quote.length > ds.thresholds.quote_max_chars) problems.push(`${s.id}: quote longer than ${ds.thresholds.quote_max_chars}`);
  }
  const dupIds = ds.statements.map((s) => s.id).filter((id, i, a) => a.indexOf(id) !== i);
  for (const d of new Set(dupIds)) problems.push(`duplicate statement id ${d}`);

  for (const it of ds.items) {
    if (itemIds.has(it.id)) problems.push(`duplicate item id ${it.id}`);
    itemIds.add(it.id);
    const st = statementIds.get(it.id);
    if (!st) problems.push(`${it.id}: item without a census statement`);
    else {
      if (st.status !== "admitted") problems.push(`${it.id}: item whose statement is ${st.status}`);
      if (st.quote !== it.quote) problems.push(`${it.id}: item quote differs from the census quote`);
      if (st.statement_date !== it.statement_date) problems.push(`${it.id}: statement date differs from the census`);
    }
    const ev = events.get(it.event_id);
    if (!ev) problems.push(`${it.id}: unknown registry event ${it.event_id}`);
    else if (ev.area !== it.area) problems.push(`${it.id}: area ${it.area} differs from the registry event's ${ev.area}`);
    if (it.condition_event_id && !events.has(it.condition_event_id)) problems.push(`${it.id}: unknown condition event ${it.condition_event_id}`);
    if (it.base_rate && !classes.has(it.base_rate.class)) problems.push(`${it.id}: unknown base-rate class ${it.base_rate.class}`);
    if (it.market_ref_id && !marketIds.has(it.market_ref_id)) problems.push(`${it.id}: unknown market ref ${it.market_ref_id}`);
    if (it.rule_version !== ds.version.version) problems.push(`${it.id}: rule_version ${it.rule_version} is not the current ${ds.version.version}`);
  }
  for (const s of ds.statements) if (s.status === "admitted" && !itemIds.has(s.id)) problems.push(`${s.id}: admitted statement without an intake item`);

  for (const b of ds.coder_b) if (!statementIds.has(b.id)) problems.push(`coder-b ${b.id}: unknown statement`);
  for (const o of ds.outcomes) {
    if (!events.has(o.event_id)) problems.push(`outcome ${o.event_id}: unknown registry event`);
    for (const c of o.evidence) if (c.date && o.state === "occurred" && o.date && c.date < o.date && false) problems.push("");
  }
  const outcomeIds = ds.outcomes.map((o) => o.event_id);
  for (const d of new Set(outcomeIds.filter((id, i) => outcomeIds.indexOf(id) !== i))) problems.push(`duplicate outcome for ${d}`);
  for (const r of ds.rechecks) if (!events.has(r.event_id)) problems.push(`recheck ${r.event_id}: unknown registry event`);
  for (const t of ds.timeline) for (const id of t.registry_event_ids) if (!events.has(id)) problems.push(`${t.id}: unknown registry event ${id}`);
  for (const m of ds.market_refs) if (!events.has(m.event_id)) problems.push(`${m.id}: unknown registry event ${m.event_id}`);
  for (const e of ds.registry) {
    if (e.base_rate_class && !classes.has(e.base_rate_class)) problems.push(`${e.id}: unknown base-rate class ${e.base_rate_class}`);
    if (e.market_ref_id && !marketIds.has(e.market_ref_id)) problems.push(`${e.id}: unknown market ref ${e.market_ref_id}`);
  }
  // window-closed items need an outcome or an explicit gap listing
  const asOf = ds.version.as_of;
  const outcomeSet = new Set(outcomeIds);
  const gaps = ds.items.filter((i) => i.panel === "dated" && i.deadline && i.deadline <= asOf && !outcomeSet.has(i.event_id));
  if (gaps.length) problems.push(`warning: ${gaps.length} dated items past deadline have no registry outcome (${[...new Set(gaps.map((g) => g.event_id))].slice(0, 8).join(", ")}...)`);
  return problems;
}
