// Area page: the leaderboard inside the area, the status of its claims, and the claims against the area's events.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaderboardCard } from "@/components/blocks/LeaderboardCard";
import { Card } from "@/components/card/Card";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { TickDonut } from "@/components/charts/TickDonut";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Term } from "@/components/ui/Term";
import { getDataset } from "@/lib/data/cached";
import { almanacData, areaOf, areaStatusCounts, leaderboardData, statusDonut, trendLanesData } from "@/lib/data/derive";
import { AREA_SLUGS } from "@/lib/data/schema";
import { getScores } from "@/lib/data/scores";
import { lanesTakeaway, plural, statusTakeaway } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() {
  return AREA_SLUGS.map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: areaOf(getDataset(), slug)?.name ?? "Area" };
}

const MAX_LANES = 30;

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ds = getDataset();
  const snap = getScores();
  const area = areaOf(ds, slug);
  if (!area) notFound();
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const th = ds.thresholds;
  const minN = th.calibration_min_per_bin;
  const items = snap.items.filter((i) => i.area === slug);
  const counts = areaStatusCounts(snap, slug);
  const resolved = counts.true + counts.false;
  const events = ds.timeline.filter((t) => t.area === slug);
  const lanes = trendLanesData(ds, items, { areas: [slug], maxLanes: MAX_LANES });
  const meta = [
    <span key="adm">
      {fmtInt(items.length)} <Term t="admitted">admitted</Term> claims
    </span>,
    <span key="res">
      {fmtInt(resolved)} <Term t="resolved">resolved</Term>
    </span>,
    <Link key="gt" href={`/events?a=${slug}`}>
      {plural(events.length, "ground-truth event")}
    </Link>,
    <Link key="br" href="/methodology#references">
      <Term t="base rate">Base rates</Term>
    </Link>,
  ];

  return (
    <Shell current={`/areas/${slug}`} hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title={area.name} version={ds.version} meta={meta} lede={area.definition} />
      <Grid2>
        <LeaderboardCard data={leaderboardData(ds, snap, { area: slug })} minN={minN} thresholds={th} src={`${area.name} · ${plural(resolved, "event")}`} hasTierC={ds.forecasters.some((f) => f.coverage.tier === "C")} />

        <Card title="Status" takeaway={statusTakeaway(counts)} src={`${area.name} · ${plural(items.length, "item")}`}>
          <Reveal>
            <TickDonut data={statusDonut(counts)} size="half" />
          </Reveal>
        </Card>

        {items.length ? (
          <Card
            wide
            title="Claims and events"
            takeaway={lanesTakeaway(lanes.lanes, lanes.events)}
            legend={[
              { glyph: "solid", label: "said" },
              { glyph: "hollow", label: "due" },
              { glyph: "tick", label: "event" },
            ]}
            src={`Headline panel · ${area.name}`}
          >
            <Reveal>
              <ChartFrame wide={<TrendLanes data={lanes} size="wide" />} half={<TrendLanes data={lanes} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        {items.length ? (
          <Card
            wide
            title="Claims"
            legend={[
              { glyph: "solid", label: "true" },
              { glyph: "hollow", label: "false" },
              { glyph: "dash", label: "pending" },
              { glyph: "void", label: "void" },
            ]}
            src={`${area.name} · all admitted items`}
          >
            <Reveal>
              <ChartFrame wide={<LedgerAlmanac data={almanacData(ds, items)} size="wide" />} half={<LedgerAlmanac data={almanacData(ds, items)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}
      </Grid2>
    </Shell>
  );
}
