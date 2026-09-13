import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import fs from "node:fs";
import path from "node:path";
import { PALETTE } from "@/lib/tokens";
import { DEFAULT_LIVE, METHODOLOGY, NOT_YET_PUBLISHED, fmt2, fmt3, type LiveNumbers } from "@/lib/content/methodology";
import { GLOSSARY_SORTED } from "@/lib/content/glossary";
import { Shell } from "@/components/layout/Shell";
import { getDataset } from "@/lib/data/cached";
import { getScores } from "@/lib/data/scores";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the ledger turns a quote into a probability, an outcome and a Brier score.",
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** as_of is data/VERSION. The rules file is the fallback when the file is absent at build time. */
function readAsOf(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "VERSION"), "utf8").trim();
    if (ISO.test(raw)) return raw;
  } catch {
    // fall through to the rules file
  }
  return METHODOLOGY.version.as_of;
}

// ---- styles: hairline tables at 11.5px, no borders on cards, no accent on this page --------------
const S = {
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "6px 0 10px", textWrap: "balance" } as CSSProperties,
  lead: { fontSize: 13, color: PALETTE.ink, maxWidth: "68ch", margin: "0 0 14px" } as CSSProperties,
  nav: { display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.muted, margin: "0 0 26px" } as CSSProperties,
  table: { borderCollapse: "collapse", width: "100%", fontSize: 11.5, lineHeight: 1.45 } as CSSProperties,
  th: { textAlign: "left", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.muted, padding: "6px 10px 6px 0", borderBottom: `0.5px solid ${PALETTE.grid}`, verticalAlign: "bottom" } as CSSProperties,
  td: { padding: "6px 10px 6px 0", borderBottom: `0.5px solid ${PALETTE.grid}`, verticalAlign: "top" } as CSSProperties,
  id: { fontWeight: 700, whiteSpace: "nowrap" } as CSSProperties,
  num: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as CSSProperties,
  headline: { fontSize: 13.5, lineHeight: 1.6, maxWidth: "76ch", margin: 0 } as CSSProperties,
  quote: { margin: "0 0 8px", padding: "0 0 0 12px", borderLeft: `0.5px solid ${PALETTE.grid}`, fontSize: 12.5, lineHeight: 1.5, maxWidth: "68ch" } as CSSProperties,
  h3: { fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", margin: "18px 0 4px" } as CSSProperties,
  steps: { paddingLeft: 18, margin: "8px 0 12px", maxWidth: "72ch", fontSize: 11.5, lineHeight: 1.5 } as CSSProperties,
  result: { fontSize: 11.5, fontWeight: 700, margin: "8px 0 0" } as CSSProperties,
  block: { margin: "16px 0 0" } as CSSProperties,
  sources: { fontSize: 10.5, color: PALETTE.muted, paddingLeft: 16, margin: "8px 0 0", maxWidth: "68ch" } as CSSProperties,
};

const NULL_MARK = "—";
const fmtOrNull = (v: number | null, f: (x: number) => string): string => (v === null ? NULL_MARK : f(v));

// ---- small building blocks ---------------------------------------------------------------------
function Card({ id, wide, big, title, sub, src, children }: { id: string; wide?: boolean; big?: boolean; title: string; sub: string; src?: string; children: ReactNode }) {
  return (
    <section id={id} className={wide ? "card wide" : "card"}>
      <h2 className={big ? "big" : undefined}>{title}</h2>
      <p className="sub">{sub}</p>
      {children}
      {src ? <p className="src">{src}</p> : null}
    </section>
  );
}

