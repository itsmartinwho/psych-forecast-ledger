// A floor of one 0.6px tick per unit (one day, one month, one prediction) so density is countable.
import { PALETTE, STROKE } from "@/lib/tokens";

export interface BarcodeFloorProps {
  /** x position of every unit tick, already mapped through the scale. */
  xs: number[];
  y: number;
  height?: number;
  color?: string;
  /** Every n-th tick is drawn 1.5x tall in the muted tone, as a counting aid. */
  major?: number;
  majorColor?: string;
}

export function BarcodeFloor({ xs, y, height = 6, color = PALETTE.faint, major, majorColor = PALETTE.muted }: BarcodeFloorProps) {
  return (
    <g className="barcode-floor">
      {xs.map((x, i) => {
        const isMajor = major !== undefined && major > 0 && i % major === 0;
        const h = isMajor ? height * 1.5 : height;
        return <line key={i} x1={x} x2={x} y1={y} y2={y - h} stroke={isMajor ? majorColor : color} strokeWidth={STROKE.hairline} />;
      })}
    </g>
  );
}
