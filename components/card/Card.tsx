// Card anatomy: h2 (a conclusion sentence), .sub (legend · unit · range), the chart, .src (uppercase source line).
// Cards share the page color: no border, no shadow; whitespace separates them.
import type { ReactNode } from "react";
import { CardSplit } from "./CardSplit";

export interface CardProps {
  title: string;
  sub?: string;
  src?: string;
  /** Spans both columns of .grid2 and uses the 800x300 frame. */
  wide?: boolean;
  /** Ink background. At most one dark card in four. */
  dark?: boolean;
  /** 19px title for a big chart. */
  big?: boolean;
  /** Text column beside the chart (wide cards). Title and sub move into that column. */
  split?: { note?: string; legend?: ReactNode };
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Card({ title, sub, src, wide, dark, big, split, id, className, children }: CardProps) {
  const cls = ["card", wide ? "wide" : null, dark ? "card--dark" : null, className].filter(Boolean).join(" ");
  const head = (
    <>
      <h2 className={big ? "big" : undefined}>{title}</h2>
      {sub ? <p className="sub">{sub}</p> : null}
    </>
  );
  return (
    <section className={cls} id={id}>
      {split ? (
        <CardSplit head={head} note={split.note} legend={split.legend}>
          {children}
        </CardSplit>
      ) : (
        <>
          {head}
          {children}
        </>
      )}
      {src ? <p className="src">{src}</p> : null}
    </section>
  );
}
