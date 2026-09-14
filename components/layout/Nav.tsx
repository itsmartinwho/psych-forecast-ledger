// Site navigation in the meta register: Overview, one link per forecaster, then a "More" menu with the
// reference pages (Statements, Events, Method, About). The current item is set in ink by CSS.
// The menu opens on hover or focus (CSS only); on touch a tap focuses the label and opens it.
import Link from "next/link";

export interface NavHero {
  slug: string;
  name: string;
}

export interface NavLink {
  href: string;
  label: string;
}

/** The pages under "More", in order. Hrefs are fixed. */
export const MORE_LINKS: readonly NavLink[] = [
  { href: "/predictions", label: "Statements" },
  { href: "/events", label: "Events" },
  { href: "/methodology", label: "Method" },
  { href: "/about", label: "About" },
];

export const MORE_LABEL = "More";

/** The direct links in order: Overview, then every forecaster by full name. */
export function navLinks(forecasters: NavHero[]): NavLink[] {
  return [{ href: "/", label: "Overview" }, ...forecasters.map((f) => ({ href: `/forecasters/${f.slug}`, label: f.name }))];
}

/** First path segment: "/forecasters/owen" -> "forecasters"; "/" -> "". */
export function firstSegment(pathname: string): string {
  return pathname.split("?")[0].split("#")[0].split("/")[1] ?? "";
}

/** A forecaster link is current only when the slug matches; other links match by first segment. */
export function isCurrent(href: string, current: string): boolean {
  if (href.startsWith("/forecasters/")) return current.split("?")[0].split("#")[0] === href;
  return firstSegment(href) === firstSegment(current);
}

export interface NavProps {
  /** The forecasters in display order; the hero first. */
  forecasters: NavHero[];
  /** Pathname of the current page. A record page marks its section. */
  current?: string;
}

export function Nav({ forecasters, current }: NavProps) {
  const cur = current === undefined ? null : current;
  const moreActive = cur !== null && MORE_LINKS.some((l) => isCurrent(l.href, cur));
  return (
    <nav aria-label="Main" className="nav">
      <ul>
        {navLinks(forecasters).map((l) => {
          const active = cur !== null && isCurrent(l.href, cur);
          return (
            <li key={l.href}>
              <Link href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          );
        })}
        <li className="nav-more" tabIndex={0}>
          <span className="nav-link nav-more-label" aria-haspopup="true" aria-current={moreActive ? "page" : undefined}>
            {MORE_LABEL} <span aria-hidden="true">▾</span>
          </span>
          <ul className="nav-more-menu">
            {MORE_LINKS.map((l) => {
              const active = cur !== null && isCurrent(l.href, cur);
              return (
                <li key={l.href}>
                  <Link href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
