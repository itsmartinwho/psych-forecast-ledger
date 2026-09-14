// The "Waiting for data" card of a page: the charts among `keys` that are below their display minimum.
import { WaitingForData } from "@/components/card/Locked";
import { lockedRows, type LockContext, type LockKey } from "@/lib/content/display";

export interface WaitingCardProps {
  keys: readonly LockKey[];
  ctx: LockContext;
}

export function WaitingCard({ keys, ctx }: WaitingCardProps) {
  const rows = lockedRows(keys, ctx).map((s) => ({ name: s.name, term: s.term, now: s.now, need: s.need, unit: s.unit, href: s.href }));
  return <WaitingForData rows={rows} id="waiting" />;
}
