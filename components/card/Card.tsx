// Card anatomy, in order: head (h2 noun phrase, optional count), takeaway (one computed sentence), legend (glyphs),
// chart, "How to read" disclosure, src (source · scope · n). Cards share the page color: no border, no shadow.
import type { ReactNode } from "react";
import { CardSplit } from "./CardSplit";
import { HowToRead } from "./HowToRead";
import { Legend, type LegendItem } from "./Legend";

export interface CardProps {
  /** Noun phrase; a chart type is allowed. */
  title: string;
  /** One sentence from the data, computed in lib/data/text.ts. */
  takeaway?: string;
  /** Right-aligned count in the head row, e.g. "13 events" (uppercased by CSS). */
  n?: string;
  /** Glyph legend; only when the chart draws two or more mark kinds. */
  legend?: LegendItem[];
  /** "How to read" body. */
  how?: ReactNode;
  /** Source · scope · n. Never the version or the date. */
  src?: string;
  /** Spans both columns of .grid2 and uses the 800x300 frame. */
  wide?: boolean;
  /** Ink background. At most one dark card in four. */
  dark?: boolean;
  id?: string;
  className?: string;
  /** Aside column (250px) left of the chart; used by the Scoreboard. */
  split?: { aside: ReactNode };
  children: ReactNode;
}

export function Card({ title, takeaway, n, legend, how, src, wide, dark, id, className, split, children }: CardProps) {
  const cls = ["card", wide ? "wide" : null, dark ? "card--dark" : null, className].filter(Boolean).join(" ");
  const head = (
    <>
      <div className="card-head">
        <h2>{title}</h2>
        {n ? <span className="card-n">{n}</span> : null}
      </div>
      {takeaway ? <p className="takeaway">{takeaway}</p> : null}
    </>
  );
  const chart = (
    <>
      {legend && legend.length ? <Legend items={legend} /> : null}
      <div className="chart">{children}</div>
    </>
  );
  return (
    <section className={cls} id={id}>
      {split ? (
        <CardSplit head={head} aside={split.aside}>
          {chart}
        </CardSplit>
      ) : (
        <>
          {head}
          {chart}
        </>
      )}
      {how ? <HowToRead>{how}</HowToRead> : null}
      {src ? <p className="src">{src}</p> : null}
    </section>
  );
}
