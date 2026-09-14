// Events: the registry (the propositions the ledger scores) and the ground truth (dated, sourced events).
// The page is static. The ?a={area} filter runs in the browser (AreaFilter) over the data-area rows.
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
import type { State } from "@/components/charts/types";
import { METHOD_PATH } from "@/lib/content/site";
import { getDataset } from "@/lib/data/cached";
import { chartState, eventViews, type EventView } from "@/lib/data/derive";
import type { Recheck, TimelineEvent } from "@/lib/data/schema";
import { getScores } from "@/lib/data/scores";
import { groundTruthTakeaway, plural, registryTakeaway } from "@/lib/data/text";
import { quarterOf, yearOf } from "@/lib/dates";
import { fmtDate, fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };

/** Quarters open by default in the ground-truth list. */
const OPEN_QUARTERS = 4;

const OUTCOME_WORD = { occurred: "Occurred", not_occurred: "Not occurred", unresolvable: "Unresolvable" } as const;
const OUTCOME_STATE: Record<keyof typeof OUTCOME_WORD, State> = { occurred: "true", not_occurred: "false", unresolvable: "void" };

/** "2023-Q2" -> "2023 Q2" for a details summary. */
const quarterText = (q: string) => q.replace("-", " ");

interface ClaimGroup {
  slug: string;
  label: string;
  state: State;
  deadlines: string[];
  /** Statement id of the first item, for the link. */
  id: string;
}

/** One entry per forecaster and state, sorted by name; repeats collapse to "×n" with the deadlines in a title. */
function claimGroups(v: EventView, short: Map<string, string>): ClaimGroup[] {
  const groups = new Map<string, ClaimGroup>();
  for (const i of v.items) {
    const state = chartState(i.state);
    const key = `${i.forecaster}-${state}`;
    const g = groups.get(key) ?? { slug: i.forecaster, label: short.get(i.forecaster) ?? i.forecaster, state, deadlines: [], id: i.statement_ids[0] };
    g.deadlines.push(i.deadline);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label) || a.state.localeCompare(b.state));
}

/** The year an outcome carries: the date it became true, else the date the resolver checked through. */
const outcomeYear = (o: NonNullable<EventView["outcome"]>) => yearOf(o.date ?? o.checked_through);

function RecheckList({ rechecks }: { rechecks: Recheck[] }) {
  return (
    <details className="how">
      <summary>Recheck ×{fmtInt(rechecks.length)}</summary>
      <div>
        {rechecks.map((r, k) => (
          <p key={k}>
            <span className="chip chip--hollow">{r.verdict}</span> {r.challenged} · {fmtDate(r.rechecked_at)}
            <br />
            {r.argument}
          </p>
        ))}
      </div>
    </details>
  );
}

function RegistryRow({ v, areaName, short }: { v: EventView; areaName: Map<string, string>; short: Map<string, string> }) {
  const src = v.event.resolution_source;
  return (
    <tr id={v.event.id} data-area={v.event.area}>
      <td>
        <strong>{v.event.title}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 10px", marginTop: 3 }}>
          <span className="ledger-event" style={{ margin: 0 }}>{v.event.id}</span>
          <details className="how" style={{ marginTop: 0 }}>
            <summary>Criterion</summary>
            <div>
              <p>{v.event.criterion}</p>
              <p>{src.url ? <SourceLink href={src.url}>{src.name}</SourceLink> : src.name}</p>
            </div>
          </details>
        </div>
      </td>
      <td>
        <Link href={`/areas/${v.event.area}`}>{areaName.get(v.event.area) ?? v.event.area}</Link>
      </td>
      <td>
        {v.outcome ? (
          <span style={{ whiteSpace: "nowrap" }}>
            <StateMark state={OUTCOME_STATE[v.outcome.state]} /> {OUTCOME_WORD[v.outcome.state]} · {outcomeYear(v.outcome)}
          </span>
        ) : (
          <span className="chip chip--hollow">Open</span>
        )}
        {v.rechecks.length ? <RecheckList rechecks={v.rechecks} /> : null}
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
  );
}

function Quarter({ q, rows, open }: { q: string; rows: TimelineEvent[]; open: boolean }) {
  return (
    <details className="how" open={open}>
      <summary>
        {quarterText(q)} · {plural(rows.length, "event")}
      </summary>
      {/* .how > div caps body text at 68ch; the table needs the full card width. */}
      <div style={{ maxWidth: "none" }}>
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
  // The area filter renders inside the last fragment, so an inactive filter leaves no empty fragment.
  const meta = [
    <span key="reg">
      {fmtInt(ds.registry.length)} <Term t="registry event">registry events</Term>
    </span>,
    plural(ds.timeline.length, "ground-truth event"),
    <span key="span">
      {span}
      <Suspense fallback={null}>
        <AreaFilter areas={ds.areas} />
      </Suspense>
    </span>,
  ];
  const registryHow = (
    <>
      A registry event is one proposition with one criterion and one resolution source, written before outcomes are looked up.{" "}
      <Link href={`${METHOD_PATH}#templates`}>Method › Event templates</Link>
    </>
  );

  return (
    <Shell current="/events" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="Events" version={ds.version} meta={meta} />
      <Grid2>
        <Card wide title="Registry" takeaway={registryTakeaway(views)} how={registryHow} src={`Registry · ${plural(views.length, "event")}`}>
          <table className="registry">
            <thead>
              <tr>
                <th>
                  <Term t="registry event">Event</Term>
                </th>
                <th>Area</th>
                <th>
                  <Term t="outcome" side="end">
                    Outcome
                  </Term>
                </th>
                <th>Claims</th>
              </tr>
            </thead>
            <tbody>
              {views.map((v) => (
                <RegistryRow key={v.event.id} v={v} areaName={areaName} short={short} />
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
