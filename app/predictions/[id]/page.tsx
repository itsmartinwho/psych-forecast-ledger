// Statement record: the words, the intake fields written before looking, the resolution, and the claim in its field.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/card/Card";
import { HowToRead } from "@/components/card/HowToRead";
import { RecedingHorizon } from "@/components/charts/RecedingHorizon";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Quote } from "@/components/ui/Quote";
import { SourceLink } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { Term } from "@/components/ui/Term";
import { getDataset } from "@/lib/data/cached";
import { STATE_WORD, chartState, predictionDetail, recedingHorizon, registryById, trendLanesData, undatedDeadline } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { f2, horizonTakeaway, pct, plural, reasonLabel, statementTitle } from "@/lib/data/text";
import { fmtDate, fmtInt } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() {
  return getDataset().statements.map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Statement ${id}` };
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="metric-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

const ORIGIN_WORD: Record<string, string> = { stated: "Stated", anchor: "Anchor", table: "Table", lexicon: "Lexicon" };

export default async function PredictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = getDataset();
  const snap = getScores();
  const d = predictionDetail(ds, snap, id);
  if (!d) notFound();
  const { statement: st, forecaster: f, item, scored, event, outcome, rechecks, cluster, coderB } = d;
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const reg = registryById(ds);
  const horizon = cluster.length && event ? recedingHorizon(ds, cluster, event.title) : null;
  const lanes = scored ? trendLanesData(ds, [scored], { hero: id }) : null;
  const reasonText = st.reason_code ? ds.reason_codes.not_admitted.find((r) => r.code === st.reason_code) : null;
  const areaName = item ? ds.areas.find((a) => a.slug === item.area)?.name ?? item.area : "";
  const sourceType = st.source.type.replace(/_/g, " ");
  const paid = st.source.audience && st.source.audience !== "everyone";

  return (
    <Shell current="/predictions" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader
        title={statementTitle(d, ds.reason_codes)}
        version={ds.version}
        meta={[
          <Link key="who" href={`/forecasters/${f.slug}`}>
            {f.name}
          </Link>,
          `Said ${fmtDate(st.statement_date)}${st.date_precision === "month" ? " (month)" : ""}`,
          st.id,
        ]}
      />
      <Grid2>
        <Card wide title="Quote" src={`Statement · ${sourceType}`}>
          <Quote date={st.statement_date} source={{ url: st.source.url, title: st.source.title }}>
            {st.quote}
          </Quote>
          {paid ? (
            <p className="src">
              <span className="chip chip--hollow">Paid</span>
            </p>
          ) : null}
          {st.context ? <p className="lede">{st.context}</p> : null}
          {reasonText ? (
            <>
              <p className="takeaway">{reasonText.label}</p>
              <p className="lede">{reasonText.test}</p>
            </>
          ) : null}
        </Card>

        {item && event ? (
          <Card
            title="Intake"
            how={
              <>
                The event, criterion and <Term t="deadline">deadline</Term> were written at intake, before the <Term t="outcome">outcome</Term> was looked up. Coder B coded the statement independently.
              </>
            }
            src={`Coder ${item.coder}`}
          >
            <dl className="metric-list record">
              <Row
                k={<Term t="registry event">Event</Term>}
                v={<Link href={`/events#${event.id}`}>{event.title}</Link>}
              />
              <Row k="Area" v={<Link href={`/areas/${item.area}`}>{areaName}</Link>} />
              <Row
                k={<Term t="deadline">Deadline</Term>}
                v={
                  item.deadline ? (
                    <>
                      {fmtDate(item.deadline)} <span className="chip chip--hollow">{ORIGIN_WORD[item.deadline_origin ?? ""] ?? item.deadline_origin}</span>
                      {item.deadline_text ? <> · &ldquo;{item.deadline_text}&rdquo;</> : null}
                    </>
                  ) : (
                    <>
                      None stated · <Term t="undated panel">undated panel</Term>, {fmtInt(ds.thresholds.undated_window_months)}-month window to {fmtDate(undatedDeadline(ds, item.statement_date))}
                    </>
                  )
                }
              />
              <Row
                k="Probability"
                v={
                  <>
                    {f2(item.p)} <span className="chip chip--hollow">{ORIGIN_WORD[item.p_origin] ?? item.p_origin}</span>
                    {item.bin ? (
                      <>
                        {" · "}
                        <Term t="bin">bin</Term> {item.bin}
                      </>
                    ) : null}
                    {item.phrase ? <> · &ldquo;{item.phrase}&rdquo;</> : null}
                    {item.asserts ? null : (
                      <>
                        {" · "}
                        <Term t="denial">denial</Term>
                      </>
                    )}
                    {item.p_note ? ` · ${item.p_note}` : null}
                  </>
                }
              />
              <Row
                k={<Term t="base rate">Base rate</Term>}
                v={
                  item.base_rate ? (
                    <>
                      {item.base_rate.class} · {f2(item.base_rate.p_raw)}
                      {item.base_rate.halved ? (
                        <>
                          {" · "}
                          <Term t="halving rule">halved</Term> to {f2(item.base_rate.p)} (window shorter than the median {plural(item.base_rate.median_months ?? 0, "month")})
                        </>
                      ) : null}
                    </>
                  ) : (
                    "None in the table"
                  )
                }
              />
              {item.tags.length ? <Row k="Tags" v={item.tags.join(", ")} /> : null}
              {d.condition ? <Row k="Condition" v={<Link href={`/events#${d.condition.id}`}>{d.condition.title}</Link>} /> : null}
              <Row
                k="Coder B"
                v={coderB ? `${coderB.admit ? "admitted" : `rejected (${reasonLabel(ds.reason_codes, coderB.reason_code)})`} · event ${coderB.event_id ?? "new"} · deadline ${coderB.deadline ? fmtDate(coderB.deadline) : "none"} · bin ${coderB.bin ?? "–"}` : "–"}
              />
            </dl>
            <HowToRead summary="Registry entry">
              <p>{event.proposition}</p>
              <p>{event.criterion}</p>
              <p>{event.resolution_source.url ? <SourceLink href={event.resolution_source.url}>{event.resolution_source.name}</SourceLink> : event.resolution_source.name}</p>
              {event.readings.length ? <p>Readings: {event.readings.join("; ")}</p> : null}
            </HowToRead>
          </Card>
        ) : null}

        {scored ? (
          <Card title="Resolution" how="State at window close; the outcome comes from the registry, the score from the rule." src="Registry">
            <dl className="metric-list record">
              <Row
                k="State"
                v={
                  <>
                    <StateMark state={chartState(scored.state)} /> {STATE_WORD[scored.state]}
                    {scored.state === "known_true" ? (
                      <>
                        {" · "}
                        <Term t="known true">enters the score</Term> on {fmtDate(scored.deadline)}
                      </>
                    ) : null}
                  </>
                }
              />
              <Row k={<Term t="window-close scoring">Effective deadline</Term>} v={fmtDate(scored.deadline)} />
              <Row
                k={<Term t="outcome">Outcome</Term>}
                v={outcome ? `${outcome.state.replace(/_/g, " ")}${outcome.date ? ` on ${fmtDate(outcome.date)}` : ""} · checked through ${fmtDate(outcome.checked_through)}` : "No registry outcome yet"}
              />
              {outcome?.note ? <Row k="Resolver note" v={outcome.note} /> : null}
              {outcome?.evidence.length ? (
                <Row
                  k="Evidence"
                  v={
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {outcome.evidence.map((e) => (
                        <li key={e.url}>
                          <SourceLink href={e.url}>{e.title}</SourceLink>
                          {e.date ? ` · ${fmtDate(e.date)}` : ""}
                        </li>
                      ))}
                    </ul>
                  }
                />
              ) : null}
              <Row k={<Term t="Brier score">Brier</Term>} v={scored.brier === null ? "Not scored" : `${f2(scored.brier)} = (${f2(scored.p)} − ${scored.o})²`} />
              {scored.timing_months !== null ? <Row k={<Term t="timing">Happened later</Term>} v={`Yes, ${plural(scored.timing_months, "month")} after the deadline`} /> : null}
              {scored.base_p !== null && scored.o !== null ? <Row k="Base-rate Brier on this item" v={f2((scored.base_p - scored.o) ** 2)} /> : null}
              {scored.market_p !== null ? <Row k={<Term t="market reference">Market price before the statement</Term>} v={pct(scored.market_p)} /> : null}
              {scored.statement_ids.length > 1 ? (
                <Row
                  k={<Term t="cluster">Restatements merged</Term>}
                  v={scored.statement_ids.map((s) => (
                    <Link key={s} href={`/predictions/${s}`} style={{ marginRight: 8 }}>
                      {s}
                    </Link>
                  ))}
                />
              ) : null}
            </dl>
            {rechecks.length ? (
              <HowToRead summary="Adversarial recheck">
                {rechecks.map((r, k) => (
                  <p key={k}>
                    {r.verdict} ({r.challenged}): {r.argument}
                  </p>
                ))}
              </HowToRead>
            ) : null}
          </Card>
        ) : null}

        {horizon && event ? (
          <Card
            wide
            title="Receding horizon"
            takeaway={horizonTakeaway(f.short, event.title, new Set(cluster.map((c) => c.deadline)).size, horizon.actualDate ?? null)}
            legend={[
              { glyph: "solid", label: "promised date" },
              { glyph: "accent", label: "happened" },
            ]}
            src={`Cluster ${event.id}`}
          >
            <Reveal>
              <ChartFrame wide={<RecedingHorizon data={horizon} size="wide" />} half={<RecedingHorizon data={horizon} size="half" />} />
            </Reveal>
          </Card>
        ) : null}
        {lanes && lanes.lanes.length ? (
          <Card
            wide
            title="Timeline"
            legend={[
              { glyph: "solid", label: "said" },
              { glyph: "hollow", label: "due" },
              { glyph: "tick", label: "event" },
            ]}
            src={areaName || (item ? reg.get(item.event_id)?.area ?? "" : "")}
          >
            <Reveal>
              <ChartFrame wide={<TrendLanes data={lanes} size="wide" />} half={<TrendLanes data={lanes} size="half" />} />
            </Reveal>
          </Card>
        ) : null}
      </Grid2>
      <p className="dateline" style={{ marginTop: 24, display: "flex", gap: 24 }}>
        {d.prev ? <Link href={`/predictions/${d.prev}`}>← Earlier</Link> : null}
        {d.next ? <Link href={`/predictions/${d.next}`}>Later →</Link> : null}
        <Link href="/predictions">All statements</Link>
      </p>
    </Shell>
  );
}
