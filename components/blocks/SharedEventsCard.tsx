// Shared events: the only direct comparison across persons. One row per event and forecaster, one line per item.
import Link from "next/link";
import { Card } from "@/components/card/Card";
import { StateMark } from "@/components/ui/StateMark";
import { Term } from "@/components/ui/Term";
import { chartState, registryById } from "@/lib/data/derive";
import type { Dataset } from "@/lib/data/schema";
import { f2, sharedTakeaway } from "@/lib/data/text";
import { fmtDate } from "@/lib/format";
import type { SharedEventRow } from "@/lib/score";

export const SHARED_TITLE = "Shared events";

export function SharedEventsCard({ ds, shared }: { ds: Dataset; shared: SharedEventRow[] }) {
  if (shared.length === 0) return null;
  const reg = registryById(ds);
  const short = new Map<string, string>(ds.forecasters.map((f) => [f.slug, f.short]));
  return (
    <Card wide className="card--short" title={SHARED_TITLE} takeaway={sharedTakeaway(shared)} how="The only direct comparison across persons: the same event, the same outcome." src="Registry">
      <div className="scroll-x prose">
        <table>
          <thead>
            <tr>
              <th>
                <Term t="registry event" plain>Event</Term>
              </th>
              <th>Forecaster</th>
              <th>
                <Term t="deadline" plain>Deadlines</Term>
              </th>
              <th>
                <Term t="lexicon" plain>P</Term>
              </th>
              <th>
                <Term t="outcome" plain>State</Term>
              </th>
              <th>
                <Term t="cluster Brier" plain>Cluster Brier</Term>
              </th>
            </tr>
          </thead>
          <tbody>
            {shared.flatMap((row) =>
              row.forecasters.map((f) => (
                <tr key={`${row.event_id}-${f.slug}`}>
                  <td>
                    <Link href={`/events#${row.event_id}`}>{reg.get(row.event_id)?.title ?? row.event_id}</Link>
                  </td>
                  <td>
                    <Link href={`/forecasters/${f.slug}`}>{short.get(f.slug) ?? f.slug}</Link>
                  </td>
                  <td className="mono">
                    {f.items.map((i, k) => (
                      <div key={k}>{fmtDate(i.deadline)}</div>
                    ))}
                  </td>
                  <td className="mono">
                    {f.items.map((i, k) => (
                      <div key={k}>{f2(i.p)}</div>
                    ))}
                  </td>
                  <td>
                    {f.items.map((i, k) => (
                      <div key={k}>
                        <StateMark state={chartState(i.state)} />
                      </div>
                    ))}
                  </td>
                  <td className="mono">{f2(f.cluster_brier)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
