// Chart input contracts. lib/data/derive.ts maps score snapshots to these shapes; charts never read the dataset directly.
export type Tier = "T0" | "T1" | "T2";
export type State = "true" | "false" | "pending" | "void";

export interface LeaderboardRowDatum { id: string; label: string; value: number | null; lo?: number; hi?: number; n: number; tier: Tier; hero?: boolean; reference?: boolean; note?: string; href?: string }
export interface LeaderboardData { rows: LeaderboardRowDatum[]; coinFlip: number; domain: [number, number]; valueLabel: string }

/** merged lists the source bins when the deriver folded sparse bins into one; the chart then labels the dot "all bins". */
export interface CalibrationBinDatum { bin: string; forecast: number; observed: number | null; n: number; merged?: string[] }
export interface CalibrationData { bins: CalibrationBinDatum[]; label: string }

export interface SeriesPoint { period: string; value: number | null; n: number }
export interface BrierSeriesData { series: { id: string; label: string; hero?: boolean; points: SeriesPoint[] }[]; coinFlip: number }

export interface RungGroup { id: string; label: string; count: number; value?: number | null; n?: number; hero?: boolean; faint?: boolean; href?: string }
/** unit is the noun for one record ("statements"); rungUnit is how many records one rung stands for (default 1). */
export interface RungBarsData { groups: RungGroup[]; unit: string; valueLabel?: string; rungUnit?: number }

export interface AlmanacRow { id: string; date: string; deadline: string; resolved?: string; state: State; p: number; label: string; href?: string; hero?: boolean; affiliated?: boolean }
export interface AlmanacData { rows: AlmanacRow[]; start: string; end: string; today: string }

export interface LaneEvent { date: string; label: string; kind?: string; href?: string }
export interface Lane { id: string; label: string; start: string; deadline: string; resolved?: string; state: State; restatements?: { date: string; p: number }[]; href?: string; hero?: boolean }
export interface TrendLanesData { lanes: Lane[]; events: LaneEvent[]; start: string; end: string; today: string }

export interface DonutSegment { id: string; label: string; count: number; tone: "ink" | "gray-2" | "gray-3" | "muted" | "faint" | "gray-7" | "accent" }
export interface TickDonutData { segments: DonutSegment[]; total: number; centerLabel: string; unit: string }

export interface BoldnessPoint { id: string; label: string; x: number; y: number; n: number; hero?: boolean; items?: { x: number; y: number }[] }
export interface BoldnessData { points: BoldnessPoint[]; xLabel: string; yLabel: string; yRule?: number; xDomain?: [number, number]; yDomain?: [number, number] }

export interface HistogramBin { lo: number; hi: number; count: number; label?: string }
export interface HistogramData { bins: HistogramBin[]; median?: number; unit: string; zeroLabel?: string; rungUnit?: string }

export interface MatrixCell { row: string; col: string; value: number | null; n: number; best?: boolean }
export interface MatrixData { rows: { id: string; label: string; href?: string }[]; cols: { id: string; label: string; short?: string; href?: string }[]; cells: MatrixCell[]; steps: number; valueLabel: string }

export interface HorizonPoint { statementDate: string; predictedDate: string; p: number; label?: string; href?: string }
export interface RecedingHorizonData { points: HorizonPoint[]; actualDate?: string; today: string; label: string }
