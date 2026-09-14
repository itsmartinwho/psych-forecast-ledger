// Site navigation: one uppercase row of links in the meta register. The current item is set in ink by CSS.
// Item 2 is the hero forecaster, read from the dataset; the links are a function of that hero.
import Link from "next/link";

export interface NavHero {
  slug: string;
  name: string;
}

export interface NavLink {
  href: string;
  label: string;
}

/** The six links in order. Hrefs are fixed; the second label is the hero's full name. */
export function navLinks(hero: NavHero): NavLink[] {
  return [
    { href: "/", label: "Overview" },
    { href: `/forecasters/${hero.slug}`, label: hero.name },
    { href: "/predictions", label: "Statements" },
    { href: "/events", label: "Events" },
    { href: "/methodology", label: "Method" },
    { href: "/about", label: "About" },
  ];
}

/** First path segment: "/forecasters/owen" -> "forecasters"; "/" -> "". */
export function firstSegment(pathname: string): string {
  return pathname.split("?")[0].split("#")[0].split("/")[1] ?? "";
}

export interface NavProps {
  hero: NavHero;
  /** Pathname of the current page. Matched by first path segment, so a record page marks its section. */
  current?: string;
}

export function Nav({ hero, current }: NavProps) {
  const seg = current === undefined ? null : firstSegment(current);
  return (
    <nav aria-label="Main" className="nav">
      <ul>
        {navLinks(hero).map((l) => {
          const active = seg !== null && firstSegment(l.href) === seg;
          return (
            <li key={l.href}>
              <Link href={l.href} className="nav-link" aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
