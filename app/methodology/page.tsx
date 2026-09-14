// Method: one card per section, each a shared Card with a noun title and a computed takeaway from
// lib/content/methodology.ts. Tables mirror the rule files and sit inside .scroll-x with plain Term links.
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import fs from "node:fs";
import path from "node:path";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { Term } from "@/components/ui/Term";
import { GLOSSARY_SORTED, defineTerm } from "@/lib/content/glossary";
import {
  DEFAULT_LIVE,
  METHOD_LEDE,
  METHOD_SECTIONS,
  METHODOLOGY,
  NOT_YET_PUBLISHED,
  fmt2,
  fmt3,
  glossaryLetters,
  kappaNote,
  kappaSentence,
  methodSection,
  prefilterSentence,
  sensitivityCell,
  type LiveNumbers,
} from "@/lib/content/methodology";
import { getDataset } from "@/lib/data/cached";
import { getScores } from "@/lib/data/scores";
import type { Correction } from "@/lib/data/schema";
import { NA, fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Method",
  description: METHOD_LEDE,
};

// ---- styles: the body register inside cards, bold ids, the verbatim quote ----------------------------
const S = {
  body: { fontSize: 12.5, lineHeight: 1.5, color: "var(--color-gray-2)" } as CSSProperties,
  id: { fontWeight: 700, whiteSpace: "nowrap" } as CSSProperties,
  quote: { margin: "0 0 8px", padding: "0 0 0 12px", borderLeft: "0.5px solid var(--color-grid)", fontSize: 13, lineHeight: 1.5, color: "var(--color-ink)", maxWidth: "68ch" } as CSSProperties,
  result: { fontWeight: 700 } as CSSProperties,
};

const fmtOrNull = (v: number | null, f: (x: number) => string): string => (v === null ? NA : f(v));
const intOrNull = (v: number | null): string => (v === null ? NA : String(v));

// ---- small building blocks ---------------------------------------------------------------------------
/** A table header cell. A header that is itself a glossary term becomes a plain Term link. */
function Th({ label, width }: { label: ReactNode; width?: string }) {
  const text = typeof label === "string" && defineTerm(label) ? <Term t={label} plain /> : label;
  return (
    <th scope="col" style={{ width }}>
      {text}
    </th>
  );
}

interface TableProps {
  columns: ReactNode[];
  rows: ReactNode[][];
  widths?: (string | undefined)[];
  /** Row ids for anchors (g-{slug}, rc-{CODE}). */
  rowIds?: (string | undefined)[];
}

/** Hairline table at 11.5px inside a horizontal scroller. Term links inside must be plain. */
function Table({ columns, rows, widths, rowIds }: TableProps) {
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <Th key={i} label={c} width={widths?.[i]} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowIds?.[i] ?? i} id={rowIds?.[i]}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The card body: prose structure (h3, p, ol, table) in the body register. */
function Body({ children }: { children: ReactNode }) {
  return (
    <div className="prose" style={S.body}>
      {children}
    </div>
  );
}

function Pending() {
  return <span className="chip chip--hollow">{NOT_YET_PUBLISHED}</span>;
}

/** A section card: id, noun title, takeaway and src line from METHOD_SECTIONS. */
function Section({ id, wide, children }: { id: string; wide?: boolean; children: ReactNode }) {
  const s = methodSection(id);
  return (
    <Card id={s.id} title={s.title} takeaway={s.takeaway} src={s.src} wide={wide}>
      <Body>{children}</Body>
    </Card>
  );
}

/** Coder agreement from the second-coder match test. Defaults to "not yet published". */
function PrefilterLine({ prefilter }: { prefilter: LiveNumbers["prefilter"] }) {
  if (prefilter === NOT_YET_PUBLISHED) {
    return (
      <p>
        Prefilter check: <Pending />
      </p>
    );
  }
  return <p>{prefilterSentence(prefilter)}</p>;
}

