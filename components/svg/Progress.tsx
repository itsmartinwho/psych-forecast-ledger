// Progress ticks: one tick per unit of a fixed minimum, the first n in ink and the rest in the grid color.
// Pure SVG group; the caller places it. When the minimum is larger than the cap, one tick stands for several units.
import { LADDER, PALETTE } from "@/lib/tokens";

export interface ProgressProps {
  /** Units reached so far. */
  n: number;
  /** Units the chart or metric needs. */
  need: number;
  x?: number;
  y?: number;
  /** Distance between tick centres in px. */
  pitch?: number;
  height?: number;
  /** Most ticks drawn; above it one tick stands for ceil(need / cap) units. */
  cap?: number;
  className?: string;
}

export const PROGRESS_PITCH = 4.4;
export const PROGRESS_HEIGHT = 8;
export const PROGRESS_CAP = 30;
export const PROGRESS_STROKE = 1.2;
export const PROGRESS_STAGGER_MS = 10;

/** Ticks shown for a minimum: the minimum itself up to the cap. */
export function progressTicks(need: number, cap = PROGRESS_CAP): number {
  return Math.max(0, Math.min(Math.round(need), cap));
}

/** Width the tick row takes, so a layout can reserve the column. */
export function progressWidth(need: number, pitch = PROGRESS_PITCH, cap = PROGRESS_CAP): number {
  const shown = progressTicks(need, cap);
  return shown > 0 ? (shown - 1) * pitch + PROGRESS_STROKE : 0;
}

/** Ticks filled for n of need, on the shown ticks. */
export function progressFilled(n: number, need: number, cap = PROGRESS_CAP): number {
  const shown = progressTicks(need, cap);
  if (shown === 0 || need <= 0) return 0;
  return Math.max(0, Math.min(shown, Math.round((n / need) * shown)));
}

export function Progress({ n, need, x = 0, y = 0, pitch = PROGRESS_PITCH, height = PROGRESS_HEIGHT, cap = PROGRESS_CAP, className }: ProgressProps) {
  const shown = progressTicks(need, cap);
  const filled = progressFilled(n, need, cap);
  const ticks = Array.from({ length: shown }, (_, i) => i);
  const each = need > cap ? Math.ceil(need / cap) : 1;
  return (
    <g className={["progress", className].filter(Boolean).join(" ")} aria-label={`${n} of ${need}`}>
      {each > 1 ? <title>{`one tick = ${each}`}</title> : null}
      {ticks.map((i) => (
        <line
          key={i}
          x1={x + i * pitch}
          y1={y - height / 2}
          x2={x + i * pitch}
          y2={y + height / 2}
          stroke={i < filled ? LADDER[0] : PALETTE.grid}
          strokeWidth={PROGRESS_STROKE}
          className="fade"
          style={{ animationDelay: `${i * PROGRESS_STAGGER_MS}ms` }}
        />
      ))}
    </g>
  );
}
