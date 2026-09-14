// Forecaster page: the scoreboard, the record by area and by time, the claims, and what is waiting for data.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdmissionCards } from "@/components/blocks/AdmissionCards";
import { WaitingCard } from "@/components/blocks/WaitingCard";
import { Card } from "@/components/card/Card";
import { HowToRead } from "@/components/card/HowToRead";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { BrierHairline } from "@/components/charts/BrierHairline";
import { CalibrationPlumb } from "@/components/charts/CalibrationPlumb";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { RecedingHorizon } from "@/components/charts/RecedingHorizon";
import { TimingRungHistogram } from "@/components/charts/TimingRungHistogram";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { HOLLOW_BELOW } from "@/components/charts/layout/BrierHairline.layout";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Scoreboard } from "@/components/scoreboard/Scoreboard";
import { SourceLink } from "@/components/ui/SourceLink";
import { Term } from "@/components/ui/Term";
import { lockState } from "@/lib/content/display";
import { getDataset } from "@/lib/data/cached";
import { COIN_FLIP, almanacData, areaRungBars, brierSeriesData, calibrationData, forecasterView, recedingHorizon, registryById, sensitivityRows, timingHistogram, trendLanesData } from "@/lib/data/derive";
import { FORECASTER_SLUGS } from "@/lib/data/schema";
import { getScores } from "@/lib/data/scores";
import { areasTakeaway, calibrationTakeaway, claimsTakeaway, coveragePhrase, f2, horizonTakeaway, lanesTakeaway, metricNeed, overTimeTakeaway, plural, roleParts, sensitivityTakeaway, timingTakeaway } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() {
  return FORECASTER_SLUGS.map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getDataset().forecasters.find((x) => x.slug === slug);
  return { title: f ? f.name : "Forecaster" };
}

const MAX_LANES = 30;
/** Sensitivity rows in the order of the spec: the headline first, then each alternative rule. */
const SENSITIVITY_ORDER = ["baseline", "dated_only", "map_ends85", "map_flat75", "map_kent", "non_affiliated", "prospective_only", "undated_36"];
const sensitivityRank = (id: string) => {
  const i = SENSITIVITY_ORDER.indexOf(id);
  return i === -1 ? SENSITIVITY_ORDER.length : i;
};

