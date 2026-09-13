// Validates a data root: every file parses with its schema, then referential rules run with the row id
// in each message. Errors exit 1; warnings print. Usage: tsx scripts/validate.ts [--root <dir>]
// The rules live here and not in the loader so the loader stays a plain parse. The module has no
// side effects on import: tests call validateDataset() directly; main() runs only under tsx.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { monthsBetween } from "@/lib/dates";
import { formatIssue, parseDataset, readJsonFile, type Dataset, type FreezeRelease } from "@/lib/data/load";
import { PATHS, PER_FORECASTER_DIRS, dataFile, rawPostFiles } from "@/lib/data/paths";
import { AREA_SLUGS, FORECASTER_SLUGS } from "@/lib/data/schema";

export interface ValidationReport { root: string; errors: string[]; warnings: string[]; counts: Record<string, number> }

/** Whitespace collapses to one space; typographic quotes, dashes and ellipses take their ASCII form. */
export function normalizeText(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/** A quote matches when each fragment around "..." appears in the text, in order. */
export function quoteFound(quote: string, text: string): boolean {
  const hay = normalizeText(text);
  const parts = normalizeText(quote).split("...").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  let from = 0;
  for (const part of parts) {
    const idx = hay.indexOf(part, from);
    if (idx < 0) return false;
    from = idx + part.length;
  }
  return true;
}

function sha256File(abs: string): string {
  return createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const out = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) out.add(id);
    seen.add(id);
  }
  return [...out];
}

/** Raw post text by slug: null when no raw file exists (free or paid). */
function rawTextReader(root: string): (slug: string) => string | null {
  const memo = new Map<string, string | null>();
  return (slug) => {
    if (memo.has(slug)) return memo.get(slug)!;
    let text: string | null = null;
    for (const rel of rawPostFiles(slug)) {
      const abs = dataFile(root, rel);
      if (!fs.existsSync(abs)) continue;
      const read = readJsonFile(abs);
      if (!read.ok || !read.value || typeof read.value !== "object") continue;
      const post = read.value as { text?: unknown; body_html?: unknown };
      text = typeof post.text === "string" ? post.text : typeof post.body_html === "string" ? post.body_html.replace(/<[^>]+>/g, " ") : "";
      break;
    }
    memo.set(slug, text);
    return text;
  };
}

function strayFiles(root: string, warn: (m: string) => void): void {
  const known = new Set<string>(FORECASTER_SLUGS);
  const freezeAbs = dataFile(root, PATHS.freeze);
  for (const dir of Object.values(PER_FORECASTER_DIRS)) {
    const abs = dataFile(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (!f.endsWith(".json")) continue;
      if (path.join(abs, f) === freezeAbs) continue;
      if (!known.has(f.replace(/\.json$/, ""))) warn(`${dir}/${f}: not a forecaster file; the loader ignores it`);
    }
  }
}

