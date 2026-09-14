// Admission funnel and "Not admitted by reason": two half cards of rung bars with one rung = N statements.
// Used on the home page (the census) and on a forecaster page (that person's statements).
import Link from "next/link";
import { Card } from "@/components/card/Card";
import type { LegendItem } from "@/components/card/Legend";
import { AreaRungBars } from "@/components/charts/AreaRungBars";
import { Term } from "@/components/ui/Term";
import { admissionFunnel, reasonRungBars } from "@/lib/data/derive";
import type { Dataset } from "@/lib/data/schema";
import { admissionTakeaway, reasonsTakeaway } from "@/lib/data/text";
import { fmtInt } from "@/lib/format";
import type { ScoreSnapshot } from "@/lib/score";

export const ADMISSION_TITLE = "Admission";
export const REASONS_TITLE = "Not admitted by reason";

/** The one-item legend of a rung-bar card: what one rung stands for. */
export function rungLegend(rungUnit: number, unit: string): LegendItem[] {
  return [{ glyph: "tick", label: `${fmtInt(rungUnit)} ${unit}` }];
}

export interface AdmissionCardsProps {
  ds: Dataset;
  snap: ScoreSnapshot;
  /** Narrow to one forecaster. */
  slug?: string;
  /** The person's short name for the src line; the census reads "all forecasters". */
  scope: string;
}

export function AdmissionCards({ ds, snap, slug, scope }: AdmissionCardsProps) {
  const funnel = admissionFunnel(ds, snap, slug);
  const reasons = reasonRungBars(ds, slug);
  const admitted = funnel.groups.find((g) => g.id === "admitted")?.count ?? 0;
  const found = funnel.groups.find((g) => g.id === "found")?.count ?? 0;
  const funnelHow = (
    <>
      Found is every forward-looking statement in the corpus. Sincere removes satire and third-party claims. <Term t="admitted">Admitted</Term> passed intake under the rules. <Term t="resolved">Resolved</Term> has an{" "}
      <Term t="outcome">outcome</Term>. <Link href="/methodology#exclusions">Method › Reason codes</Link>
      {slug ? (
        <>
          {" · "}
          <Link href={`/predictions?scope=all&f=${slug}`}>Every statement by {scope} ›</Link>
        </>
      ) : null}
    </>
  );
  const reasonsHow = (
    <>
      A statement that is <Term t="not admitted">not admitted</Term> keeps its quote and a <Term t="reason code">reason code</Term>; it is counted, never scored. An <Term t="admitted">admitted</Term> statement becomes an{" "}
      <Term t="item">item</Term>. Each rung links to the statements behind it.
    </>
  );
  return (
    <>
      <Card title={ADMISSION_TITLE} takeaway={admissionTakeaway(funnel)} n={`${fmtInt(admitted)} admitted`} legend={rungLegend(funnel.rungUnit, "statements")} how={funnelHow} src={`Every statement · ${scope}`}>
        <AreaRungBars data={funnel} size="half" />
      </Card>
      <Card title={REASONS_TITLE} takeaway={reasonsTakeaway(reasons.groups)} n={`${fmtInt(found - admitted)} not admitted`} legend={rungLegend(reasons.rungUnit, "statements")} how={reasonsHow} src="Not admitted · reason codes">
        <AreaRungBars data={reasons} size="half" />
      </Card>
    </>
  );
}
