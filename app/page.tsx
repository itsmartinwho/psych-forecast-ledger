import type { Metadata } from "next";
import Link from "next/link";
import { BoldnessPlumb } from "@/components/charts/BoldnessPlumb";
import { BrierHairline } from "@/components/charts/BrierHairline";
import { CalibrationPlumb } from "@/components/charts/CalibrationPlumb";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { MatrixHeat } from "@/components/charts/MatrixHeat";
import { TickDonut } from "@/components/charts/TickDonut";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Stat } from "@/components/ui/Stat";
import { StateMark } from "@/components/ui/StateMark";
import { getDataset } from "@/lib/data/cached";
import { almanacData, boldnessData, brierSeriesData, calibrationData, chartState, leaderboardData, matrixData, registryById, statusDonut } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { calibrationTitle, f2, headlineSentence, leaderboardTitle, plural } from "@/lib/data/text";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Forecast Ledger" };

export default function Home() {
  const ds = getDataset();
  const snap = getScores();
  const hero = ds.forecasters.find((f) => f.hero) ?? ds.forecasters[0];
  const heroScores = snap.forecasters[hero.slug];
  const all = snap.status.all;
  const lb = leaderboardData(ds, snap);
  const reg = registryById(ds);
  const recent = snap.items.filter((i) => i.o !== null).sort((a, b) => (a.deadline > b.deadline ? -1 : 1)).slice(0, 12);
  const shared = snap.shared_events.slice(0, 12);
  const totalStatements = ds.statements.length;

  return (
    <Shell current="/" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 28 }}>
        <div className="eyebrow">Forecast Ledger · interventional psychiatry and psychedelic medicine · as of {fmtDate(ds.version.as_of)}</div>
        <h1 className="h2 big" style={{ marginTop: 8, maxWidth: "40ch" }}>{headlineSentence(hero.short, heroScores.headline)}</h1>
        <p className="sub" style={{ maxWidth: "70ch" }}>
          Quoted, dated predictions scored against public outcomes under one written method. Every score links to the words, the rule and the evidence.
        </p>
        <div className="grid3" style={{ marginTop: 18 }}>
          <Stat value={String(ds.coverage.read.free + ds.coverage.read.paid + ds.coverage.read.founding)} unit={`of ${ds.coverage.archive_count}`} label="posts read" small />
          <Stat value={String(totalStatements)} unit="statements" label="forward-looking claims found" small />
          <Stat value={String(all.true + all.false)} unit={`resolved · ${all.pending + all.known_true} pending`} label="dated items scored" small />
        </div>
      </header>

      <Grid2>
        <Card wide title={leaderboardTitle(snap.leaderboard)} sub="Brier score · whisker = 95% interval · n = resolved events · lower is better · dashed rule = coin flip 0.25" src={`Leaderboard · dated claims · rules v${ds.version.version} · as of ${ds.version.as_of}`}>
          <Reveal>
            <ChartFrame wide={<LeaderboardTickRows data={lb} size="wide" ranked />} half={<LeaderboardTickRows data={lb} size="half" ranked />} />
          </Reveal>
          <p className="note" style={{ marginTop: 10 }}>
            Persons are ranked only when both have ten or more resolved events, share a coverage tier, and their intervals do not overlap; otherwise rows are alphabetical.{" "}
            {ds.forecasters.filter((f) => f.coverage.tier !== "A").length > 0 ? "Comparators are ad hoc collections (tier C): rows and counts only." : null}
          </p>
        </Card>

        <Card title={`${plural(totalStatements, "statement")}: ${all.true + all.false} scored, ${all.not_admitted} not admitted.`} sub="one tick = 1% of statements · ink = scored · light = not admitted" src="Status · every statement in the census">
          <Reveal>
            <TickDonut data={statusDonut(all, String(totalStatements))} size="half" />
          </Reveal>
        </Card>

        <Card title={calibrationTitle(hero.short, heroScores)} sub="x = stated confidence bin · y = share that came true · dot area = events · dashed = perfect calibration" src={`Calibration · ${hero.name} · phrase bins`}>
          <Reveal>
            <CalibrationPlumb data={calibrationData(ds, heroScores, hero.short)} size="half" />
          </Reveal>
        </Card>

        <Card wide title={heroScores.over_time.length ? `${hero.short}'s cumulative Brier by the quarter each claim came due.` : `No claim by ${hero.short} has come due yet.`} sub="cumulative cluster-mean Brier · one dot per quarter with resolutions · lower is better" src={`Brier over time · ${hero.name}`}>
          <Reveal>
            <ChartFrame wide={<BrierHairline data={brierSeriesData(heroScores, hero.slug, hero.short)} size="wide" />} half={<BrierHairline data={brierSeriesData(heroScores, hero.slug, hero.short)} size="half" />} />
          </Reveal>
        </Card>

        <Card title="Forecasters by area: darkest cell is the best score." sub="cell = Brier on the area's resolved events · dot = fewer than 5 events · dashed square = best cell" src="Matrix · forecaster by area">
          <Reveal>
            <MatrixHeat data={matrixData(ds, snap)} size="half" />
          </Reveal>
        </Card>

        <Card title="Bold and right, or bold and wrong." sub="x = mean distance of p from the base rate · y = Brier · dashed = coin flip" src="Boldness against accuracy · headline items">
          <Reveal>
            <BoldnessPlumb data={boldnessData(ds, snap)} size="half" />
          </Reveal>
        </Card>

        {shared.length ? (
          <Card wide title={`${plural(shared.length, "event")} more than one forecaster called.`} sub="the only direct comparison across persons · one row per event and forecaster" src="Shared registry events">
            <div className="scroll-x prose">
              <table>
                <thead><tr><th>event</th><th>forecaster</th><th>deadlines</th><th>p</th><th>state</th><th>cluster Brier</th></tr></thead>
                <tbody>
                  {shared.flatMap((row) => row.forecasters.map((f) => (
                    <tr key={`${row.event_id}-${f.slug}`}>
                      <td><Link href={`/events#${row.event_id}`}>{reg.get(row.event_id)?.title ?? row.event_id}</Link></td>
                      <td><Link href={`/forecasters/${f.slug}`}>{ds.forecasters.find((x) => x.slug === f.slug)?.short ?? f.slug}</Link></td>
                      <td className="mono">{f.items.map((i) => i.deadline).join(", ")}</td>
                      <td className="mono">{f.items.map((i) => f2(i.p)).join(", ")}</td>
                      <td>{f.items.map((i, k) => <StateMark key={k} state={chartState(i.state)} />)}</td>
                      <td className="mono">{f2(f.cluster_brier)}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {recent.length ? (
          <Card wide title={`The last ${plural(recent.length, "claim")} that came due.`} sub="hairline = statement to deadline · solid = true · hollow = false · dot area = p" src="Recent resolutions · headline items">
            <Reveal>
              <ChartFrame wide={<LedgerAlmanac data={almanacData(ds, recent)} size="wide" />} half={<LedgerAlmanac data={almanacData(ds, recent)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}
      </Grid2>

      <section style={{ marginTop: 32 }} className="prose">
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: 18 }}>
          {ds.forecasters.map((f) => <li key={f.slug}><Link href={`/forecasters/${f.slug}`} className="eyebrow">{f.name} →</Link></li>)}
          {ds.areas.map((a) => <li key={a.slug}><Link href={`/areas/${a.slug}`} className="eyebrow">{a.name} →</Link></li>)}
        </ul>
      </section>
    </Shell>
  );
}
