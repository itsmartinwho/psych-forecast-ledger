// Overview: only what compares the forecasters. The leaderboard, one row per person, the admission funnel of the
// whole census, the claims that came due, the shared events, and the cross-person charts. A person's own charts live
// on that person's page.
import type { Metadata } from "next";
import Link from "next/link";
import { AdmissionCards } from "@/components/blocks/AdmissionCards";
import { ForecastersCard } from "@/components/blocks/ForecastersCard";
import { LeaderboardCard } from "@/components/blocks/LeaderboardCard";
import { SharedEventsCard } from "@/components/blocks/SharedEventsCard";
import { WaitingCard } from "@/components/blocks/WaitingCard";
import { Card } from "@/components/card/Card";
import { BoldnessPlumb } from "@/components/charts/BoldnessPlumb";
import { LedgerAlmanac } from "@/components/charts/LedgerAlmanac";
import { MatrixHeat } from "@/components/charts/MatrixHeat";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Term } from "@/components/ui/Term";
import { lockState, type LockKey } from "@/lib/content/display";
import { SITE_NAME } from "@/lib/content/site";
import { getDataset } from "@/lib/data/cached";
import { almanacData, boldnessData, leaderboardData, matrixData } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { boldnessTakeaway, matrixTakeaway, plural, recentTakeaway } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: SITE_NAME };

/** Resolved items in "Claims that came due", newest deadline first. */
const RECENT_N = 12;

/** The cross-person charts the Waiting for data card lists when they are below their minimum. */
const HOME_LOCKS: readonly LockKey[] = ["matrix", "boldness"];

interface LinkRowProps {
  label: string;
  links: { href: string; text: string }[];
}

/** One meta-register row: a label, then links joined by dots. No arrows. */
function LinkRow({ label, links }: LinkRowProps) {
  return (
    <p className="dateline">
      <span className="dateline-part" style={{ marginRight: 12 }}>
        {label}
      </span>
      {links.map((l, i) => (
        <span key={l.href} className="dateline-part">
          {i > 0 ? <span className="dateline-dot"> · </span> : null}
          <Link href={l.href}>{l.text}</Link>
        </span>
      ))}
    </p>
  );
}

export default function Home() {
  const ds = getDataset();
  const snap = getScores();
  const th = ds.thresholds;
  const minN = th.min_clusters_headline;
  const ctx = { snap };
  const recent = snap.items.filter((i) => i.o !== null).sort((a, b) => (a.deadline > b.deadline ? -1 : 1)).slice(0, RECENT_N);
  const persons = snap.leaderboard.filter((r) => r.kind === "person").length;
  const hasTierC = ds.forecasters.some((f) => f.coverage.tier === "C");
  const matrix = lockState("matrix", ctx);
  const boldness = lockState("boldness", ctx);
  const resolvedEvents = ds.forecasters.reduce((n, f) => n + snap.forecasters[f.slug].headline.n_clusters, 0);

  return (
    <Shell current="/">
      <PageHeader
        title="Overview"
        version={ds.version}
        meta={[
          plural(persons, "forecaster"),
          plural(ds.statements.length, "statement"),
          <span key="adm">
            {fmtInt(ds.statements.filter((st) => st.status !== "not_admitted").length)} <Term t="admitted">admitted</Term>
          </span>,
          <span key="res">
            {fmtInt(resolvedEvents)} <Term t="resolved">resolved</Term> events
          </span>,
        ]}
      />

      <Grid2>
        <LeaderboardCard data={leaderboardData(ds, snap)} minN={minN} thresholds={th} ranked src={`Headline panel · ${plural(persons, "forecaster")}`} hasTierC={hasTierC} />

        <ForecastersCard ds={ds} snap={snap} minN={minN} />

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

        <AdmissionCards ds={ds} snap={snap} scope="all forecasters" />

        {recent.length ? (
          <Card
            wide
            title="Claims that came due"
            takeaway={recentTakeaway(recent)}
            legend={[
              { glyph: "solid", label: "true" },
              { glyph: "hollow", label: "false" },
            ]}
            src="Headline panel · all forecasters · newest first"
          >
            <Reveal>
              <ChartFrame wide={<LedgerAlmanac data={almanacData(ds, recent)} size="wide" />} half={<LedgerAlmanac data={almanacData(ds, recent)} size="half" />} />
            </Reveal>
          </Card>
        ) : null}

        <SharedEventsCard ds={ds} shared={snap.shared_events} />

        <WaitingCard keys={HOME_LOCKS} ctx={ctx} />
      </Grid2>

      <section className="link-rows" style={{ marginTop: 32 }}>
        <LinkRow label="Areas" links={ds.areas.map((a) => ({ href: `/areas/${a.slug}`, text: a.name }))} />
      </section>
    </Shell>
  );
}
