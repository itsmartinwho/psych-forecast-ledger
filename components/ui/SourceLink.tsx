// External source link. Opens in a new tab; the label defaults to the host name.
import type { ReactNode } from "react";

export interface SourceLinkProps {
  href: string;
  children?: ReactNode;
  className?: string;
}

/** "https://www.example.com/a/b" -> "example.com". A string that is not a URL comes back unchanged. */
export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function SourceLink({ href, children, className }: SourceLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? hostOf(href)}
    </a>
  );
}
