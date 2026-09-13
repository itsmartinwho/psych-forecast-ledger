import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { TickDonut } from "@/components/charts/TickDonut";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { SourceLink } from "@/components/ui/SourceLink";
import { AREA_SLUGS } from "@/lib/data/schema";
import { getDataset } from "@/lib/data/cached";
import { almanacData, areaOf, leaderboardData, statusDonut, trendLanesData } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { plural } from "@/lib/data/text";

export const dynamicParams = false;
export function generateStaticParams() {
  return AREA_SLUGS.map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: areaOf(getDataset(), slug)?.name ?? "Area" };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ds = getDataset();
  const snap = getScores();
  const area = areaOf(ds, slug);
  if (!area) notFound();
  const items = snap.items.filter((i) => i.area === slug && i.panel === "headline");
  const statements = ds.items.filter((i) => i.area === slug);
  const counts = { true: items.filter((i) => i.state === "true").length, false: items.filter((i) => i.state === "false").length, pending: items.filter((i) => i.state === "pending").length, known_true: items.filter((i) => i.state === "known_true").length, void: items.filter((i) => i.state === "void").length, unresolved: items.filter((i) => i.state === "unresolved").length, not_admitted: 0, undated: snap.items.filter((i) => i.area === slug && i.panel === "undated").length };
  const classes = ds.base_rates.classes.filter((c) => c.p !== null);
  const events = ds.timeline.filter((t) => t.area === slug);
  return (
    <Shell current={`/areas/${slug}`} dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 24 }}>
        <div className="eyebrow">area</div>
        <h1 className="h2 big" style={{ marginTop: 8 }}>{area.name}: {plural(statements.length, "admitted claim")}, {counts.true + counts.false} resolved.</h1>
        <p className="sub" style={{ maxWidth: "70ch" }}>{area.definition}</p>
      </header>
      <Grid2>
        <Card wide title="Forecasters inside this area." sub="Brier on the area's resolved events · null under 5 events" src={`Leaderboard · ${area.name}`}>
          <Reveal><ChartFrame wide={<LeaderboardTickRows data={leaderboardData(ds, snap, { area: slug })} size="wide" />} half={<LeaderboardTickRows data={leaderboardData(ds, snap, { area: slug })} size="half" />} /></Reveal>
        </Card>
        <Card title={`${plural(items.length, "dated item")} in ${area.name.toLowerCase()}.`} sub="ink = true · gray = false · muted = pending · faint = void" src={`Status · ${area.name}`}>
          <Reveal><TickDonut data={statusDonut(counts, String(items.length))} size="half" /></Reveal>
        </Card>
        <Card title={`${plural(events.length, "ground-truth event")} recorded in this area.`} sub="dated, sourced events used to resolve claims" src={`Timeline · ${area.name}`}>
          <div className="prose" style={{ maxHeight: 320, overflowY: "auto" }}>
            <ul>{events.slice(0, 60).map((e) => <li key={e.id}><span className="mono">{e.date}</span> · {e.entity}: {e.event.slice(0, 120)} <SourceLink href={e.source_url}>{e.source_org}</SourceLink></li>)}</ul>
          </div>
        </Card>
        {items.length ? (
          <Card wide title="Claims against the area's events." sub="one lane per claim · ticks above = events" src={`Trend lanes · ${area.name}`}>
            <Reveal><ChartFrame wide={<TrendLanes data={trendLanesData(ds, items, { areas: [slug], maxLanes: 30 })} size="wide" />} half={<TrendLanes data={trendLanesData(ds, items, { areas: [slug], maxLanes: 30 })} size="half" />} /></Reveal>
          </Card>
        ) : null}
        {items.length ? (
          <Card wide title="Every dated claim in the area." sub="hairline = statement to deadline · solid = true · hollow = false · dashed = pending" src={`Almanac · ${area.name}`}>
            <Reveal><ChartFrame wide={<LedgerAlmanac data={almanacData(ds, items)} size="wide" />} half={<LedgerAlmanac data={almanacData(ds, items)} size="half" />} /></Reveal>
          </Card>
        ) : null}
        <Card wide title="Base rates the ledger uses as the reference row." sub="fixed at intake by event class and stage · halved when the window is shorter than the median time" src="Base-rate table v1">
          <div className="prose scroll-x">
            <table>
              <thead><tr><th>class</th><th>p</th><th>median months</th><th>source</th></tr></thead>
              <tbody>{classes.map((c) => <tr key={c.class}><td>{c.label}</td><td className="mono">{c.p?.toFixed(3)}</td><td className="mono">{c.median_months ?? "–"}</td><td>{c.source_url ? <SourceLink href={c.source_url}>{c.source.slice(0, 60)}</SourceLink> : c.source.slice(0, 60)}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      </Grid2>
    </Shell>
  );
}
