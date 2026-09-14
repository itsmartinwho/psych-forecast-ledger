import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { BrierHairline } from "@/components/charts/BrierHairline";
import { CalibrationPlumb } from "@/components/charts/CalibrationPlumb";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { RecedingHorizon } from "@/components/charts/RecedingHorizon";
import { TimingRungHistogram } from "@/components/charts/TimingRungHistogram";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { SourceLink } from "@/components/ui/SourceLink";
import { Stat } from "@/components/ui/Stat";
import { FORECASTER_SLUGS } from "@/lib/data/schema";
import { getDataset } from "@/lib/data/cached";
import { almanacData, areaRungBars, brierSeriesData, calibrationData, forecasterView, recedingHorizon, registryById, timingHistogram, trendLanesData } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { calibrationTitle, ciText, f2, headlineSentence, pct, plural, skillSentence } from "@/lib/data/text";
import { yearOf } from "@/lib/dates";

export const dynamicParams = false;
export function generateStaticParams() {
  return FORECASTER_SLUGS.map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getDataset().forecasters.find((x) => x.slug === slug);
  return { title: f ? f.name : "Forecaster" };
}

export default async function ForecasterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ds = getDataset();
  const snap = getScores();
  const v = forecasterView(ds, snap, slug);
  if (!v) notFound();
  const { forecaster: f, scores: s } = v;
  const h = s.headline;
  const reg = registryById(ds);
  const years = [...new Set(v.items.map((i) => yearOf(i.first_date)))].sort();
  const horizonClusters = v.clusters.filter((c) => c.deadlines >= 2).slice(0, 6);
  const reasonRows = Object.entries(v.notAdmitted).sort((a, b) => b[1].length - a[1].length);

  return (
    <Shell current={`/forecasters/${slug}`} dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 24 }}>
        <div className="eyebrow">{f.archetype} · coverage tier <span className="chip chip--hollow">{f.coverage.tier}</span> · {f.role}</div>
        <h1 className="h2 big" style={{ marginTop: 8, maxWidth: "40ch" }}>{headlineSentence(f.short, h)}</h1>
        <p className="sub" style={{ maxWidth: "70ch" }}>{f.bio}</p>
        <p className="src">{f.channels.map((c, i) => <span key={c.url}>{i ? " · " : ""}<SourceLink href={c.url}>{c.label}</SourceLink></span>)}</p>
      </header>

      <div className="grid3" style={{ marginBottom: 26 }}>
        <Stat value={h.brier ? f2(h.brier.point) : `${h.n_true} of ${h.n_true + h.n_false}`} unit={h.brier ? `95% ${f2(h.brier.lo)} to ${f2(h.brier.hi)} · ${h.label}` : "right · counts only"} label={h.brier ? "Brier, dated claims" : "resolved dated claims"} />
        <Stat value={h.hit.rate ? pct(h.hit.rate.point) : "–"} unit={h.hit.rate ? `${h.hit.hits} of ${h.hit.n} events on the right side` : "needs 10 events"} label="hit rate" />
        <Stat value={h.skill_base.value ? `${h.skill_base.value.point > 0 ? "+" : ""}${pct(h.skill_base.value.point)}` : "–"} unit={`${plural(h.skill_base.n_clusters, "paired event")}`} label="skill against base rates" />
        <Stat value={String(h.n_clusters)} unit={`events · ${h.n_pending + h.n_known_true} pending · ${h.n_void} void`} label="resolved events" small />
        <Stat value={pct(s.composition.scoreable_share?.point)} unit={`${s.composition.dated} dated of ${s.composition.sincere} sincere claims`} label="scoreable share" small />
        <Stat value={s.undated.brier ? f2(s.undated.brier.point) : `${s.undated.n_true} of ${s.undated.n_true + s.undated.n_false}`} unit={`undated panel · ${ds.thresholds.undated_window_months}-month window · ${s.undated.n_clusters} events`} label="undated claims" small />
      </div>

      <Grid2>
        <Card wide title={s.over_time.length ? `${f.short}'s cumulative Brier as claims came due.` : `No dated claim by ${f.short} has come due yet.`} sub="cumulative cluster-mean Brier by deadline quarter · lower is better · dashed = 0.25" src={`Brier over time · ${f.name}`}>
          <Reveal><ChartFrame wide={<BrierHairline data={brierSeriesData(s, f.slug, f.short)} size="wide" />} half={<BrierHairline data={brierSeriesData(s, f.slug, f.short)} size="half" />} /></Reveal>
        </Card>
        <Card title={calibrationTitle(f.short, s)} sub="x = stated confidence · y = share true · dashed = perfect" src={`Calibration · ${f.name}`}>
          <Reveal><CalibrationPlumb data={calibrationData(ds, s, f.short)} size="half" /></Reveal>
        </Card>
        <Card title="Where the resolved claims sit, by area." sub="one rung = one resolved dated item · value = Brier in the area" src={`Areas · ${f.name}`}>
          <Reveal><AreaRungBars data={areaRungBars(ds, s, v.items)} size="half" /></Reveal>
        </Card>
        <Card title={s.timing.n ? `When ${f.short} was wrong on timing, the median miss was ${f2(s.timing.median)} months.` : "No false claim has later come true yet."} sub="false items whose event later happened · months after the deadline" src={`Timing error · ${f.name}`}>
          <Reveal><TimingRungHistogram data={timingHistogram(s)} size="half" /></Reveal>
        </Card>
        <Card title={skillSentence(f.short, h)} sub="paired on events with a published base rate · positive = beat the base rate" src="Base-rate skill">
          <div className="prose">
            <table>
              <tbody>
                <tr><td>Brier, own</td><td className="mono">{f2(h.skill_base.own_brier)}</td></tr>
                <tr><td>Brier, base rate on the same events</td><td className="mono">{f2(h.skill_base.ref_brier)}</td></tr>
                <tr><td>skill (95% interval)</td><td className="mono">{h.skill_base.value ? ciText(h.skill_base.value) : "–"}</td></tr>
                <tr><td>market skill (indicative)</td><td className="mono">{h.skill_market.value ? ciText(h.skill_market.value) : `– (${plural(h.skill_market.n_clusters, "paired event")})`}</td></tr>
                <tr><td>leave-one-event-out max change</td><td className="mono">{f2(h.loo_max_change)}</td></tr>
                <tr><td>affiliated share</td><td className="mono">{pct(s.composition.affiliated_share)}</td></tr>
                <tr><td>headline without affiliated items</td><td className="mono">{s.headline_non_affiliated?.brier ? ciText(s.headline_non_affiliated.brier) : "–"}</td></tr>
              </tbody>
            </table>
          </div>
        </Card>

        {horizonClusters.map((c) => {
          const data = recedingHorizon(ds, c.items, reg.get(c.event_id)?.title ?? c.event_id);
          return data ? (
            <Card key={c.id} wide title={`${reg.get(c.event_id)?.title ?? c.event_id}: promised ${plural(c.deadlines, "time")}.`} sub="x = date said · y = date promised · accent rule = when it happened" src="Receding horizon · repeated forecasts of one event">
              <Reveal><ChartFrame wide={<RecedingHorizon data={data} size="wide" />} half={<RecedingHorizon data={data} size="half" />} /></Reveal>
            </Card>
          ) : null;
        })}

        {v.items.length ? (
          <Card wide title={`${plural(v.items.length, "claim")} against the events of the field.`} sub="one lane per claim · solid dot = said · hollow = deadline · ticks above = ground-truth events" src="Trend lanes · headline items">
            <Reveal><ChartFrame wide={<TrendLanes data={trendLanesData(ds, v.items, { maxLanes: 30 })} size="wide" />} half={<TrendLanes data={trendLanesData(ds, v.items, { maxLanes: 30 })} size="half" />} /></Reveal>
          </Card>
        ) : null}

        {years.map((y) => {
          const rows = v.items.filter((i) => yearOf(i.first_date) === y);
          const data = almanacData(ds, rows, { start: `${y}-01-01` });
          return (
            <Card key={y} wide title={`${y}: ${plural(rows.length, "claim")}.`} sub="hairline = statement to deadline · solid = true · hollow = false · dashed = pending · tiny = void" src={`Almanac · ${f.name} · ${y}`}>
              <Reveal><ChartFrame wide={<LedgerAlmanac data={data} size="wide" />} half={<LedgerAlmanac data={data} size="half" />} /></Reveal>
            </Card>
          );
        })}

        <Card title={`${plural(s.composition.not_admitted, "statement")} not admitted, by reason.`} sub="the census keeps every forward-looking statement · reason codes from the rules" src="Admission funnel">
          <div className="prose">
            <table>
              <thead><tr><th>reason</th><th>n</th></tr></thead>
              <tbody>{reasonRows.map(([code, rows]) => <tr key={code}><td>{code}</td><td className="mono">{rows.length}</td></tr>)}
                <tr><td>void (coders disagreed or condition unmet)</td><td className="mono">{v.voids.length}</td></tr>
                <tr><td>admitted</td><td className="mono">{s.composition.admitted}</td></tr>
              </tbody>
            </table>
            <p><Link href={`/predictions?f=${f.slug}`} className="eyebrow">Every statement by {f.short} →</Link></p>
          </div>
        </Card>

        <Card title="Sensitivity: the headline under other rules." sub="cluster-mean Brier · same events · alternative lexicons and subsets" src="Sensitivity panel">
          <div className="prose">
            <table>
              <thead><tr><th>variant</th><th>Brier</th><th>n</th></tr></thead>
              <tbody>{Object.entries(s.sensitivity).map(([k, r]) => <tr key={k}><td>{r.note}</td><td className="mono">{f2(r.brier)}</td><td className="mono">{r.n_clusters}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>

        {v.commitments.length ? (
          <Card wide title={`${plural(v.commitments.length, "commitment")} about ${f.short}'s own organizations, kept out of the score.`} sub="CONTROL: the forecaster's organization decides the outcome" src="Commitments table">
            <div className="prose"><ul>{v.commitments.slice(0, 40).map((c) => <li key={c.id}><Link href={`/predictions/${c.id}`}>{c.statement_date}</Link> · {c.quote.slice(0, 160)}{c.quote.length > 160 ? "…" : ""}</li>)}</ul></div>
          </Card>
        ) : null}
        {v.reports.length ? (
          <Card wide title={`${plural(v.reports.length, "report")} passed on as information, kept out of the score.`} sub="REPORT: sources say, or another organization's internal action within 30 days" src="Reports table">
            <div className="prose"><ul>{v.reports.slice(0, 40).map((c) => <li key={c.id}><Link href={`/predictions/${c.id}`}>{c.statement_date}</Link> · {c.quote.slice(0, 160)}{c.quote.length > 160 ? "…" : ""}</li>)}</ul></div>
          </Card>
        ) : null}
      </Grid2>
    </Shell>
  );
}
