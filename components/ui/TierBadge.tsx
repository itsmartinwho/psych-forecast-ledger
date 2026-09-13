// Evidence tier chip. T2 = full (30+ resolved events), T1 = provisional (10 to 29), T0 = counts only (under 10).
import type { Tier } from "@/components/charts/types";

export const TIER_LABEL: Record<Tier, string> = { T0: "Counts only", T1: "Provisional", T2: "Full" };

export interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const cls = ["chip", tier === "T2" ? null : "chip--hollow", className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={TIER_LABEL[tier]}>
      {TIER_LABEL[tier]}
    </span>
  );
}
