// Leaderboard card: tick rows with the legend of spec 5.2, a computed takeaway and the method notes in
// "How to read". Used on the home page (headline panel) and on an area page (area-scoped rows).
import { Card } from "@/components/card/Card";
import type { LegendItem } from "@/components/card/Legend";
import { LeaderboardTickRows } from "@/components/charts/LeaderboardTickRows";
import type { LeaderboardData } from "@/components/charts/types";
import { ChartFrame } from "@/components/motion/ChartFrame";
import { Reveal } from "@/components/motion/Reveal";
import { Term } from "@/components/ui/Term";
import type { Thresholds } from "@/lib/data/schema";
import { f2, leaderboardTakeaway } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";

export const LEADERBOARD_TITLE = "Leaderboard";

export interface LeaderboardCardProps {
  data: LeaderboardData;
  /** Resolved events a row needs for a score. */
  minN: number;
  thresholds: Thresholds;
  /** Keep the rank order of the rows. */
  ranked?: boolean;
  /** Source · scope · n. */
  src: string;
  /** Whether any comparator is an ad hoc collection (tier C). */
  hasTierC?: boolean;
}

export function leaderboardLegend(minN: number, th: Thresholds, coinFlip: number): LegendItem[] {
  return [
    { glyph: "solid", label: "score" },
    { glyph: "whisker", label: "95% range" },
    { glyph: "whisker-dashed", label: `provisional (under ${fmtInt(th.provisional_below_clusters)} events)` },
    { glyph: "progress", label: `resolved events toward the ${fmtInt(minN)} a score needs` },
    { glyph: "hollow", label: "reference row" },
    { glyph: "dash", label: `coin flip ${f2(coinFlip)}` },
  ];
}

export function LeaderboardCard({ data, minN, thresholds, ranked, src, hasTierC }: LeaderboardCardProps) {
  const how = (
    <>
      Persons are ranked only when both have {fmtInt(minN)} or more <Term t="resolved">resolved</Term> events, share a <Term t="coverage tier">coverage tier</Term>, and their{" "}
      <Term t="bootstrap interval">intervals</Term> do not overlap; otherwise rows are alphabetical. The <Term t="evidence tier">evidence tier</Term> sets whether a row shows a score or a count.{" "}
      {hasTierC ? "Comparators are ad hoc collections (tier C): they get a score at the same minimum, but a search-built corpus under-counts claims, so they are never ranked against the full archive. " : null}
      The <Term t="reference row">reference rows</Term> are scored on the same events; the <Term t="coin flip">coin flip</Term> is the score of saying fifty-fifty every time.
    </>
  );
  return (
    <Card wide title={LEADERBOARD_TITLE} takeaway={leaderboardTakeaway(data.rows, minN)} legend={leaderboardLegend(minN, thresholds, data.coinFlip)} how={how} src={src}>
      <Reveal>
        <ChartFrame wide={<LeaderboardTickRows data={data} size="wide" ranked={ranked} minN={minN} />} half={<LeaderboardTickRows data={data} size="half" ranked={ranked} minN={minN} />} />
      </Reveal>
    </Card>
  );
}