function referentialRules(ds: Dataset, root: string, freeze: FreezeRelease[], err: (m: string) => void, warn: (m: string) => void): { rawChecked: number } {
  const asOf = ds.version.as_of;
  const th = ds.thresholds;
  const forecasters = new Map(ds.forecasters.map((f) => [f.slug, f]));
  const events = new Map(ds.registry.map((e) => [e.id, e]));
  const statements = new Map(ds.statements.map((s) => [s.id, s]));
  const items = new Map(ds.items.map((i) => [i.id, i]));
  const classes = new Map(ds.base_rates.classes.map((c) => [c.class, c]));
  const marketIds = new Set(ds.market_refs.map((m) => m.id));
  const binP = new Map(ds.lexicon.bins.map((b) => [b.bin, b.p]));
  const outcomes = new Map(ds.outcomes.map((o) => [o.event_id, o]));

  // forecasters and areas
  for (const d of duplicates(ds.forecasters.map((f) => f.slug))) err(`forecasters.json [${d}]: duplicate slug`);
  for (const slug of FORECASTER_SLUGS) if (!forecasters.has(slug)) warn(`forecasters.json: no row for ${slug}`);
  const heroes = ds.forecasters.filter((f) => f.hero).length;
  if (ds.forecasters.length > 0 && heroes !== 1) warn(`forecasters.json: ${heroes} hero rows; the site expects one`);
  for (const f of ds.forecasters) if (f.coverage.period.from > f.coverage.period.to) err(`forecasters.json [${f.slug}]: coverage period ends before it starts`);
  for (const d of duplicates(ds.areas.map((a) => a.slug))) err(`areas.json [${d}]: duplicate slug`);
  const areaSlugs = new Set(ds.areas.map((a) => a.slug));
  for (const a of AREA_SLUGS) if (!areaSlugs.has(a)) warn(`areas.json: no row for ${a}`);

  // registry
  for (const d of duplicates(ds.registry.map((e) => e.id))) err(`registry/events.json [${d}]: duplicate id`);
  for (const e of ds.registry) {
    if (e.template === "quantity_threshold" && !e.quantity) err(`registry/events.json [${e.id}]: quantity_threshold needs quantity`);
    if (e.base_rate_class && !classes.has(e.base_rate_class)) err(`registry/events.json [${e.id}]: unknown base_rate_class ${e.base_rate_class}`);
    if (e.market_ref_id && !marketIds.has(e.market_ref_id)) err(`registry/events.json [${e.id}]: unknown market_ref_id ${e.market_ref_id}`);
  }

  // statements
  const rawText = rawTextReader(root);
  let rawChecked = 0;
  for (const d of duplicates(ds.statements.map((s) => s.id))) err(`statements [${d}]: duplicate id`);
  for (const s of ds.statements) {
    const file = `statements/${s.forecaster}.json`;
    if (!s.id.startsWith(`${s.forecaster}-`)) err(`${file} [${s.id}]: id prefix does not match forecaster ${s.forecaster}`);
    const f = forecasters.get(s.forecaster);
    if (!f) err(`${file} [${s.id}]: unknown forecaster ${s.forecaster}`);
    else if (s.statement_date < f.coverage.period.from || s.statement_date > f.coverage.period.to) warn(`${file} [${s.id}]: statement_date ${s.statement_date} lies outside the coverage period`);
    if (s.quote.length > th.quote_max_chars) warn(`${file} [${s.id}]: quote longer than ${th.quote_max_chars} chars`);
    if (s.status === "admitted" && !items.has(s.id)) err(`${file} [${s.id}]: admitted statement has no intake item`);
    if (s.source.post_slug) {
      const text = rawText(s.source.post_slug);
      if (text === null) warn(`${file} [${s.id}]: raw post ${s.source.post_slug} not found; quote unchecked`);
      else {
        rawChecked += 1;
        if (!quoteFound(s.quote, text)) err(`${file} [${s.id}]: quote is not in raw post ${s.source.post_slug}`);
      }
    }
  }

  // items
  for (const d of duplicates(ds.items.map((i) => i.id))) err(`intake [${d}]: duplicate id`);
  for (const it of ds.items) {
    const file = `intake/${it.forecaster}.json`;
    const id = it.id;
    if (!id.startsWith(`${it.forecaster}-`)) err(`${file} [${id}]: id prefix does not match forecaster ${it.forecaster}`);
    const s = statements.get(id);
    if (!s) err(`${file} [${id}]: no census statement with this id`);
    else {
      if (s.forecaster !== it.forecaster) err(`${file} [${id}]: statement belongs to ${s.forecaster}`);
      if (s.status !== "admitted") err(`${file} [${id}]: statement status is ${s.status}, not admitted`);
      if (s.quote !== it.quote) err(`${file} [${id}]: quote differs from the census statement`);
      if (s.statement_date !== it.statement_date) err(`${file} [${id}]: statement_date differs from the census statement`);
    }
    const ev = events.get(it.event_id);
    if (!ev) err(`${file} [${id}]: unknown event_id ${it.event_id}`);
    else if (ev.area !== it.area) err(`${file} [${id}]: area ${it.area} differs from event ${ev.id} area ${ev.area}`);
    if (it.condition_event_id && !events.has(it.condition_event_id)) err(`${file} [${id}]: unknown condition_event_id ${it.condition_event_id}`);
    if (it.panel === "headline") {
      if (!it.deadline_origin) err(`${file} [${id}]: headline item needs deadline_origin`);
      if (!it.deadline_text) warn(`${file} [${id}]: headline item has no deadline_text`);
    }
    if (it.base_rate) {
      const cls = classes.get(it.base_rate.class);
      if (!cls) err(`${file} [${id}]: unknown base_rate class ${it.base_rate.class}`);
      else {
        const expected = it.base_rate.halved ? it.base_rate.p_raw / 2 : it.base_rate.p_raw;
        if (Math.abs(expected - it.base_rate.p) > 1e-9) err(`${file} [${id}]: base_rate.p ${it.base_rate.p} is not ${it.base_rate.halved ? "half of" : "equal to"} p_raw ${it.base_rate.p_raw}`);
        if (cls.p !== null && Math.abs(cls.p - it.base_rate.p_raw) > 1e-9) warn(`${file} [${id}]: base_rate.p_raw ${it.base_rate.p_raw} differs from the table value ${cls.p}`);
        if (it.deadline && cls.median_months !== null) {
          const shouldHalve = monthsBetween(it.statement_date, it.deadline) < cls.median_months;
          if (shouldHalve !== it.base_rate.halved) warn(`${file} [${id}]: window ${monthsBetween(it.statement_date, it.deadline)} months vs median ${cls.median_months}: halved should be ${shouldHalve}`);
        }
      }
    }
    if (it.market_ref_id && !marketIds.has(it.market_ref_id)) err(`${file} [${id}]: unknown market_ref_id ${it.market_ref_id}`);
    if (it.rule_version !== ds.version.version) warn(`${file} [${id}]: rule_version ${it.rule_version} is not the current ${ds.version.version}`);
    if (!it.asserts && !it.tags.includes("denial")) warn(`${file} [${id}]: asserts is false without the denial tag`);
    if (it.p_origin === "lexicon" && it.bin && !it.p_note) {
      const v = binP.get(it.bin);
      if (v !== undefined) {
        const expected = it.tags.includes("denial") ? 1 - v : v;
        if (Math.abs(expected - it.p) > 1e-9) warn(`${file} [${id}]: p ${it.p} differs from bin ${it.bin} value ${expected}`);
      }
    }
    if (it.p_origin === "stated" && !it.tags.includes("stated_number")) warn(`${file} [${id}]: stated p without the stated_number tag`);
    if (it.source.post_slug && it.quote !== s?.quote) {
      const text = rawText(it.source.post_slug);
      if (text !== null && !quoteFound(it.quote, text)) err(`${file} [${id}]: quote is not in raw post ${it.source.post_slug}`);
    }
  }

  // coder B
  const released = freeze.length > 0;
  const coderB = new Map(ds.coder_b.map((b) => [b.id, b]));
  for (const d of duplicates(ds.coder_b.map((b) => b.id))) err(`intake/coder-b [${d}]: duplicate id`);
  for (const b of ds.coder_b) {
    if (!statements.has(b.id)) err(`intake/coder-b [${b.id}]: no census statement with this id`);
    if (b.admit && b.event_id && !events.has(b.event_id)) err(`intake/coder-b [${b.id}]: unknown event_id ${b.event_id}`);
    if (!b.admit && !b.reason_code) warn(`intake/coder-b [${b.id}]: not admitted without a reason_code`);
  }
  for (const it of ds.items) {
    if (it.panel !== "headline" || coderB.has(it.id)) continue;
    const msg = `intake/${it.forecaster}.json [${it.id}]: headline item has no coder-b record`;
    if (released) err(msg); else warn(msg);
  }
  for (const rel of freeze) {
    for (const f of rel.files) {
      const abs = dataFile(root, f.path);
      if (!fs.existsSync(abs)) { warn(`intake/freeze.json [${rel.release}]: frozen file ${f.path} is missing`); continue; }
      if (sha256File(abs) !== f.sha256) warn(`intake/freeze.json [${rel.release}]: ${f.path} changed since the release`);
    }
  }

  // outcomes
  for (const d of duplicates(ds.outcomes.map((o) => o.event_id))) err(`resolutions [${d}]: more than one outcome for this event`);
  for (const o of ds.outcomes) {
    if (!events.has(o.event_id)) err(`resolutions [${o.event_id}]: unknown event_id`);
    if (o.state === "occurred" && o.date && o.resolved_at < o.date) err(`resolutions [${o.event_id}]: resolved_at ${o.resolved_at} precedes the event date ${o.date}`);
    if (o.checked_through > asOf) warn(`resolutions [${o.event_id}]: checked_through ${o.checked_through} is after as_of ${asOf}`);
    for (const c of o.evidence) if (c.accessed > asOf) warn(`resolutions [${o.event_id}]: evidence accessed ${c.accessed} is after as_of ${asOf}`);
  }
  for (const it of ds.items) {
    if (it.panel !== "headline" || !it.deadline || it.deadline > asOf) continue;
    const o = outcomes.get(it.event_id);
    const file = `intake/${it.forecaster}.json`;
    if (!o) { warn(`${file} [${it.id}]: deadline ${it.deadline} has passed and event ${it.event_id} has no outcome (unresolved)`); continue; }
    if (o.state === "not_occurred" && o.checked_through < it.deadline) warn(`${file} [${it.id}]: outcome for ${it.event_id} checked through ${o.checked_through}, before the deadline ${it.deadline} (unresolved)`);
    if (it.condition_event_id && !outcomes.has(it.condition_event_id)) warn(`${file} [${it.id}]: condition event ${it.condition_event_id} has no outcome (unresolved)`);
  }

  // rechecks, timeline, market refs
  for (const r of ds.rechecks) if (!events.has(r.event_id)) err(`recheck [${r.event_id}]: unknown event_id`);
  for (const d of duplicates(ds.timeline.map((t) => t.id))) err(`registry/timeline.json [${d}]: duplicate id`);
  for (const t of ds.timeline) for (const id of t.registry_event_ids) if (!events.has(id)) err(`registry/timeline.json [${t.id}]: unknown registry event ${id}`);
  for (const d of duplicates(ds.market_refs.map((m) => m.id))) err(`market-refs.json [${d}]: duplicate id`);
  for (const m of ds.market_refs) {
    if (!events.has(m.event_id)) err(`market-refs.json [${m.id}]: unknown event_id ${m.event_id}`);
    for (let i = 1; i < m.prices.length; i++) if (m.prices[i].date < m.prices[i - 1].date) { warn(`market-refs.json [${m.id}]: prices are not in date order`); break; }
  }
  return { rawChecked };
}

