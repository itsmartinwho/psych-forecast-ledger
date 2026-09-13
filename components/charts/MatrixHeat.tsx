// Forecaster by area matrix (Lupi Editorial L16). Server component; the best cell is the one accent element.
import type { MatrixData } from "@/components/charts/types";
import { layoutMatrixHeat } from "@/components/charts/layout/MatrixHeat.layout";
import { Footnote } from "@/components/svg/Footnote";
import { FONT, FRAME, LADDER, PALETTE } from "@/lib/tokens";

export interface MatrixHeatProps { data: MatrixData; size: "half" | "wide" }

export function MatrixHeat({ data, size }: MatrixHeatProps) {
  const { w, h } = FRAME[size];
  const L = layoutMatrixHeat(data, w, h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`${data.valueLabel} by forecaster and area`} className="chart chart--matrix-heat" style={{ display: "block" }}>
      {L.colLabels.map((c) => (
        <text key={c.id} x={c.x} y={c.y} fontSize={7} fontWeight={600} letterSpacing="0.1em" fill={LADDER[3]} textAnchor="middle">
          {c.href ? <a href={c.href}>{c.label}</a> : c.label}
        </text>
      ))}
      {L.rowLabels.map((r) => (
        <text key={r.id} x={r.x} y={r.y} fontSize={FONT.rowLabel.size} fontWeight={FONT.rowLabel.weight} letterSpacing="0.08em" fill={LADDER[2]} textAnchor="end">
          {r.href ? <a href={r.href}>{r.label}</a> : r.label}
        </text>
      ))}
      {L.cells.map((c) => (
        <g key={`${c.row}-${c.col}`} className="pop" style={{ animationDelay: `${c.delay}ms` }}>
          <title>{c.title}</title>
          {c.value === null ? (
            <circle cx={c.x + c.size / 2} cy={c.y + c.size / 2} r={0.9} fill={LADDER[4]} />
          ) : (
            <>
              <rect x={c.x} y={c.y} width={c.size} height={c.size} rx={4} fill={c.fill} />
              <text x={c.x + c.size / 2} y={c.y + c.size / 2 + 3} fontSize={7.5} fontWeight={800} textAnchor="middle" fill={c.fill === LADDER[0] || c.fill === LADDER[1] ? PALETTE.paper : PALETTE.ink}>
                {c.value.toFixed(2).replace(/^0/, "")}
              </text>
            </>
          )}
          {c.n > 0 && c.value === null ? <text x={c.x + c.size / 2} y={c.y + c.size + 8} fontSize={6} fontWeight={600} textAnchor="middle" fill={LADDER[4]}>{`n ${c.n}`}</text> : null}
          {c.best ? <rect x={c.x - 2.5} y={c.y - 2.5} width={c.size + 5} height={c.size + 5} rx={5.5} fill="none" stroke={PALETTE.accent} strokeWidth={0.9} strokeDasharray="2 3" /> : null}
        </g>
      ))}
      {L.legend.map((l) => (
        <g key={l.label}>
          <rect x={l.x} y={l.y} width={9} height={9} rx={2} fill={l.fill} />
          <Footnote x={l.x + 13} y={l.y + 7.5} anchor="start">{l.label}</Footnote>
        </g>
      ))}
    </svg>
  );
}