function Table({ columns, rows, widths }: { columns: string[]; rows: ReactNode[][]; widths?: (string | undefined)[] }) {
  return (
    <div className="scroll-x">
      <table style={S.table}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" style={{ ...S.th, width: widths?.[i] }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} style={S.td}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pending() {
  return <span className="chip chip--hollow">{NOT_YET_PUBLISHED}</span>;
}

/** Coder agreement from the second-coder match test. Injected later; defaults to "not yet published". */
function PrefilterLine({ prefilter }: { prefilter: LiveNumbers["prefilter"] }) {
  if (prefilter === NOT_YET_PUBLISHED) return <p className="note">Prefilter check: <Pending /></p>;
  return (
    <p className="note">
      Prefilter check: the census finder set {prefilter.rejects_total} statements aside as not forecasts and sent {prefilter.to_code_total} to the coders. Coder B re-read a seeded sample of {prefilter.sample_size} of the set-aside statements and admitted {prefilter.sample_admitted}, an estimated {prefilter.estimated_missed} missed forecasts in the whole set-aside group.
    </p>
  );
}

function KappaBlock({ kappa, prefilter }: { kappa: LiveNumbers["kappa"]; prefilter: LiveNumbers["prefilter"] }) {
  if (kappa === NOT_YET_PUBLISHED) {
    return (
      <div style={S.block}>
        <p className="note">Coder agreement (kappa) per field: <Pending /></p>
        <PrefilterLine prefilter={prefilter} />
      </div>
    );
  }
  const fields: [string, number | null][] = [["admit", kappa.admit], ["event", kappa.event], ["deadline", kappa.deadline], ["bin", kappa.bin], ["asserts", kappa.asserts]];
  return (
    <div style={S.block}>
      <p className="note">Coder agreement (kappa) on {kappa.n_pairs} double-coded statements.{kappa.note ? ` ${kappa.note}` : ""}</p>
      <Table columns={["field", "kappa"]} rows={fields.map(([f, v]) => [f, <span key={f} style={S.num}>{fmtOrNull(v, fmt2)}</span>])} widths={["40%"]} />
      <PrefilterLine prefilter={prefilter} />
    </div>
  );
}

/** Sensitivity panel numbers. Injected later; defaults to "not yet published". */
function SensitivityLiveBlock({ live }: { live: LiveNumbers["sensitivity"] }) {
  if (live === NOT_YET_PUBLISHED) {
    return (
      <p className="note" style={S.block}>
        Live values per person: <Pending />
      </p>
    );
  }
  const variants = METHODOLOGY.sensitivity.variants;
  const columns = ["variant", ...live.map((p) => p.label)];
  const head: ReactNode[] = ["headline", ...live.map((p) => <span key={p.forecaster} style={S.num}>{fmtOrNull(p.headline, fmt3)} (n {p.n_clusters})</span>)];
  const rows: ReactNode[][] = [head, ...variants.map((v) => [
    v.label,
    ...live.map((p) => {
      const r = p.rows.find((x) => x.id === v.id);
      return <span key={p.forecaster} style={S.num}>{r ? `${fmtOrNull(r.value, fmt3)} (n ${r.n_clusters})` : NULL_MARK}</span>;
    }),
  ])];
  return (
    <div style={S.block}>
      <Table columns={columns} rows={rows} />
    </div>
  );
}

const SECTIONS: { id: string; label: string }[] = [
  { id: "headline", label: "Headline" },
  { id: "rules", label: "Rules" },
  { id: "lexicon", label: "Lexicon" },
  { id: "anchors", label: "Deadlines" },
  { id: "quantities", label: "Quantities" },
  { id: "exclusions", label: "Exclusions" },
  { id: "templates", label: "Templates" },
  { id: "references", label: "Reference rows" },
  { id: "metrics", label: "Metrics" },
  { id: "evidence-tiers", label: "Evidence tiers" },
  { id: "coverage-tiers", label: "Coverage tiers" },
  { id: "hindsight", label: "Hindsight controls" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "reading-a-row", label: "Reading a row" },
  { id: "limits", label: "Known limits" },
  { id: "corrections", label: "Corrections" },
  { id: "versions", label: "Versions" },
  { id: "glossary", label: "Glossary" },
];

// ---- the page ------------------------------------------------------------------------------------
function MethodologyView({ live, asOf }: { live: LiveNumbers; asOf: string }) {
  const M = METHODOLOGY;
  const v = M.version.version;
  const T = M.thresholds;
  return (
    <div className="methodology">
      <header>
        <p className="eyebrow">Methodology · rules v{v} · as of {asOf}</p>
        <h1 style={S.h1}>How a quote becomes a score</h1>
        <p style={S.lead}>
          Every rule on this page was written before we checked an outcome. Tables that mirror a rule file are generated from that file, so the page and the score cannot disagree.
        </p>
        <nav aria-label="Sections" style={S.nav}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>
      </header>

      <div className="grid2">
        <Card id="headline" wide big title="Each number is a Brier score on dated claims we could check." sub={`headline paragraph · verbatim · rules v${v}`} src={`Headline · rules v${v} · as of ${asOf}`}>
          <p style={S.headline}>{M.headline}</p>
        </Card>

        <Card id="rules" wide title="The rules were fixed before we looked, and each has one reason." sub="rule · one-sentence reason · stage (intake, scoring, reporting)" src={`Rules · data/rules · v${v}`}>
          <Table
            columns={["#", "stage", "rule", "why"]}
            widths={["4%", "9%", "52%"]}
            rows={M.rules.map((r) => [<span key={r.id} style={S.id}>{r.id}</span>, r.group, r.rule, <span key={`${r.id}-why`} className="note">{r.rationale}</span>])}
          />
        </Card>

        <Card id="lexicon" title="The same word gets the same number for everyone." sub="bin · probability that the event happens · A 0.90 to E 0.10" src={`Lexicon · data/rules/lexicon.json · v${M.lexicon.version}`}>
          <Table
            columns={["bin", "p", "label", "phrases"]}
            widths={["8%", "10%", "16%"]}
            rows={M.lexicon.rows.map((b) => [<span key={b.bin} style={S.id}>{b.bin}</span>, <span key={`${b.bin}-p`} style={S.num}>{fmt2(b.p)}</span>, b.label, b.phrases.join(", ")])}
          />
          <p className="note" style={S.block}>{M.lexicon.note}</p>
          <p className="note" style={{ marginTop: 8 }}>
            Alternative maps used by the sensitivity panel: {M.lexicon.maps.map((m) => `${m.id} (A ${fmt2(m.values.A)}, B ${fmt2(m.values.B)}, C ${fmt2(m.values.C)}, D ${fmt2(m.values.D)}, E ${fmt2(m.values.E)})`).join("; ")}.
          </p>
          <ol style={S.sources}>
            {M.lexicon.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>

        <Card id="anchors" title="Only the person's words set a deadline." sub="pattern in the words · deadline · origin (stated, anchor, table)" src={`Anchor table · data/rules/anchors.json · v${M.anchors.version}`}>
          <Table
            columns={["the person wrote", "deadline", "origin", "note"]}
            widths={["34%", "30%", "12%"]}
            rows={M.anchors.rows.map((a) => [a.pattern, a.deadline, a.origin, [a.tag ? `tag ${a.tag}` : null, a.note].filter(Boolean).join("; ") || NULL_MARK])}
          />
          <p className="note" style={S.block}>{M.anchors.note}</p>
        </Card>

        <Card id="quantities" title="A number claim resolves on the named series only." sub={`rule · band ${T.point_band_pct} percent · unresolvable after 12 months`} src={`Quantities · data/rules/templates.json (quantity_threshold) · v${M.templates.version}`}>
          <Table columns={["#", "rule"]} widths={["8%"]} rows={M.quantities.rules.map((q) => [<span key={q.id} style={S.id}>{q.id}</span>, q.rule])} />
          <p className="note" style={S.block}>Template criterion: {M.quantities.criterion}</p>
        </Card>

        <Card id="exclusions" title="Vague, controlled and reported claims never enter the score." sub="code · label · the test the coder applies" src={`Reason codes · data/rules/reason-codes.json · v${M.exclusions.version}`}>
          <Table
            columns={["code", "label", "test"]}
            widths={["18%", "22%"]}
            rows={M.exclusions.notAdmitted.map((r) => [<span key={r.code} style={S.id}>{r.code}</span>, r.label, r.test])}
          />
          <h3 style={S.h3}>Void after intake</h3>
          <Table
            columns={["code", "label", "test"]}
            widths={["18%", "22%"]}
            rows={M.exclusions.voidCodes.map((r) => [<span key={r.code} style={S.id}>{r.code}</span>, r.label, r.test])}
          />
          <h3 style={S.h3}>Tags (scored, but flagged)</h3>
          <Table columns={["tag", "test"]} widths={["18%"]} rows={M.exclusions.tags.map((t) => [<span key={t.tag} style={S.id}>{t.tag}</span>, t.test])} />
        </Card>

        <Card id="templates" wide title="Every event is written on the asset, from one of eight templates." sub="template · proposition · criterion for TRUE · source type" src={`Templates · data/rules/templates.json · v${M.templates.version}`}>
          <p className="note" style={{ margin: "0 0 12px" }}>{M.templates.note}</p>
          <Table
            columns={["template", "proposition", "criterion", "source"]}
            widths={["13%", "22%", "45%"]}
            rows={M.templates.rows.map((t) => [<span key={t.template} style={S.id}>{t.template}</span>, t.proposition, t.criterion, t.source])}
          />
        </Card>

        <Card id="references" wide title="The base rate and the market are scored on the same events as the person." sub={`reference row · how it is scored · minimum n · coin flip ${fmt2(M.coinFlip)} as a line`} src={`Reference rows · data/rules/base-rates.json · v${M.references.version}`}>
          <Table
            columns={["row", "how", "min n"]}
            widths={["12%", "76%"]}
            rows={M.references.rows.map((r) => [<span key={r.id} style={S.id}>{r.label}</span>, r.how, <span key={`${r.id}-n`} style={S.num}>{r.min_n === null ? NULL_MARK : String(r.min_n)}</span>])}
          />
          <h3 style={S.h3}>The halving rule</h3>
          <p className="note" style={{ maxWidth: "80ch", margin: 0 }}>{M.references.halving}</p>
          <h3 style={S.h3}>Base-rate classes</h3>
          <Table
            columns={["class", "p", "median months", "source"]}
            widths={["30%", "8%", "12%"]}
            rows={M.references.classes.map((c) => [
              <span key={c.cls}>{c.label} <span className="note">({c.cls})</span></span>,
              <span key={`${c.cls}-p`} style={S.num}>{fmtOrNull(c.p, fmt3)}</span>,
              <span key={`${c.cls}-m`} style={S.num}>{c.median_months === null ? NULL_MARK : String(c.median_months)}</span>,
              c.source_url ? <a key={`${c.cls}-s`} href={c.source_url} rel="noopener noreferrer">{c.source}</a> : c.source,
            ])}
          />
        </Card>

        <Card id="metrics" wide title="Eleven metrics, each with its formula and its minimum n." sub="id · formula in plain text · minimum resolved clusters (from thresholds.json) · unit" src={`Metrics · data/rules/thresholds.json · v${M.version.version} · bootstrap ${T.bootstrap_resamples} resamples, seed ${T.bootstrap_seed}`}>
          <Table
            columns={["#", "metric", "formula", "min n", "unit", "note"]}
            widths={["4%", "12%", "44%", "8%", "14%"]}
            rows={M.metrics.map((m) => [
              <span key={m.id} style={S.id}>{m.id}</span>,
              <span key={`${m.id}-n`} style={{ fontWeight: 700 }}>{m.name}</span>,
              m.formula,
              <span key={`${m.id}-min`} style={S.num}>{m.min_n === null ? NULL_MARK : String(m.min_n)}<br /><span className="note">{m.min_n_source}</span></span>,
              m.unit,
              <span key={`${m.id}-note`} className="note">{m.note}</span>,
            ])}
          />
          <p className="note" style={S.block}>
            Ranking rule: a helper canRank(a, b) returns true only when both rows are T1 or better, both persons share a coverage tier, and the two intervals do not overlap. The leaderboard shows rank only when canRank is true.
          </p>
        </Card>

        <Card id="evidence-tiers" title={`Below ${T.min_clusters_headline} clusters we show counts, not a score.`} sub="tier · resolved clusters · what is shown" src={`Evidence tiers · thresholds min_clusters_headline ${T.min_clusters_headline}, provisional_below_clusters ${T.provisional_below_clusters}`}>
          <Table columns={["tier", "label", "range", "shown"]} widths={["8%", "16%", "26%"]} rows={M.evidenceTiers.map((t) => [<span key={t.tier} style={S.id}>{t.tier}</span>, t.label, t.range, t.shown])} />
        </Card>

        <Card id="coverage-tiers" title="We rank only people whose archives were read the same way." sub="tier · how the corpus was built" src="Coverage tiers · data/forecasters.json corpus_tier">
          <Table columns={["tier", "label", "definition"]} widths={["8%", "20%"]} rows={M.coverageTiers.map((t) => [<span key={t.tier} style={S.id}>{t.tier}</span>, t.label, t.definition])} />
          <p className="note" style={S.block}>{M.coverageRankNote}</p>
        </Card>

        <Card id="hindsight" wide title="Coders never see outcomes, and resolvers never see probabilities." sub="control · what it stops · where it lives" src="Hindsight controls · lib/data/schema.ts · data/rules">
          <Table columns={["#", "control", "where"]} widths={["5%", "70%"]} rows={M.hindsight.map((h) => [<span key={h.id} style={S.id}>{h.id}</span>, h.control, <span key={`${h.id}-w`} className="note">{h.where}</span>])} />
          <KappaBlock kappa={live.kappa} prefilter={live.prefilter} />
        </Card>

        <Card id="sensitivity" wide title="The headline is shown again under seven alternative rules." sub={`variant · what changes · null below ${T.min_clusters_headline} clusters`} src={`Sensitivity · data/rules/lexicon.json sensitivity_maps · v${M.lexicon.version}`}>
          <Table columns={["variant", "label", "what changes"]} widths={["14%", "16%"]} rows={M.sensitivity.variants.map((s) => [<span key={s.id} style={S.id}>{s.id}</span>, s.label, s.how])} />
          <p className="note" style={S.block}>{M.sensitivity.note}</p>
          <SensitivityLiveBlock live={live.sensitivity} />
        </Card>

        <Card id="reading-a-row" wide title="One event gives one vote, however often it was predicted." sub="two worked examples · every step a coder takes · the number that results" src="Worked examples · rules v1.0.0 · lib/score/brier.ts">
          {M.examples.map((ex) => (
            <div key={ex.id} style={{ margin: "0 0 22px" }}>
              <h3 style={S.h3}>{ex.title}</h3>
              <p className="note" style={{ margin: "0 0 6px" }}>{ex.person} · {ex.statement_date}</p>
              <blockquote style={S.quote}>{ex.quote}</blockquote>
              <p className="note" style={{ margin: "0 0 4px" }}>{ex.source}</p>
              <ol style={S.steps}>
                {ex.steps.map((s) => (
                  <li key={s.step}>
                    <strong>{s.step}.</strong> {s.detail}
                  </li>
                ))}
              </ol>
              <Table columns={[...ex.table.columns]} rows={ex.table.rows.map((r) => r.map((c, i) => (i > 0 && /^[\d.]+$/.test(c) ? <span key={i} style={S.num}>{c}</span> : c)))} />
              <p style={S.result}>{ex.result}</p>
            </div>
          ))}
        </Card>

        <Card id="limits" title="The score is honest about what it cannot show." sub="limit · effect on the reading" src="Known limits · rules v1.0.0">
          <Table columns={["#", "limit", "effect"]} widths={["8%", "30%"]} rows={M.limits.map((l) => [<span key={l.id} style={S.id}>{l.id}</span>, l.limit, l.effect])} />
        </Card>

        <Card id="corrections" title="Every change to a published number is logged here." sub="date · scope · change · reason · version from and to" src="Corrections log · data corrections">
          {M.corrections.rows.length === 0 ? (
            <p className="note">{M.corrections.empty}</p>
          ) : (
            <Table columns={[...M.corrections.columns]} rows={M.corrections.rows.map((c) => [c.date, c.scope, c.change, c.reason, c.version_from, c.version_to])} />
          )}
        </Card>

        <Card id="versions" wide title={`Rules version ${v} is in force.`} sub="version · date · as-of date of the scores · note" src={`Version history · data/rules/version.json · data/VERSION ${asOf}`}>
          <Table
            columns={["version", "date", "as of", "note"]}
            widths={["10%", "12%", "12%"]}
            rows={M.versions.map((r) => [<span key={r.version} style={S.id}>{r.version}</span>, <span key={`${r.version}-d`} style={S.num}>{r.date}</span>, <span key={`${r.version}-a`} style={S.num}>{r.as_of}</span>, r.note])}
          />
          <p className="note" style={S.block}>Scores on this site are computed as of {asOf}. A later as-of date re-scores every item whose deadline has passed since.</p>
        </Card>

        <Card id="glossary" wide title="Each term keeps one meaning across the site." sub="term · definition · related terms" src="Glossary · lib/content/glossary.ts">
          <Table
            columns={["term", "definition", "see"]}
            widths={["16%", "66%"]}
            rows={GLOSSARY_SORTED.map((g) => [<span key={g.term} style={S.id}>{g.term}</span>, g.definition, <span key={`${g.term}-see`} className="note">{g.see?.join(", ") ?? ""}</span>])}
          />
        </Card>
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  const snap = getScores();
  const ds = getDataset();
  const a = snap.agreement;
  const prefilterPath = path.join(process.cwd(), "data", "intake", "prefilter-audit.json");
  const prefilter: LiveNumbers["prefilter"] = fs.existsSync(prefilterPath) ? (JSON.parse(fs.readFileSync(prefilterPath, "utf8")) as LiveNumbers["prefilter"]) : NOT_YET_PUBLISHED;
  const live: LiveNumbers = a.admission.n + a.event.n === 0 ? { ...DEFAULT_LIVE, prefilter } : {
    prefilter,
    kappa: { n_pairs: a.admission.n, admit: a.admission.kappa, event: a.event.kappa, deadline: a.deadline.kappa, bin: a.bin.weighted_kappa, asserts: null, note: `event and deadline on ${a.event.n} admitted items; bin on ${a.bin.n}; ${a.recheck.n} outcomes rechecked, ${a.recheck.upheld} upheld` },
    sensitivity: ds.forecasters.map((f) => {
      const s = snap.forecasters[f.slug];
      const pick = (k: string) => s.sensitivity[k] ?? { brier: null, n_clusters: 0 };
      return {
        forecaster: f.slug, label: f.short, headline: s.headline.brier ? s.headline.brier.point : null, n_clusters: s.headline.n_clusters,
        rows: [
          { id: "ends_085_015" as const, value: pick("map_ends85").brier, n_clusters: pick("map_ends85").n_clusters },
          { id: "kent" as const, value: pick("map_kent").brier, n_clusters: pick("map_kent").n_clusters },
          { id: "flat_075" as const, value: pick("map_flat75").brier, n_clusters: pick("map_flat75").n_clusters },
          { id: "non_affiliated" as const, value: pick("non_affiliated").brier, n_clusters: pick("non_affiliated").n_clusters },
          { id: "prospective_only" as const, value: pick("prospective_only").brier, n_clusters: pick("prospective_only").n_clusters },
          { id: "undated_pooled" as const, value: pick("undated_pooled").brier, n_clusters: pick("undated_pooled").n_clusters },
          { id: "loo_max_change" as const, value: s.headline.loo_max_change, n_clusters: s.headline.n_clusters },
        ],
      };
    }),
  };
  return <Shell current="/methodology" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}><MethodologyView live={live} asOf={readAsOf()} /></Shell>;
}
