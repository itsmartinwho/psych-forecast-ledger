import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecedingHorizon } from "@/components/charts/RecedingHorizon";
import { TrendLanes } from "@/components/charts/TrendLanes";
import { Card } from "@/components/card/Card";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Quote } from "@/components/ui/Quote";
import { SourceLink } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { getDataset } from "@/lib/data/cached";
import { STATE_WORD, chartState, predictionDetail, recedingHorizon, trendLanesData, undatedDeadline } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { f2, pct } from "@/lib/data/text";

export const dynamicParams = false;
export function generateStaticParams() {
  return getDataset().statements.map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Statement ${id}` };
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (<tr><td style={{ width: 180, color: "var(--color-muted)" }}>{k}</td><td>{v}</td></tr>);
}

export default async function PredictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = getDataset();
  const snap = getScores();
  const d = predictionDetail(ds, snap, id);
  if (!d) notFound();
  const { statement: st, forecaster: f, item, scored, event, outcome, rechecks, cluster, coderB } = d;
  const state = st.status === "admitted" ? (scored?.state ?? "pending") : st.status === "void" ? "void" : "not_admitted";
  const title = st.status === "not_admitted" ? `Not admitted: ${st.reason_code}.` : st.status === "void" ? `Void: ${st.void_reason === "AMBIGUOUS" ? "the two coders read the claim differently" : st.void_reason}.` : scored ? `${STATE_WORD[scored.state]}${scored.brier !== null ? ` · Brier ${f2(scored.brier)}` : ""}.` : "Admitted.";
  const horizon = cluster.length ? recedingHorizon(ds, cluster, event?.title ?? "") : null;
  const lanes = scored ? trendLanesData(ds, [scored], { hero: id }) : null;
  const reasonText = st.reason_code ? ds.reason_codes.not_admitted.find((r) => r.code === st.reason_code) : null;

  return (
    <Shell current="/predictions" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 22 }}>
        <div className="eyebrow"><Link href={`/forecasters/${f.slug}`}>{f.name}</Link> · {st.statement_date}{st.date_precision === "month" ? " (month)" : ""} · {st.id}</div>
        <h1 className="h2 big" style={{ marginTop: 8 }}>{title}</h1>
      </header>
      <Grid2>
        <Card wide title="The words." sub="verbatim quote · date · source" src={`Statement · ${st.source.type.replace(/_/g, " ")}${st.source.audience && st.source.audience !== "everyone" ? " · paid post" : ""}`}>
          <Quote date={st.statement_date} source={{ url: st.source.url, title: st.source.title }}>{st.quote}</Quote>
          {st.context ? <p className="note" style={{ marginTop: 10 }}>{st.context}</p> : null}
          {reasonText ? <p className="note" style={{ marginTop: 10 }}><strong>{reasonText.label}.</strong> {reasonText.test}</p> : null}
        </Card>

        {item && event ? (
          <Card title="The event and the rule, written before looking." sub="registry entry · criterion · deadline and its origin · probability and its origin" src={`Intake · coder ${item.coder} · rules v${item.rule_version}`}>
            <div className="prose">
              <table><tbody>
                <Row k="event" v={<Link href={`/events#${event.id}`}>{event.title}</Link>} />
                <Row k="proposition" v={event.proposition} />
                <Row k="criterion" v={event.criterion} />
                <Row k="resolution source" v={event.resolution_source.url ? <SourceLink href={event.resolution_source.url}>{event.resolution_source.name}</SourceLink> : event.resolution_source.name} />
                {event.readings.length ? <Row k="intake readings" v={event.readings.join("; ")} /> : null}
                <Row k="area" v={<Link href={`/areas/${item.area}`}>{ds.areas.find((a) => a.slug === item.area)?.name}</Link>} />
                <Row k="deadline" v={item.deadline ? `${item.deadline} · ${item.deadline_origin} · "${item.deadline_text ?? ""}"` : `none stated → undated panel, ${ds.thresholds.undated_window_months}-month window to ${undatedDeadline(ds, item.statement_date)}`} />
                <Row k="probability p(E)" v={`${f2(item.p)} · ${item.p_origin}${item.bin ? ` · bin ${item.bin}` : ""}${item.phrase ? ` · "${item.phrase}"` : ""}${item.asserts ? "" : " · denial (1 − bin)"}${item.p_note ? ` · ${item.p_note}` : ""}`} />
                <Row k="tags" v={item.tags.join(", ") || "–"} />
                <Row k="base rate" v={item.base_rate ? `${item.base_rate.class} · ${f2(item.base_rate.p_raw)}${item.base_rate.halved ? ` halved to ${f2(item.base_rate.p)} (window shorter than the median ${item.base_rate.median_months} months)` : ""}` : "none in the table"} />
                {d.condition ? <Row k="condition" v={<Link href={`/events#${d.condition.id}`}>{d.condition.title}</Link>} /> : null}
                <Row k="coder B" v={coderB ? `${coderB.admit ? "admitted" : `rejected (${coderB.reason_code})`} · event ${coderB.event_id ?? "new"} · deadline ${coderB.deadline ?? "none"} · bin ${coderB.bin ?? "–"}` : "–"} />
              </tbody></table>
            </div>
          </Card>
        ) : null}

        {scored ? (
          <Card title={`${STATE_WORD[scored.state]}.`} sub="state at window close · outcome from the registry · score" src={`Resolution · as of ${ds.version.as_of}`}>
            <div className="prose">
              <table><tbody>
                <Row k="state" v={<span><StateMark state={chartState(scored.state)} withLabel />{scored.state === "known_true" ? ` · enters the score on ${scored.deadline}` : ""}</span>} />
                <Row k="effective deadline" v={scored.deadline} />
                <Row k="outcome" v={outcome ? `${outcome.state}${outcome.date ? ` on ${outcome.date}` : ""} · checked through ${outcome.checked_through}` : "no registry outcome yet"} />
                {outcome?.note ? <Row k="resolver note" v={outcome.note} /> : null}
                {outcome?.evidence.length ? <Row k="evidence" v={<ul style={{ margin: 0, paddingLeft: 16 }}>{outcome.evidence.map((e) => <li key={e.url}><SourceLink href={e.url}>{e.title}</SourceLink>{e.date ? ` · ${e.date}` : ""}</li>)}</ul>} /> : null}
                <Row k="Brier" v={scored.brier === null ? "not scored" : `${f2(scored.brier)} = (${f2(scored.p)} − ${scored.o})²`} />
                {scored.timing_months !== null ? <Row k="happened later" v={`yes, ${scored.timing_months} months after the deadline`} /> : null}
                {scored.base_p !== null && scored.o !== null ? <Row k="base-rate Brier on this item" v={f2((scored.base_p - scored.o) ** 2)} /> : null}
                {scored.market_p !== null ? <Row k="market price before the statement" v={pct(scored.market_p)} /> : null}
                {scored.statement_ids.length > 1 ? <Row k="restatements merged" v={scored.statement_ids.map((s) => <Link key={s} href={`/predictions/${s}`} style={{ marginRight: 8 }}>{s}</Link>)} /> : null}
                {rechecks.length ? <Row k="adversarial recheck" v={rechecks.map((r) => `${r.verdict} (${r.challenged}): ${r.argument.slice(0, 200)}`).join(" · ")} /> : null}
              </tbody></table>
            </div>
          </Card>
        ) : null}

        {horizon ? (
          <Card wide title={`${f.short} put ${cluster.length} deadlines on this event.`} sub="x = said · y = promised · accent = happened" src="Receding horizon">
            <Reveal><ChartFrame wide={<RecedingHorizon data={horizon} size="wide" />} half={<RecedingHorizon data={horizon} size="half" />} /></Reveal>
          </Card>
        ) : null}
        {lanes && lanes.lanes.length ? (
          <Card wide title="The claim against the events of its area." sub="solid dot = said · hollow = deadline · ticks = ground-truth events" src="Trend lane">
            <Reveal><ChartFrame wide={<TrendLanes data={lanes} size="wide" />} half={<TrendLanes data={lanes} size="half" />} /></Reveal>
          </Card>
        ) : null}
      </Grid2>
      <p className="eyebrow" style={{ marginTop: 24, display: "flex", gap: 24 }}>
        {d.prev ? <Link href={`/predictions/${d.prev}`}>← earlier</Link> : null}
        {d.next ? <Link href={`/predictions/${d.next}`}>later →</Link> : null}
        <Link href="/predictions">all statements</Link>
      </p>
    </Shell>
  );
}
