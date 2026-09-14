// Forecasters: one row per person with the numbers the leaderboard cannot show side by side:
// coverage, statements found and admitted, resolved events, score or progress, hit rate, pending.
import Link from "next/link";
import { Card } from "@/components/card/Card";
import { Term } from "@/components/ui/Term";
import { coveragePhrase } from "@/lib/content/site";
import type { Dataset } from "@/lib/data/schema";
import { f2, pct } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";
import type { ScoreSnapshot } from "@/lib/score";

export interface ForecastersCardProps {
  ds: Dataset;
  snap: ScoreSnapshot;
  /** Resolved events a person needs for a score. */
  minN: number;
}

export interface ForecasterRow {
  slug: string;
  name: string;
  coverage: string;
  found: number;
  admitted: number;
  resolved: number;
  score: string;
  hit: string;
  pending: number;
}

/** Pure: the table rows from the snapshot, in nav order (hero first). */
export function forecasterRows(ds: Dataset, snap: ScoreSnapshot, minN: number): ForecasterRow[] {
  const ordered = [...ds.forecasters.filter((f) => f.hero), ...ds.forecasters.filter((f) => !f.hero)];
  return ordered.map((f) => {
    const s = snap.forecasters[f.slug];
    const h = s.headline;
    return {
      slug: f.slug,
      name: f.name,
      coverage: coveragePhrase(f.coverage.tier),
      found: s.composition.found,
      admitted: s.composition.admitted,
      resolved: h.n_clusters,
      score: h.brier ? f2(h.brier.point) : `${fmtInt(h.n_clusters)} of ${fmtInt(minN)}`,
      hit: h.hit.rate ? pct(h.hit.rate.point) : "–",
      pending: h.n_pending + h.n_known_true,
    };
  });
}

/** One sentence: how many persons have a score. */
export function forecastersTakeaway(rows: ForecasterRow[], minN: number): string {
  const scored = rows.filter((r) => !r.score.includes(" of ")).length;
  if (scored === 0) return `No forecaster has ${fmtInt(minN)} resolved events yet.`;
  if (scored === rows.length) return `Every forecaster has a score.`;
  return `${fmtInt(scored)} of ${fmtInt(rows.length)} forecasters have a score; the rest show progress toward ${fmtInt(minN)} events.`;
}

export function ForecastersCard({ ds, snap, minN }: ForecastersCardProps) {
  const rows = forecasterRows(ds, snap, minN);
  return (
    <Card
      wide
      className="card--short"
      title="Forecasters"
      takeaway={forecastersTakeaway(rows, minN)}
      how={
        <>
          Found is every forward-looking statement in the person&rsquo;s corpus. <Term t="admitted">Admitted</Term> passed intake. <Term t="resolved">Resolved</Term> counts events, not statements: one event gives one vote however often it was predicted. A score appears at {fmtInt(minN)} resolved events. Coverage tiers are not compared: an ad hoc collection under-counts claims.
        </>
      }
      src={`Headline panel · ${fmtInt(rows.length)} forecasters`}
    >
      <div className="scroll-x">
        <table className="compare">
          <thead>
            <tr>
              <th>Forecaster</th>
              <th>
                <Term t="coverage tier" plain>
                  Coverage
                </Term>
              </th>
              <th>Found</th>
              <th>
                <Term t="admitted" plain>
                  Admitted
                </Term>
              </th>
              <th>
                <Term t="resolved" plain>
                  Resolved
                </Term>
              </th>
              <th>
                <Term t="Brier score" plain>
                  Score
                </Term>
              </th>
              <th>
                <Term t="hit rate" plain>
                  Hit rate
                </Term>
              </th>
              <th>
                <Term t="pending" plain>
                  Pending
                </Term>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td>
                  <Link href={`/forecasters/${r.slug}`}>{r.name}</Link>
                </td>
                <td>{r.coverage}</td>
                <td className="mono">{fmtInt(r.found)}</td>
                <td className="mono">{fmtInt(r.admitted)}</td>
                <td className="mono">{fmtInt(r.resolved)}</td>
                <td className="mono">{r.score}</td>
                <td className="mono">{r.hit}</td>
                <td className="mono">{fmtInt(r.pending)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
