// About: coverage of the corpus, the pipeline, one card per forecaster, and the design and code.
// The rules version and the as-of date live in the header stamp only; the src lines carry the source.
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { SourceLink } from "@/components/ui/SourceLink";
import { Term } from "@/components/ui/Term";
import { TAGLINE } from "@/lib/content/site";
import { getDataset } from "@/lib/data/cached";
import { getScores } from "@/lib/data/scores";
import { agreementTakeaway, f2, plural } from "@/lib/data/text";
import { yearOf } from "@/lib/dates";
import { fmtDate, fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: "About" };

/** Source line of the Pipeline card: the prompt set the coders ran with. */
const PIPELINE_SRC = "Prompts v1.0.0";

export default function AboutPage() {
  const ds = getDataset();
  const snap = getScores();
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const cov = ds.coverage;
  const read = cov.read.free + cov.read.paid + cov.read.founding;
  const a = snap.agreement;
  const kappa = (v: number | null) => (v === null ? "–" : f2(v));
  const meta = [`${fmtInt(read)} of ${fmtInt(cov.archive_count)} posts read`, plural(cov.words_total, "word"), `Generated ${fmtDate(cov.generated_at.slice(0, 10))}`];
  return (
    <Shell current="/about" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="About" version={ds.version} lede={TAGLINE} meta={meta} />
      <Grid2>
        <Card
          title="Coverage"
          how={
            <>
              Paid posts were read inside the maintainer&apos;s own logged-in browser session. The site shows quotes of at most {fmtInt(ds.thresholds.quote_max_chars)} characters with a link
              to the source. Posts sold under a higher tier were not readable with the subscription used and are listed as missing.
            </>
          }
        >
          <div className="prose">
            <table>
              <tbody>
                <tr>
                  <td>Archive posts (restacks of other authors excluded)</td>
                  <td className="mono">{fmtInt(cov.archive_count)}</td>
                </tr>
                <tr>
                  <td>Free posts read through the public API</td>
                  <td className="mono">{fmtInt(cov.read.free)}</td>
                </tr>
                <tr>
                  <td>Paid posts read in the subscriber session</td>
                  <td className="mono">{fmtInt(cov.read.paid + cov.read.founding)}</td>
                </tr>
                <tr>
                  <td>Posts not readable (founding tier only)</td>
                  <td className="mono">{fmtInt(cov.missing.length + cov.stubs.length)}</td>
                </tr>
                <tr>
                  <td>Statements in the census</td>
                  <td className="mono">{fmtInt(ds.statements.length)}</td>
                </tr>
                <tr>
                  <td>
                    <Term t="admitted">Admitted</Term> <Term t="item">items</Term>
                  </td>
                  <td className="mono">{fmtInt(ds.items.length)}</td>
                </tr>
                <tr>
                  <td>
                    <Term t="registry event">Registry events</Term>
                  </td>
                  <td className="mono">{fmtInt(ds.registry.length)}</td>
                </tr>
                <tr>
                  <td>Ground-truth events</td>
                  <td className="mono">{fmtInt(ds.timeline.length)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card
          title="Pipeline"
          takeaway={agreementTakeaway(a.admission)}
          how={
            <>
              Every coder is an independent automated pass with its own prompt; a human review of a random sample is the next step. <Term t="kappa">Kappa</Term> per field: event{" "}
              {kappa(a.event.kappa)}, deadline {kappa(a.deadline.kappa)}, bin (weighted) {kappa(a.bin.weighted_kappa)}. Rechecks: {plural(a.recheck.n, "outcome")},{" "}
              {fmtInt(a.recheck.upheld)} upheld.
            </>
          }
          src={PIPELINE_SRC}
        >
          <div className="prose">
            <ol>
              <li>A finder pass reads every post and logs every forward-looking statement with a verbatim quote; a script verifies each quote against the cached text.</li>
              <li>
                Two independent coders map each statement to a <Term t="registry event" /> and a <Term t="deadline" /> through the <Term t="anchor table" /> and set the probability{" "}
                <Term t="bin" />; a mismatch on event or deadline voids the <Term t="item" />.
              </li>
              <li>The intake file is frozen with a hash before any outcome is looked up.</li>
              <li>A resolver who never sees the probabilities resolves each registry event from primary sources; a rechecker argues the opposite verdict.</li>
              <li>Scores are computed at build time from the JSON data; the committed snapshot is drift-checked.</li>
            </ol>
          </div>
        </Card>
        {ds.forecasters.map((f) => (
          <Card
            key={f.slug}
            title={f.name}
            n={`Tier ${f.coverage.tier} · ${yearOf(f.coverage.period.from)} to ${yearOf(f.coverage.period.to)}`}
            how={
              <>
                {f.coverage.search_strings.length ? <p>Search strings: {f.coverage.search_strings.join(" · ")}</p> : null}
                {f.affiliations.length ? (
                  <p>
                    Entities behind the <Term t="affiliated" /> tag: {f.affiliations.map((x) => `${x.entity} (${x.role})`).join("; ")}.
                  </p>
                ) : null}
              </>
            }
            src="Corpus"
          >
            <div className="prose">
              <p>{f.coverage.corpus}</p>
              <ul>
                {f.coverage.sources.map((s) => (
                  <li key={s.label}>
                    {s.url ? <SourceLink href={s.url}>{s.label}</SourceLink> : s.label}
                    {s.note ? ` · ${s.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
        <Card
          title="Design and code"
          how={
            <>
              Charts are pure layout functions rendered on the server; the site is a static build from JSON data validated by schemas. The rules are on the{" "}
              <Link href="/methodology">Method page</Link>; the <Link href="/methodology#references">base-rate classes</Link> with their sources sit there too.
            </>
          }
          src="Attribution"
        >
          <div className="prose">
            <p>The charts follow the lieflat-charts design language (paper, ink, one accent, hairlines, one mark per record), written as our own SVG components; no template code is reused.</p>
          </div>
        </Card>
      </Grid2>
    </Shell>
  );
}
