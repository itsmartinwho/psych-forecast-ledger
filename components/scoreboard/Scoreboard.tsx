// Scoreboard: one wide split card. The aside carries the score, its meta line, the verdict, four counts and
// a "More metrics" disclosure; the chart side is a tick donut of the person's admitted items.
// Server component. Every number comes from the score snapshot through lib/data/text.ts.
import type { ReactNode } from "react";
import { Card } from "@/components/card/Card";
import { TickDonut } from "@/components/charts/TickDonut";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Term } from "@/components/ui/Term";
import { statusDonut } from "@/lib/data/derive";
import type { Forecaster, Thresholds } from "@/lib/data/schema";
import { f2, metricNeed, pct, plural, scoreRange, scoreSub, scoreValue, scoreboardVerdict } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";
import type { ForecasterScores, PanelScores, StatusCounts } from "@/lib/score";

export interface ScoreboardProps {
  f: Forecaster;
  s: ForecasterScores;
  status: StatusCounts;
  /** Resolved events a score needs (thresholds.min_clusters_headline). */
  minN: number;
  thresholds: Thresholds;
}

export const SCOREBOARD_TITLE = "Scoreboard";
export const MORE_METRICS = "More metrics";

const signedPct = (v: number) => `${v > 0 ? "+" : ""}${pct(v)}`;
const panelValue = (p: PanelScores) => (p.brier ? f2(p.brier.point) : `${fmtInt(p.n_true)} of ${fmtInt(p.n_true + p.n_false)}`);

export interface MetricRow { key: string; label: ReactNode; value: string }

/** The "More metrics" rows, in order. Exported so a test can read the values. */
export function metricRows(s: ForecasterScores, minN: number, th: Thresholds): MetricRow[] {
  const h = s.headline;
  const hna = s.headline_non_affiliated;
  const murphy = s.calibration.murphy;
  return [
    { key: "hit", label: <Term t="hit rate">Hit rate</Term>, value: h.hit.rate ? `${pct(h.hit.rate.point)} (${fmtInt(h.hit.hits)} of ${fmtInt(h.hit.n)})` : metricNeed(minN, h.n_clusters, "events") },
    { key: "dated", label: <Term t="dated view">Dated view</Term>, value: `${panelValue(s.dated)} · ${plural(s.dated.n_clusters, "event")}` },
    { key: "undated", label: <Term t="undated panel">Undated panel</Term>, value: `${panelValue(s.undated)} · ${plural(s.undated.n_clusters, "event")} · ${fmtInt(th.undated_window_months)}-month window` },
    {
      key: "skill_base",
      label: (
        <>
          <Term t="skill score">Skill</Term> against <Term t="base rate">base rates</Term>
        </>
      ),
      value: h.skill_base.value ? signedPct(h.skill_base.value.point) : metricNeed(minN, h.skill_base.n_clusters, "paired events"),
    },
    { key: "skill_market", label: <Term t="market reference">Market skill</Term>, value: h.skill_market.value ? signedPct(h.skill_market.value.point) : metricNeed(th.market_min_clusters, h.skill_market.n_clusters, "events with a market quote") },
    { key: "loo", label: <Term t="leave-one-out change">Leave-one-out change</Term>, value: f2(h.loo_max_change) },
    { key: "affiliated", label: <Term t="affiliated">Affiliated share</Term>, value: pct(s.composition.affiliated_share) },
    { key: "non_affiliated", label: <Term t="non-affiliated block">Headline without affiliated items</Term>, value: hna ? (hna.brier ? f2(hna.brier.point) : metricNeed(th.affiliated_split_min_clusters, hna.n_clusters, "resolved events")) : "no affiliated items" },
    { key: "murphy", label: <Term t="Murphy decomposition">Murphy decomposition</Term>, value: murphy ? `reliability ${f2(murphy.reliability)} · resolution ${f2(murphy.resolution)} · uncertainty ${f2(murphy.uncertainty)}` : metricNeed(th.murphy_min_clusters, h.n_clusters, "resolved events") },
    { key: "scoreable", label: <Term t="scoreable share">Scoreable share</Term>, value: `${pct(s.composition.scoreable_share?.point, 1)} (${fmtInt(s.composition.dated)} dated of ${fmtInt(s.composition.sincere)} sincere)` },
  ];
}

export function Scoreboard({ f, s, status, minN, thresholds }: ScoreboardProps) {
  const h = s.headline;
  const donut = statusDonut(status, { includeNotAdmitted: false });
  const aside = (
    <>
      <div className="score-value">{scoreValue(h)}</div>
      <div className="score-sub">
        {h.brier ? (
          <>
            <Term t="Brier score">Brier</Term> · {scoreRange(h)} · <Term t="evidence tier">{h.label}</Term>
          </>
        ) : (
          scoreSub(h)
        )}
      </div>
      <p className="takeaway">{scoreboardVerdict(h, minN)}</p>
      <dl className="stat-list">
        <dt>
          <Term t="resolved">Resolved events</Term>
        </dt>
        <dd>{fmtInt(h.n_clusters)}</dd>
        <dt>
          <Term t="pending">Pending</Term>
        </dt>
        <dd>{fmtInt(h.n_pending)}</dd>
        <dt>
          <Term t="known true">Known true</Term>
        </dt>
        <dd>{fmtInt(h.n_known_true)}</dd>
        <dt>
          <Term t="void">Void</Term>
        </dt>
        <dd>{fmtInt(h.n_void)}</dd>
      </dl>
      <details className="how">
        <summary>{MORE_METRICS}</summary>
        <div>
          <dl className="metric-list">
            {metricRows(s, minN, thresholds).map((r) => (
              <div key={r.key} className="metric-row">
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </>
  );
  return (
    <Card wide title={SCOREBOARD_TITLE} split={{ aside }} src={`Headline panel · ${plural(h.n_items_total, "item")}`} id={`scoreboard-${f.slug}`}>
      <Reveal>
        <ChartFrame wide={<TickDonut data={donut} size="wide" />} half={<TickDonut data={donut} size="half" />} />
      </Reveal>
    </Card>
  );
}
