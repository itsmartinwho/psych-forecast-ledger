import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/card/Card";
import { Shell } from "@/components/layout/Shell";
import { SourceLink } from "@/components/ui/SourceLink";
import { StateMark } from "@/components/ui/StateMark";
import { getDataset } from "@/lib/data/cached";
import { chartState, eventViews } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { plural } from "@/lib/data/text";
import { quarterOf } from "@/lib/dates";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  const ds = getDataset();
  const snap = getScores();
  const views = eventViews(ds, snap).sort((a, b) => ((a.outcome?.date ?? "9999") < (b.outcome?.date ?? "9999") ? -1 : 1));
  const byQuarter = new Map<string, typeof ds.timeline>();
  for (const t of ds.timeline) (byQuarter.get(quarterOf(t.date)) ?? byQuarter.set(quarterOf(t.date), []).get(quarterOf(t.date))!).push(t);
  const quarters = [...byQuarter.keys()].sort().reverse();
  return (
    <Shell current="/events" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 22 }}>
        <div className="eyebrow">registry and ground truth</div>
        <h1 className="h2 big" style={{ marginTop: 8 }}>{plural(ds.registry.length, "registry event")} resolve every claim; {plural(ds.timeline.length, "dated event")} are the record.</h1>
        <p className="sub" style={{ maxWidth: "70ch" }}>A registry event is one proposition with one criterion and one resolution source, written before outcomes are looked up. The timeline is the sourced ground truth the resolver cites.</p>
      </header>
      <Card wide title="Registry: the propositions the ledger scores." sub="state · date it became true · items citing it" src="Event registry">
        <div className="prose scroll-x">
          <table>
            <thead><tr><th>id</th><th>event</th><th>area</th><th>outcome</th><th>items</th></tr></thead>
            <tbody>
              {views.map((v) => (
                <tr key={v.event.id} id={v.event.id}>
                  <td className="mono">{v.event.id}</td>
                  <td><strong>{v.event.title}</strong><br /><span className="note">{v.event.criterion}</span><br /><span className="src">{v.event.resolution_source.url ? <SourceLink href={v.event.resolution_source.url}>{v.event.resolution_source.name}</SourceLink> : v.event.resolution_source.name}</span></td>
                  <td><Link href={`/areas/${v.event.area}`}>{ds.areas.find((a) => a.slug === v.event.area)?.name}</Link></td>
                  <td>{v.outcome ? <span>{v.outcome.state === "occurred" ? <StateMark state="true" /> : v.outcome.state === "not_occurred" ? <StateMark state="false" /> : <StateMark state="void" />} {v.outcome.state}{v.outcome.date ? ` · ${v.outcome.date}` : ` · as of ${v.outcome.checked_through}`}{v.rechecks.length ? ` · recheck ${v.rechecks.map((r) => r.verdict).join(", ")}` : ""}</span> : <span className="chip chip--hollow">unresolved</span>}</td>
                  <td>{v.statements.map((s) => <Link key={s.id} href={`/predictions/${s.id}`} style={{ marginRight: 8 }}><StateMark state={chartState(v.items.find((i) => i.statement_ids.includes(s.id))?.state ?? "pending")} /> {s.forecaster}</Link>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ height: 22 }} />
      <Card wide title="Ground truth by quarter." sub="dated, sourced events used as evidence · newest first" src="Timeline · 2021 to 2026">
        <div className="prose">
          {quarters.map((q) => (
            <section key={q}>
              <h3>{q}</h3>
              <ul>{byQuarter.get(q)!.map((t) => <li key={t.id} id={t.id}><span className="mono">{t.date}</span> · <strong>{t.entity}</strong>: {t.event} <SourceLink href={t.source_url}>{t.source_org}</SourceLink>{t.confidence !== "high" ? <span className="chip chip--hollow" style={{ marginLeft: 6 }}>{t.confidence}</span> : null}</li>)}</ul>
            </section>
          ))}
        </div>
      </Card>
    </Shell>
  );
}
