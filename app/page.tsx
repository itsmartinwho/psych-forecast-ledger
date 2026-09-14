// Home: the hero's scoreboard, the leaderboard, the record, and what is waiting for data.
import type { Metadata } from "next";
import Link from "next/link";
import { AdmissionCards } from "@/components/blocks/AdmissionCards";
import { LeaderboardCard } from "@/components/blocks/LeaderboardCard";
import { SharedEventsCard } from "@/components/blocks/SharedEventsCard";
import { WaitingCard } from "@/components/blocks/WaitingCard";
import { Card } from "@/components/card/Card";
import { BoldnessPlumb } from "@/components/charts/BoldnessPlumb";
import { BrierHairline } from "@/components/charts/BrierHairline";
import { CalibrationPlumb } from "@/components/charts/CalibrationPlumb";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { MatrixHeat } from "@/components/charts/MatrixHeat";
import { HOLLOW_BELOW } from "@/components/charts/layout/BrierHairline.layout";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Scoreboard } from "@/components/scoreboard/Scoreboard";
import { Term } from "@/components/ui/Term";
import { lockState } from "@/lib/content/display";
import { SITE_NAME } from "@/lib/content/site";
import { getDataset } from "@/lib/data/cached";
import { COIN_FLIP, almanacData, boldnessData, brierSeriesData, calibrationData, leaderboardData, matrixData } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { boldnessTakeaway, calibrationTakeaway, coveragePhrase, f2, matrixTakeaway, overTimeTakeaway, plural, recentTakeaway, roleParts } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: SITE_NAME };

const RECENT_N = 12;

export default function Home() {
  const ds = getDataset();
  const snap = getScores();
  const hero = ds.forecasters.find((f) => f.hero) ?? ds.forecasters[0];
  const heroScores = snap.forecasters[hero.slug];
  const th = ds.thresholds;
  const minN = th.min_clusters_headline;
  const ctx = { f: heroScores, snap };
  const recent = snap.items.filter((i) => i.o !== null).sort((a, b) => (a.deadline > b.deadline ? -1 : 1)).slice(0, RECENT_N);
  const persons = snap.leaderboard.filter((r) => r.kind === "person").length;
  const overTime = lockState("over_time", ctx);
  const calibration = lockState("calibration", ctx);
  const matrix = lockState("matrix", ctx);
  const boldness = lockState("boldness", ctx);

  return (
    <Shell current="/" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title={hero.name} version={ds.version} meta={[...roleParts(hero.role), <Term key="cov" t="coverage tier">{coveragePhrase(hero.coverage.tier)}</Term>]} />

      <Grid2>
        <Scoreboard f={hero} s={heroScores} status={snap.status[hero.slug]} minN={minN} thresholds={th} />

        <LeaderboardCard data={leaderboardData(ds, snap)} minN={minN} thresholds={th} ranked src={`Headline panel · ${plural(persons, "forecaster")}`} hasTierC={ds.forecasters.some((f) => f.coverage.tier === "C")} />

        {overTime.shown ? (
          <Card
            wide
            title="Brier over time"
            takeaway={overTimeTakeaway(heroScores)}
            legend={[
              { glyph: "solid", label: "quarter" },
              { glyph: "hollow", label: `fewer than ${fmtInt(HOLLOW_BELOW)} events` },
              { glyph: "dash", label: `coin flip ${f2(COIN_FLIP)}` },
            ]}
            src="Headline panel · by deadline quarter"
          >
            <Reveal>
              <ChartFrame wide={<BrierHairline data={brierSeriesData(heroScores, hero.slug, hero.short)} size="wide" />} half={<BrierHairline data={brierSeriesData(heroScores, hero.slug, hero.short)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        <AdmissionCards ds={ds} snap={snap} scope="all forecasters" />

        {calibration.shown ? (
          <Card
            title="Calibration"
            takeaway={calibrationTakeaway(hero.short, heroScores)}
            legend={[
              { glyph: "solid", label: "bin, area = events" },
              { glyph: "dash", label: "perfect calibration" },
              { glyph: "text", label: "x = stated confidence" },
            ]}
            src={`Headline panel · ${plural(heroScores.calibration.n_clusters, "event")}`}
          >
            <Reveal>
              <CalibrationPlumb data={calibrationData(ds, heroScores, hero.short)} size="half" />
            </Reveal>
          </Card>
        ) : null}

        {matrix.shown ? (
          <Card
            title="Forecasters by area"
            takeaway={matrixTakeaway(snap, ds)}
            legend={[
              { glyph: "text", label: "darker = lower Brier" },
              { glyph: "void", label: `under ${fmtInt(th.calibration_min_per_bin)} events` },
              { glyph: "dash", label: "best cell" },
            ]}
            src="Resolved events by area"
          >
            <Reveal>
              <MatrixHeat data={matrixData(ds, snap)} size="half" />
            </Reveal>
          </Card>
        ) : null}

        {boldness.shown ? (
          <Card
            title="Boldness and accuracy"
            takeaway={boldnessTakeaway(boldnessData(ds, snap))}
            legend={[
              { glyph: "solid", label: "forecaster" },
              { glyph: "dash", label: "coin flip" },
            ]}
            src="Headline panel"
          >
            <Reveal>
              <BoldnessPlumb data={boldnessData(ds, snap)} size="half" />
            </Reveal>
          </Card>
        ) : null}

        {recent.length ? (
          <Card
            wide
            title="Claims that came due"
            takeaway={recentTakeaway(recent)}
            legend={[
              { glyph: "solid", label: "true" },
              { glyph: "hollow", label: "false" },
              { glyph: "text", label: "dot area = p" },
              { glyph: "text", label: "hairline = said to due" },
            ]}
            src="Headline panel · newest first"
          >
            <Reveal>
              <ChartFrame wide={<LedgerAlmanac data={almanacData(ds, recent)} size="wide" />} half={<LedgerAlmanac data={almanacData(ds, recent)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        <SharedEventsCard ds={ds} shared={snap.shared_events} />

        <WaitingCard keys={["calibration", "matrix", "boldness", "timing"]} ctx={ctx} />
      </Grid2>

      <section className="link-rows" style={{ marginTop: 32 }}>
        <p className="dateline">
          <span className="dateline-part">Forecasters</span>
          {ds.forecasters.map((f) => (
            <span key={f.slug} className="dateline-part">
              <span className="dateline-dot"> · </span>
              <Link href={`/forecasters/${f.slug}`}>{f.name}</Link>
            </span>
          ))}
        </p>
        <p className="dateline">
          <span className="dateline-part">Areas</span>
          {ds.areas.map((a) => (
            <span key={a.slug} className="dateline-part">
              <span className="dateline-dot"> · </span>
              <Link href={`/areas/${a.slug}`}>{a.name}</Link>
            </span>
          ))}
        </p>
      </section>
    </Shell>
  );
}