export function validateDataset(root?: string): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const warn = (m: string) => warnings.push(m);

  const report = parseDataset(root);
  for (const i of report.issues) err(formatIssue(i));
  strayFiles(report.root, warn);
  // The referential pass runs on every record that parsed, so one broken row does not hide the others.
  const ds = report.dataset ?? report.partial;
  if (report.version_file && ds && report.version_file !== ds.version.as_of) {
    err(`VERSION: ${report.version_file} differs from rules/version.json as_of ${ds.version.as_of}`);
  }

  const counts: Record<string, number> = {};
  let rawChecked = 0;
  if (ds) {
    rawChecked = referentialRules(ds, report.root, report.freeze, err, warn).rawChecked;
    counts.forecasters = ds.forecasters.length;
    counts.areas = ds.areas.length;
    counts.registry_events = ds.registry.length;
    counts.timeline_events = ds.timeline.length;
    counts.statements = ds.statements.length;
    counts.statements_admitted = ds.statements.filter((s) => s.status === "admitted").length;
    counts.statements_not_admitted = ds.statements.filter((s) => s.status === "not_admitted").length;
    counts.statements_void = ds.statements.filter((s) => s.status === "void").length;
    counts.items = ds.items.length;
    counts.items_headline = ds.items.filter((i) => i.panel === "headline").length;
    counts.items_undated = ds.items.filter((i) => i.panel === "undated").length;
    counts.coder_b = ds.coder_b.length;
    counts.outcomes = ds.outcomes.length;
    counts.rechecks = ds.rechecks.length;
    counts.market_refs = ds.market_refs.length;
    counts.corrections = ds.corrections.length;
    counts.freeze_releases = report.freeze.length;
  } else {
    for (const f of report.files) if (f.rows !== null) counts[f.file] = f.rows;
  }
  counts.quotes_checked_against_raw = rawChecked;
  counts.errors = errors.length;
  counts.warnings = warnings.length;
  return { root: report.root, errors, warnings, counts };
}

export function formatReport(rep: ValidationReport): string {
  const lines: string[] = [`validate ${rep.root}`];
  if (rep.errors.length) { lines.push(`\nerrors (${rep.errors.length})`); for (const e of rep.errors) lines.push(`  - ${e}`); }
  if (rep.warnings.length) { lines.push(`\nwarnings (${rep.warnings.length})`); for (const w of rep.warnings) lines.push(`  - ${w}`); }
  lines.push("\nsummary");
  const keys = Object.keys(rep.counts);
  const width = Math.max(...keys.map((k) => k.length), 1);
  for (const k of keys) lines.push(`  ${k.padEnd(width)}  ${String(rep.counts[k]).padStart(6)}`);
  return lines.join("\n");
}

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const rep = validateDataset(argAfter("--root"));
  console.log(formatReport(rep));
  process.exit(rep.errors.length ? 1 : 0);
}

if (process.argv[1] && /validate\.ts$/.test(process.argv[1])) main();
