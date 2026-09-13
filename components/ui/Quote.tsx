// A forecaster's words, verbatim, with the date and the source. The quote is the record; nothing is paraphrased here.
import { DateText } from "./DateText";
import { SourceLink } from "./SourceLink";

export interface QuoteProps {
  children: string;
  date?: string;
  source?: { url: string; title?: string };
  className?: string;
}

export function Quote({ children, date, source, className }: QuoteProps) {
  return (
    <figure className={["quote", className].filter(Boolean).join(" ")} style={{ margin: 0 }}>
      <blockquote style={{ margin: 0, fontSize: 13, lineHeight: 1.55, maxWidth: "60ch" }}>&ldquo;{children}&rdquo;</blockquote>
      {date || source ? (
        <figcaption className="src" style={{ marginTop: 6 }}>
          {date ? <DateText iso={date} /> : null}
          {date && source ? " · " : null}
          {source ? <SourceLink href={source.url}>{source.title}</SourceLink> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
