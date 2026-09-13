import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { SourceLink } from "@/components/ui/SourceLink";
import { getDataset } from "@/lib/data/cached";
import { getScores } from "@/lib/data/scores";
import { plural } from "@/lib/data/text";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const ds = getDataset();
  const snap = getScores();
  const cov = ds.coverage;
  const read = cov.read.free + cov.read.paid + cov.read.founding;
  return (
    <Shell current="/about" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 22 }}>
        <div className="eyebrow">provenance</div>
        <h1 className="h2 big" style={{ marginTop: 8 }}>{read} of {cov.archive_count} posts read; every number on this site traces to a quote, a rule and a source.</h1>
      </header>
      <Grid2>
        <Card title="Corpus and coverage." sub="the census reads the whole archive before any score appears" src={`Coverage · generated ${cov.generated_at.slice(0, 10)}`}>
          <div className="prose">
            <table><tbody>
              <tr><td>archive posts (restacks of other authors excluded)</td><td className="mono">{cov.archive_count}</td></tr>
              <tr><td>free posts read through the public API</td><td className="mono">{cov.read.free}</td></tr>
              <tr><td>paid posts read in the subscriber session</td><td className="mono">{cov.read.paid + cov.read.founding}</td></tr>
              <tr><td>posts not readable (founding-tier only)</td><td className="mono">{cov.missing.length + cov.stubs.length}</td></tr>
              <tr><td>words read</td><td className="mono">{cov.words_total.toLocaleString("en-US")}</td></tr>
              <tr><td>statements in the census</td><td className="mono">{ds.statements.length}</td></tr>
              <tr><td>admitted items</td><td className="mono">{ds.items.length}</td></tr>
              <tr><td>registry events</td><td className="mono">{ds.registry.length}</td></tr>
              <tr><td>ground-truth events</td><td className="mono">{ds.timeline.length}</td></tr>
            </tbody></table>
            <p>Paid posts were read inside the maintainer&rsquo;s own logged-in browser session; the site shows quotes of at most 600 characters with a link to the source. Posts sold under a higher &ldquo;Discoverable Access&rdquo; tier were not readable with the subscription used and are listed as missing.</p>
          </div>
        </Card>
        <Card title="How the census was built." sub="finder, two coders, resolver, adversarial recheck" src="Pipeline · prompts v1.0.0">
          <div className="prose">
            <ol>
              <li>A finder pass reads every post and logs every forward-looking statement with a verbatim quote; a script verifies each quote against the cached text.</li>
              <li>Two independent coders map each statement to a registry event and a deadline through the anchor table and set the probability bin; a mismatch on event or deadline voids the item.</li>
              <li>The intake file is frozen with a hash before any outcome is looked up.</li>
              <li>A resolver who never sees the probabilities resolves each registry event from primary sources; a rechecker argues the opposite verdict.</li>
              <li>Scores are computed at build time from the JSON data; the committed snapshot is drift-checked.</li>
            </ol>
            <p>All coders in release {ds.version.version} are independent automated passes with separate prompts; a human review of a random 20 percent sample is the next step. Coder agreement: admission κ {snap.agreement.admission.kappa?.toFixed(2) ?? "–"} (n {snap.agreement.admission.n}), event κ {snap.agreement.event.kappa?.toFixed(2) ?? "–"}, deadline κ {snap.agreement.deadline.kappa?.toFixed(2) ?? "–"}, bin weighted κ {snap.agreement.bin.weighted_kappa?.toFixed(2) ?? "–"}.</p>
          </div>
        </Card>
        {ds.forecasters.map((f) => (
          <Card key={f.slug} title={`${f.name}: coverage tier ${f.coverage.tier}.`} sub={`${f.coverage.period.from} to ${f.coverage.period.to}`} src={`Corpus · ${f.name}`}>
            <div className="prose">
              <p>{f.coverage.corpus}</p>
              <ul>{f.coverage.sources.map((s) => <li key={s.label}>{s.url ? <SourceLink href={s.url}>{s.label}</SourceLink> : s.label}{s.note ? ` · ${s.note}` : ""}</li>)}</ul>
              {f.coverage.search_strings.length ? <p className="note">Search strings: {f.coverage.search_strings.join(" · ")}</p> : null}
              <p className="note">Affiliations used for the affiliated tag: {f.affiliations.map((a) => `${a.entity} (${a.role})`).join("; ")}.</p>
            </div>
          </Card>
        ))}
        <Card title="Corrections log." sub="dated score changes with reasons · a correction adds a version, never edits a frozen one" src="Corrections">
          <div className="prose">
            {ds.corrections.length ? <table><thead><tr><th>date</th><th>scope</th><th>change</th><th>reason</th></tr></thead><tbody>{ds.corrections.map((c) => <tr key={`${c.date}-${c.scope}`}><td className="mono">{c.date}</td><td>{c.scope}</td><td>{c.change}</td><td>{c.reason}</td></tr>)}</tbody></table> : <p>No corrections yet. Rules v{ds.version.version}, data as of {ds.version.as_of}.</p>}
          </div>
        </Card>
        <Card title="Design and code." sub="one design language, hand-written charts, static build" src="Attribution">
          <div className="prose">
            <p>The charts follow the lieflat-charts design language (paper, ink, one accent, hairlines, one mark per record), written as our own SVG components; no template code is reused. Charts are pure layout functions rendered on the server; the site is a static build from JSON data validated by schemas.</p>
            <p>Method: <Link href="/methodology">the twelve rules</Link>. {plural(ds.base_rates.classes.filter((c) => c.p !== null).length, "base-rate class")} with sources sit on each area page.</p>
          </div>
        </Card>
      </Grid2>
    </Shell>
  );
}
