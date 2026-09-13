// Site navigation: one uppercase row of links. The current page is set in ink; the rest stay muted.
import Link from "next/link";
import { PALETTE } from "@/lib/tokens";

export const NAV_LINKS = [
  { href: "/", label: "Ledger" },
  { href: "/forecasters/owen", label: "Owen Scott Muir" },
  { href: "/predictions", label: "Predictions" },
  { href: "/events", label: "Events" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
] as const;

export type NavHref = (typeof NAV_LINKS)[number]["href"];

export function Nav({ current }: { current?: string }) {
  return (
    <nav aria-label="Main" className="nav">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
        {NAV_LINKS.map((l) => {
          const active = current === l.href;
          return (
            <li key={l.href}>
              <Link href={l.href} className="eyebrow" aria-current={active ? "page" : undefined} style={active ? { color: PALETTE.ink } : undefined}>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
