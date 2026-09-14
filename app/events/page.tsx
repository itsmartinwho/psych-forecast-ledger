// Events: the registry (the propositions the ledger scores) and the ground truth (dated, sourced events).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card/Card";
import { AreaFilter } from "@/components/events/AreaFilter";
import { Grid2 } from "@/components/layout/Grid2";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { SourceLink } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { Term } from "@/components/ui/Term";
import { getDataset } from "@/lib/data/cached";
import { chartState, eventViews, type EventView } from "@/lib/data/derive";
import type { TimelineEvent } from "@/lib/data/schema";
import { getScores } from "@/lib/data/scores";
import { groundTruthTakeaway, plural, registryTakeaway } from "@/lib/data/text";
import { quarterOf, yearOf } from "@/lib/dates";
import { fmtDate, fmtInt } from "@/lib/format";
import type { State } from "@/components/charts/types";

export const metadata: Metadata = { title: "Events" };

/** Quarters open by default in the ground-truth list. */
const OPEN_QUARTERS = 4;

const OUTCOME_WORD = { occurred: "Occurred", not_occurred: "Not occurred", unresolvable: "Unresolvable" } as const;
const OUTCOME_STATE: Record<keyof typeof OUTCOME_WORD, State> = { occurred: "true", not_occurred: "false", unresolvable: "void" };

/** One entry per forecaster and state; repeats collapse to "×n" with the deadlines in a title. */
function claimGroups(v: EventView, short: Map<string, string>) {
  const groups = new Map<string, { slug: string; state: State; deadlines: string[]; id: string }>();
  for (const i of v.items) {
    const state = chartState(i.state);
    const key = `${i.forecaster}-${state}`;
    const g = groups.get(key) ?? { slug: i.forecaster, state, deadlines: [], id: i.statement_ids[0] };
    g.deadlines.push(i.deadline);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, label: short.get(g.slug) ?? g.slug }));
}

function Quarter({ q, rows, open }: { q: string; rows: TimelineEvent[]; open: boolean }) {
  return (
    <details className="how" open={open}>
      <summary>
        {q.replace("-", " ")} · {plural(rows.length, "event")}
      </summary>
      <div>
        <table className="registry" data-quarter={q}>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} id={t.id} data-area={t.area}>
                <td className="ledger-said">{fmtDate(t.date)}</td>
                <td>
                  <strong>{t.entity}</strong>: {t.event} <SourceLink href={t.source_url}>{t.source_org}</SourceLink>
                  {t.confidence !== "high" ? (
                    <span className="chip chip--hollow" style={{ marginLeft: 6 }}>
                      {t.confidence}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function EventsPage() {
  const ds = getDataset();
  const snap = getScores();
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const short = new Map<string, string>(ds.forecasters.map((f) => [f.slug, f.short]));
  const areaName = new Map<string, string>(ds.areas.map((a) => [a.slug, a.short ?? a.name]));
  const views = eventViews(ds, snap).sort((a, b) => ((a.outcome?.date ?? "9999") < (b.outcome?.date ?? "9999") ? -1 : 1));
  const byQuarter = new Map<string, TimelineEvent[]>();
  for (const t of ds.timeline) {
    const q = quarterOf(t.date);
    const list = byQuarter.get(q) ?? [];
    list.push(t);
    byQuarter.set(q, list);
  }
  const quarters = [...byQuarter.keys()].sort().reverse();
  const years = ds.timeline.map((t) => yearOf(t.date));
  const span = years.length ? `${Math.min(...years)} to ${Math.max(...years)}` : "";
  const meta = [
    <span key="reg">
      {fmtInt(ds.registry.length)} <Term t="registry event">registry events</Term>
    </span>,
    plural(ds.timeline.length, "ground-truth event"),
    span,
    <Suspense key="area" fallback={null}>
      <AreaFilter areas={ds.areas} />
    </Suspense>,
  ];
  const registryHow = (
    <>
      A <Term t="registry event">registry event</Term> is one proposition with one criterion and one resolution source, written before outcomes are looked up. The <Term t="outcome">outcome</Term> is{" "}
      <Term t="resolved">resolved</Term> from the source named at intake. <Link href="/methodology#templates">Method › Event templates</Link>
    </>
  );

  return (
    <Shell current="/events" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="Events" version={ds.version} meta={meta} />
      <Grid2>
        <Card wide title="Registry" takeaway={registryTakeaway(views)} n={plural(views.length, "event")} how={registryHow} src="Registry">
          <table className="registry">
            <thead>
              <tr>
                <th>
                  <Term t="registry event">Event</Term>
                </th>
                <th>Area</th>
                <th>
                  <Term t="outcome">Outcome</Term>
                </th>
                <th>Claims</th>
              </tr>
            </thead>
            <tbody>
              {views.map((v) => (
                <tr key={v.event.id} id={v.event.id} data-area={v.event.area}>
                  <td>
                    <strong>{v.event.title}</strong>
                    <span className="ledger-event">{v.event.id}</span>
                    <details className="how">
                      <summary>Criterion</summary>
                      <div>
                        <p>{v.event.criterion}</p>
                        <p>{v.event.resolution_source.url ? <SourceLink href={v.event.resolution_source.url}>{v.event.resolution_source.name}</SourceLink> : v.event.resolution_source.name}</p>
                      </div>
                    </details>
                  </td>
                  <td>
                    <Link href={`/areas/${v.event.area}`}>{areaName.get(v.event.area) ?? v.event.area}</Link>
                  </td>
                  <td>
                    {v.outcome ? (
                      <span>
                        <StateMark state={OUTCOME_STATE[v.outcome.state]} /> {OUTCOME_WORD[v.outcome.state]}
                        {v.outcome.date ? ` · ${yearOf(v.outcome.date)}` : ""}
                      </span>
                    ) : (
                      <span className="chip chip--hollow">Open</span>
                    )}
                    {v.rechecks.length ? (
                      <details className="how">
                        <summary>Recheck ×{fmtInt(v.rechecks.length)}</summary>
                        <div>
                          {v.rechecks.map((r, k) => (
                            <p key={k}>
                              {r.verdict} ({r.challenged}): {r.argument}
                            </p>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </td>
                  <td>
                    {claimGroups(v, short).map((g) => (
                      <Link key={`${g.slug}-${g.state}`} href={`/predictions/${g.id}`} style={{ marginRight: 10, whiteSpace: "nowrap" }} title={g.deadlines.map(fmtDate).join(", ")}>
                        <StateMark state={g.state} /> {g.label}
                        {g.deadlines.length > 1 ? ` ×${fmtInt(g.deadlines.length)}` : ""}
                      </Link>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card wide title="Ground truth" takeaway={groundTruthTakeaway(ds.timeline)} n={plural(ds.timeline.length, "event")} src={`Timeline · ${span}`}>
          {quarters.map((q, i) => (
            <Quarter key={q} q={q} rows={byQuarter.get(q) ?? []} open={i < OPEN_QUARTERS} />
          ))}
        </Card>
      </Grid2>
    </Shell>
  );
}
