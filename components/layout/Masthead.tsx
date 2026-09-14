// Masthead: wordmark, subject with the tagline as a popover, and the main nav. One hairline under it.
// On hover or focus the tagline appears; on tap the subject link goes to /about, where the same sentence is the lede.
import Link from "next/link";
import { SITE_NAME, SUBJECT, TAGLINE } from "@/lib/content/site";
import { Nav, type NavHero } from "./Nav";

export interface MastheadProps {
  hero: NavHero;
  current?: string;
}

export function Masthead({ hero, current }: MastheadProps) {
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <Link href="/" className="wordmark">
          {SITE_NAME}
        </Link>
        <span className="masthead-dot" aria-hidden="true">
          ·
        </span>
        <span className="subject">
          <Link href="/about" className="subject-link">
            {SUBJECT}
          </Link>
          <span className="term-def" role="tooltip">
            {TAGLINE}
          </span>
        </span>
      </div>
      <Nav hero={hero} current={current} />
    </header>
  );
}