function KappaBlock({ kappa, prefilter }: { kappa: LiveNumbers["kappa"]; prefilter: LiveNumbers["prefilter"] }) {
  if (kappa === NOT_YET_PUBLISHED) {
    return (
      <>
        <p>
          Coder agreement (<Term t="kappa" />) per field: <Pending />
        </p>
        <PrefilterLine prefilter={prefilter} />
      </>
    );
  }
  const fields: [string, number | null][] = [
    ["admit", kappa.admit],
    ["event", kappa.event],
    ["deadline", kappa.deadline],
    ["bin", kappa.bin],
    ["asserts", kappa.asserts],
  ];
  return (
    <>
      <p>
        Coder agreement (<Term t="kappa" />) {kappaSentence(kappa)}
      </p>
      <Table
        columns={["field", "kappa"]}
        widths={["40%"]}
        rows={fields.map(([f, v]) => [
          f,
          <span key={f} className="mono">
            {fmtOrNull(v, fmt2)}
          </span>,
        ])}
      />
      <PrefilterLine prefilter={prefilter} />
    </>
  );
}

/** Sensitivity panel numbers per person. Defaults to "not yet published". */
function SensitivityLiveBlock({ live }: { live: LiveNumbers["sensitivity"] }) {
  if (live === NOT_YET_PUBLISHED) {
    return (
      <p>
        Live values per person: <Pending />
      </p>
    );
  }
  const variants = METHODOLOGY.sensitivity.variants;
  const columns: ReactNode[] = ["variant", ...live.map((p) => p.label)];
  const head: ReactNode[] = [
    <Term key="headline" t="headline panel" plain>
      headline
    </Term>,
    ...live.map((p) => (
      <span key={p.forecaster} className="mono">
        {sensitivityCell(p.headline, p.n_clusters, NA)}
      </span>
    )),
  ];
  const rows: ReactNode[][] = [
    head,
    ...variants.map((v) => [
      v.label,
      ...live.map((p) => {
        const r = p.rows.find((x) => x.id === v.id);
        return (
          <span key={p.forecaster} className="mono">
            {r ? sensitivityCell(r.value, r.n_clusters, NA) : NA}
          </span>
        );
      }),
    ]),
  ];
  return <Table columns={columns} rows={rows} />;
}

function CorrectionsTable({ rows }: { rows: Correction[] }) {
  const M = METHODOLOGY.corrections;
  if (rows.length === 0) return <p>{M.empty}</p>;
  return (
    <Table
      columns={[...M.columns]}
      widths={["10%", "18%", "34%", "26%"]}
      rows={rows.map((c) => [
        <span key="d" className="mono">
          {fmtDate(c.date)}
        </span>,
        c.scope,
        c.change,
        c.reason,
        <span key="f" className="mono">
          {c.version_from}
        </span>,
        <span key="t" className="mono">
          {c.version_to}
        </span>,
      ])}
    />
  );
}