export default async function ForecasterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ds = getDataset();
  const snap = getScores();
  const v = forecasterView(ds, snap, slug);
  if (!v) notFound();
  const { forecaster: f, scores: s } = v;
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const th = ds.thresholds;
  const minN = th.min_clusters_headline;
  const ctx = { f: s, snap };
  const reg = registryById(ds);
  const horizonClusters = v.clusters.filter((c) => c.deadlines >= 2);
  const overTime = lockState("over_time", ctx);
  const calibration = lockState("calibration", ctx);
  const timing = lockState("timing", ctx);
  const sensitivity = lockState("sensitivity", ctx);
  const claims = almanacData(ds, v.items);
  const lanes = trendLanesData(ds, v.items, { maxLanes: MAX_LANES });
  const sens = [...sensitivityRows(ds, s)].sort((a, b) => sensitivityRank(a.id) - sensitivityRank(b.id));

  return (
    <Shell current={`/forecasters/${slug}`} hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title={f.name} version={ds.version} meta={[f.archetype, ...roleParts(f.role), <Term key="cov" t="coverage tier">{coveragePhrase(f.coverage.tier)}</Term>, plural(v.statements.length, "statement")]} />
      <HowToRead summary="About this person" className="about-person">
        <p>{f.bio}</p>
        <p>
          {f.channels.map((c, i) => (
            <span key={c.url}>
              {i ? " · " : ""}
              <SourceLink href={c.url}>{c.label}</SourceLink>
            </span>
          ))}
        </p>
      </HowToRead>

      <Grid2>
        <Scoreboard f={f} s={s} status={snap.status[f.slug]} minN={minN} thresholds={th} />

        {overTime.shown ? (
          <Card
            wide
            title="Brier over time"
            takeaway={overTimeTakeaway(s)}
            legend={[
              { glyph: "solid", label: "quarter" },
              { glyph: "hollow", label: `fewer than ${fmtInt(HOLLOW_BELOW)} events` },
              { glyph: "dash", label: `coin flip ${f2(COIN_FLIP)}` },
            ]}
            src="Headline panel · by deadline quarter"
          >
            <Reveal>
              <ChartFrame wide={<BrierHairline data={brierSeriesData(s, f.slug, f.short)} size="wide" />} half={<BrierHairline data={brierSeriesData(s, f.slug, f.short)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        <Card
          title="Areas"
          takeaway={areasTakeaway(s.by_area, ds.areas)}
          legend={[
            { glyph: "tick", label: "one resolved event" },
            { glyph: "text", label: `Brier per area (null under ${fmtInt(th.timing_min)})` },
          ]}
          src="Resolved events by area"
        >
          <Reveal>
            <AreaRungBars data={areaRungBars(ds, s, v.items)} size="half" />
          </Reveal>
        </Card>

        <AdmissionCards ds={ds} snap={snap} slug={f.slug} scope={f.short} />

        {sensitivity.shown ? (
          <Card className="card--short" title="Sensitivity" takeaway={sensitivityTakeaway(s)} n={plural(s.headline.n_clusters, "event")} src="Sensitivity panel · same events">
            <div className="prose">
              <table>
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>
                      <Term t="Brier score" side="end">
                        Brier
                      </Term>
                    </th>
                    <th>N</th>
                  </tr>
                </thead>
                <tbody>
                  {sens.map((r) => (
                    <tr key={r.id} title={r.note}>
                      <td>{r.name}</td>
                      <td className="mono">{r.brier === null ? `— ${metricNeed(minN, r.n, "events")}` : f2(r.brier)}</td>
                      <td className="mono">{fmtInt(r.n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {calibration.shown ? (
          <Card
            title="Calibration"
            takeaway={calibrationTakeaway(f.short, s)}
            legend={[
              { glyph: "solid", label: "bin, area = events" },
              { glyph: "dash", label: "perfect calibration" },
              { glyph: "text", label: "x = stated confidence" },
            ]}
            src={`Headline panel · ${plural(s.calibration.n_clusters, "event")}`}
          >
            <Reveal>
              <CalibrationPlumb data={calibrationData(ds, s, f.short)} size="half" />
            </Reveal>
          </Card>
        ) : null}

        {timing.shown ? (
          <Card
            title="Timing"
            takeaway={timingTakeaway(s)}
            legend={[
              { glyph: "tick", label: "one claim" },
              { glyph: "dash", label: "median" },
            ]}
            src="False claims that later came true"
          >
            <Reveal>
              <TimingRungHistogram data={timingHistogram(s)} size="half" />
            </Reveal>
          </Card>
        ) : null}

        {v.items.length ? (
          <Card
            wide
            title="Claims"
            takeaway={claimsTakeaway(v.items)}
            legend={[
              { glyph: "solid", label: "true" },
              { glyph: "hollow", label: "false" },
              { glyph: "dash", label: "pending" },
              { glyph: "void", label: "void" },
            ]}
            src="All admitted items"
          >
            <Reveal>
              <ChartFrame wide={<LedgerAlmanac data={claims} size="wide" />} half={<LedgerAlmanac data={claims} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        {v.items.length ? (
          <Card
            wide
            title="Claims and events"
            takeaway={lanesTakeaway(lanes.lanes, lanes.events)}
            legend={[
              { glyph: "solid", label: "said" },
              { glyph: "hollow", label: "due" },
              { glyph: "tick", label: "event" },
            ]}
            src="Headline panel · all areas"
          >
            <Reveal>
              <ChartFrame wide={<TrendLanes data={lanes} size="wide" />} half={<TrendLanes data={lanes} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        {horizonClusters.map((c) => {
          const title = reg.get(c.event_id)?.title ?? c.event_id;
          const data = recedingHorizon(ds, c.items, title);
          return data ? (
            <Card
              key={c.id}
              wide
              title="Receding horizon"
              takeaway={horizonTakeaway(f.short, title, c.deadlines, data.actualDate ?? null)}
              legend={[
                { glyph: "solid", label: "promised date" },
                { glyph: "accent", label: "happened" },
              ]}
              src={`Cluster ${c.event_id}`}
            >
              <Reveal>
                <ChartFrame wide={<RecedingHorizon data={data} size="wide" />} half={<RecedingHorizon data={data} size="half" />} />
              </Reveal>
            </Card>
          ) : null;
        })}

        <WaitingCard keys={["calibration", "timing", "sensitivity", "over_time"]} ctx={ctx} />
      </Grid2>
    </Shell>
  );
}
