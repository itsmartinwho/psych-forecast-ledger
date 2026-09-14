// Footer: one meta-register row of six links. No version and no date here; the page stamp carries those.
import Link from "next/link";
import { METHOD_PATH, REPO_URL, SITE_NAME } from "@/lib/content/site";

export const FOOTER_LINKS = [
  { href: "/", label: SITE_NAME },
  { href: METHOD_PATH, label: "Method" },
  { href: `${METHOD_PATH}#glossary`, label: "Glossary" },
  { href: `${METHOD_PATH}#corrections`, label: "Corrections" },
  { href: "/about", label: "About" },
  { href: REPO_URL, label: "Source data" },
] as const;

export function Footer() {
  return (
    <footer className="footer">
      {FOOTER_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? <span className="footer-dot"> · </span> : null}
          {l.href.startsWith("http") ? (
            <a href={l.href} rel="noopener noreferrer">
              {l.label}
            </a>
          ) : (
            <Link href={l.href}>{l.label}</Link>
          )}
        </span>
      ))}
    </footer>
  );
}