// ---- the page ------------------------------------------------------------------------------------
function MethodologyView({ live, corrections }: { live: LiveNumbers; corrections: Correction[] }) {
  const M = METHODOLOGY;
  const letters = glossaryLetters(GLOSSARY_SORTED);
  return (
    <>
      <nav aria-label="Sections" className="section-nav">
        {METHOD_SECTIONS.map((s) => (
          <a key={s.id} className="nav-link" href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>

      <Grid2>
        <Section id="headline" wide>
          <p style={{ maxWidth: "76ch" }}>{M.headline}</p>
        </Section>

        <Section id="rules" wide>
          <Table
            columns={["#", "stage", "rule", "why"]}
            widths={["4%", "9%", "52%"]}
            rows={M.rules.map((r) => [
              <span key={r.id} style={S.id}>
                {r.id}
              </span>,
              r.group,
              r.rule,
              r.rationale,
            ])}
          />
        </Section>

        <Section id="lexicon">
          <Table
            columns={["bin", "p", "label", "phrases"]}
            widths={["8%", "10%", "16%"]}
            rows={M.lexicon.rows.map((b) => [
              <span key={b.bin} style={S.id}>
                {b.bin}
              </span>,
              <span key={`${b.bin}-p`} className="mono">
                {fmt2(b.p)}
              </span>,
              b.label,
              b.phrases.join(", "),
            ])}
          />
          <p>{M.lexicon.note}</p>
          <p>
            Alternative maps used by the <Term t="sensitivity panel" />:{" "}
            {M.lexicon.maps.map((m) => `${m.id} (A ${fmt2(m.values.A)}, B ${fmt2(m.values.B)}, C ${fmt2(m.values.C)}, D ${fmt2(m.values.D)}, E ${fmt2(m.values.E)})`).join("; ")}.
          </p>
          <ol>
            {M.lexicon.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Section>

        <Section id="anchors">
          <Table
            columns={["the person wrote", "deadline", "origin", "note"]}
            widths={["34%", "30%", "12%"]}
            rows={M.anchors.rows.map((a) => [a.pattern, a.deadline, a.origin, [a.tag ? `tag ${a.tag}` : null, a.note].filter(Boolean).join("; ") || NA])}
          />
          <p>{M.anchors.note}</p>
        </Section>

        <Section id="quantities">
          <Table
            columns={["#", "rule"]}
            widths={["8%"]}
            rows={M.quantities.rules.map((q) => [
              <span key={q.id} style={S.id}>
                {q.id}
              </span>,
              q.rule,
            ])}
          />
          <p>
            <Term t="template">Template</Term> criterion: {M.quantities.criterion}
          </p>
        </Section>

        <Section id="exclusions">
          <Table
            columns={[
              <Term key="code" t="reason code" plain>
                code
              </Term>,
              "label",
              "test",
            ]}
            widths={["18%", "22%"]}
            rowIds={M.exclusions.notAdmitted.map((r) => `rc-${r.code}`)}
            rows={M.exclusions.notAdmitted.map((r) => [
              <span key={r.code} style={S.id}>
                {r.code}
              </span>,
              r.label,
              r.test,
            ])}
          />
          <h3>
            <Term t="void">Void</Term> after intake
          </h3>
          <Table
            columns={["code", "label", "test"]}
            widths={["18%", "22%"]}
            rowIds={M.exclusions.voidCodes.map((r) => `rc-${r.code}`)}
            rows={M.exclusions.voidCodes.map((r) => [
              <span key={r.code} style={S.id}>
                {r.code}
              </span>,
              r.label,
              r.test,
            ])}
          />
          <h3>Tags (scored, but flagged)</h3>
          <Table
            columns={["tag", "test"]}
            widths={["18%"]}
            rows={M.exclusions.tags.map((t) => [
              <span key={t.tag} style={S.id}>
                {t.tag}
              </span>,
              t.test,
            ])}
          />
        </Section>

        <Section id="templates" wide>
          <p>{M.templates.note}</p>
          <Table
            columns={["template", "proposition", "criterion", "source"]}
            widths={["13%", "22%", "45%"]}
            rows={M.templates.rows.map((t) => [
              <span key={t.template} style={S.id}>
                {t.template}
              </span>,
              t.proposition,
              t.criterion,
              t.source,
            ])}
          />
        </Section>

        <Section id="references" wide>
          <Table
            columns={[
              <Term key="row" t="reference row" plain>
                row
              </Term>,
              "how",
              "min n",
            ]}
            widths={["12%", "76%"]}
            rows={M.references.rows.map((r) => [
              <span key={r.id} style={S.id}>
                {r.label}
              </span>,
              r.how,
              <span key={`${r.id}-n`} className="mono">
                {intOrNull(r.min_n)}
              </span>,
            ])}
          />
          <h3>
            The <Term t="halving rule" />
          </h3>
          <p style={{ maxWidth: "80ch" }}>{M.references.halving}</p>
          <h3>
            <Term t="base rate">Base-rate</Term> classes
          </h3>
          <Table
            columns={["class", "p", "median months", "source"]}
            widths={["30%", "8%", "12%"]}
            rows={M.references.classes.map((c) => [
              <span key={c.cls}>
                {c.label} ({c.cls})
              </span>,
              <span key={`${c.cls}-p`} className="mono">
                {fmtOrNull(c.p, fmt3)}
              </span>,
              <span key={`${c.cls}-m`} className="mono">
                {intOrNull(c.median_months)}
              </span>,
              c.source_url ? (
                <a key={`${c.cls}-s`} href={c.source_url} rel="noopener noreferrer">
                  {c.source}
                </a>
              ) : (
                c.source
              ),
            ])}
          />
        </Section>

        <Section id="metrics" wide>
          <Table
            columns={["#", "metric", "formula", "min n", "unit", "note"]}
            widths={["4%", "12%", "44%", "10%", "14%"]}
            rows={M.metrics.map((m) => [
              <span key={m.id} style={S.id}>
                {m.id}
              </span>,
              <span key={`${m.id}-n`} style={{ fontWeight: 700 }}>
                {m.name}
              </span>,
              m.formula,
              <span key={`${m.id}-min`}>
                <span className="mono">{intOrNull(m.min_n)}</span> · {m.min_n_source}
              </span>,
              m.unit,
              m.note,
            ])}
          />
          <p>
            Ranking rule: a helper canRank(a, b) returns true only when both rows are T1 or better, both persons share a <Term t="coverage tier" />, and the two{" "}
            <Term t="bootstrap interval">intervals</Term> do not overlap. The leaderboard shows rank only when canRank is true.
          </p>
        </Section>

        <Section id="evidence-tiers">
          <Table
            columns={[
              <Term key="tier" t="evidence tier" plain>
                tier
              </Term>,
              "label",
              "range",
              "shown",
            ]}
            widths={["8%", "16%", "26%"]}
            rows={M.evidenceTiers.map((t) => [
              <span key={t.tier} style={S.id}>
                {t.tier}
              </span>,
              t.label,
              t.range,
              t.shown,
            ])}
          />
        </Section>

        <Section id="coverage-tiers">
          <Table
            columns={[
              <Term key="tier" t="coverage tier" plain>
                tier
              </Term>,
              "label",
              "definition",
            ]}
            widths={["8%", "20%"]}
            rows={M.coverageTiers.map((t) => [
              <span key={t.tier} style={S.id}>
                {t.tier}
              </span>,
              t.label,
              t.definition,
            ])}
          />
          <p>{M.coverageRankNote}</p>
        </Section>

        <Section id="hindsight" wide>
          <Table
            columns={["#", "control", "where"]}
            widths={["5%", "70%"]}
            rows={M.hindsight.map((h) => [
              <span key={h.id} style={S.id}>
                {h.id}
              </span>,
              h.control,
              h.where,
            ])}
          />
          <KappaBlock kappa={live.kappa} prefilter={live.prefilter} />
        </Section>

        <Section id="sensitivity" wide>
          <Table
            columns={["variant", "label", "what changes"]}
            widths={["14%", "16%"]}
            rows={M.sensitivity.variants.map((s) => [
              <span key={s.id} style={S.id}>
                {s.id}
              </span>,
              s.label,
              s.how,
            ])}
          />
          <p>{M.sensitivity.note}</p>
          <SensitivityLiveBlock live={live.sensitivity} />
        </Section>

        <Section id="reading-a-row" wide>
          {M.examples.map((ex) => (
            <div key={ex.id}>
              <h3>{ex.title}</h3>
              <p>
                {ex.person} · {ex.statement_date}
              </p>
              <blockquote style={S.quote}>{ex.quote}</blockquote>
              <p>{ex.source}</p>
              <ol>
                {ex.steps.map((s) => (
                  <li key={s.step}>
                    <strong>{s.step}.</strong> {s.detail}
                  </li>
                ))}
              </ol>
              <Table
                columns={[...ex.table.columns]}
                rows={ex.table.rows.map((r) =>
                  r.map((c, i) =>
                    i > 0 && /^[\d.]+$/.test(c) ? (
                      <span key={i} className="mono">
                        {c}
                      </span>
                    ) : (
                      c
                    ),
                  ),
                )}
              />
              <p style={S.result}>{ex.result}</p>
            </div>
          ))}
        </Section>

        <Section id="limits">
          <Table
            columns={["#", "limit", "effect"]}
            widths={["8%", "30%"]}
            rows={M.limits.map((l) => [
              <span key={l.id} style={S.id}>
                {l.id}
              </span>,
              l.limit,
              l.effect,
            ])}
          />
        </Section>

        <Section id="corrections" wide>
          <CorrectionsTable rows={corrections} />
        </Section>

        <Section id="versions" wide>
          <Table
            columns={[
              "version",
              "date",
              <Term key="as-of" t="as-of date" plain>
                as of
              </Term>,
              "note",
            ]}
            widths={["10%", "12%", "12%"]}
            rows={M.versions.map((r) => [
              <span key={r.version} style={S.id}>
                {r.version}
              </span>,
              <span key={`${r.version}-d`} className="mono">
                {fmtDate(r.date)}
              </span>,
              <span key={`${r.version}-a`} className="mono">
                {fmtDate(r.as_of)}
              </span>,
              r.note,
            ])}
          />
        </Section>

        <Section id="glossary" wide>
          <nav aria-label="Glossary letters" className="letter-index">
            {letters.map((l) => (
              <a key={l.letter} className="nav-link" href={`#g-${l.slug}`}>
                {l.letter}
              </a>
            ))}
          </nav>
          <Table
            columns={["term", "definition", "see"]}
            widths={["16%", "66%"]}
            rowIds={GLOSSARY_SORTED.map((g) => `g-${g.slug}`)}
            rows={GLOSSARY_SORTED.map((g) => [
              <a key={g.slug} href={`#g-${g.slug}`} style={S.id}>
                {g.term}
              </a>,
              g.definition,
              <span key={`${g.slug}-see`}>
                {(g.see ?? []).map((s, i) => (
                  <span key={s}>
                    {i > 0 ? ", " : null}
                    <Term t={s} plain />
                  </span>
                ))}
              </span>,
            ])}
          />
        </Section>
      </Grid2>
    </>
  );
}

export default function MethodologyPage() {
  const snap = getScores();
  const ds = getDataset();
  const a = snap.agreement;
  const prefilterPath = path.join(process.cwd(), "data", "intake", "prefilter-audit.json");
  const prefilter: LiveNumbers["prefilter"] = fs.existsSync(prefilterPath) ? (JSON.parse(fs.readFileSync(prefilterPath, "utf8")) as LiveNumbers["prefilter"]) : NOT_YET_PUBLISHED;
  const live: LiveNumbers =
    a.admission.n + a.event.n === 0
      ? { ...DEFAULT_LIVE, prefilter }
      : {
          prefilter,
          kappa: {
            n_pairs: a.admission.n,
            admit: a.admission.kappa,
            event: a.event.kappa,
            deadline: a.deadline.kappa,
            bin: a.bin.weighted_kappa,
            asserts: null,
            note: kappaNote({ event_n: a.event.n, bin_n: a.bin.n, recheck_n: a.recheck.n, upheld: a.recheck.upheld }),
          },
          sensitivity: ds.forecasters.map((f) => {
            const s = snap.forecasters[f.slug];
            const pick = (k: string) => s.sensitivity[k] ?? { brier: null, n_clusters: 0 };
            return {
              forecaster: f.slug,
              label: f.short,
              headline: s.headline.brier ? s.headline.brier.point : null,
              n_clusters: s.headline.n_clusters,
              rows: [
                { id: "ends_085_015" as const, value: pick("map_ends85").brier, n_clusters: pick("map_ends85").n_clusters },
                { id: "kent" as const, value: pick("map_kent").brier, n_clusters: pick("map_kent").n_clusters },
                { id: "flat_075" as const, value: pick("map_flat75").brier, n_clusters: pick("map_flat75").n_clusters },
                { id: "non_affiliated" as const, value: pick("non_affiliated").brier, n_clusters: pick("non_affiliated").n_clusters },
                { id: "prospective_only" as const, value: pick("prospective_only").brier, n_clusters: pick("prospective_only").n_clusters },
                { id: "dated_only" as const, value: pick("dated_only").brier, n_clusters: pick("dated_only").n_clusters },
                { id: "undated_36" as const, value: pick("undated_36").brier, n_clusters: pick("undated_36").n_clusters },
                { id: "loo_max_change" as const, value: s.headline.loo_max_change, n_clusters: s.headline.n_clusters },
              ],
            };
          }),
        };
  const hero = ds.forecasters.find((f) => f.hero) ?? ds.forecasters[0];
  return (
    <Shell current="/methodology" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="Method" version={ds.version} lede={METHOD_LEDE} />
      <MethodologyView live={live} corrections={ds.corrections} />
    </Shell>
  );
}
