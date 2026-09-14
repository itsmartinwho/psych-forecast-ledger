// Page header: H1 (a noun phrase) with the rules stamp on its baseline, a dateline of context fragments, an optional lede.
// The stamp is the only place on a page with the rules version and the as-of date.
import { Fragment, type ReactNode } from "react";
import { fmtDate } from "@/lib/format";

export interface PageHeaderProps {
  /** Noun phrase: a person, "Statements", an area name. */
  title: string;
  /** Dateline fragments, joined by " · ". Fragments may contain Term. */
  meta?: ReactNode[];
  /** One sentence in the body register. Areas, Method and About only. */
  lede?: ReactNode;
  /** Pages pass ds.version. */
  version: { version: string; as_of: string };
}

/** Stamp text in sentence case; CSS uppercases it. */
export function stampText(version: { version: string; as_of: string }): string {
  return `Rules ${version.version} · as of ${fmtDate(version.as_of)}`;
}

export function PageHeader({ title, meta, lede, version }: PageHeaderProps) {
  const parts = (meta ?? []).filter((m) => m !== null && m !== undefined && m !== "");
  return (
    <header className="page-head">
      <div className="page-head-row">
        <h1>{title}</h1>
        <p className="stamp">{stampText(version)}</p>
      </div>
      {parts.length ? (
        <p className="dateline">
          {parts.map((m, i) => (
            <Fragment key={i}>
              {i > 0 ? <span className="dateline-dot"> · </span> : null}
              <span className="dateline-part">{m}</span>
            </Fragment>
          ))}
        </p>
      ) : null}
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}
