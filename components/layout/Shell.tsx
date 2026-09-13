// Page shell: nav, content, footer inside one 1200px column. Padding comes from .shell in globals.css (40px; 20px under 760px).
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export interface ShellProps {
  children: ReactNode;
  /** Pathname of the current page, to mark the nav link. */
  current?: string;
  dataVersion?: string;
  ruleVersion?: string;
}

export function Shell({ children, current, dataVersion, ruleVersion }: ShellProps) {
  return (
    <div className="shell" style={{ maxWidth: 1200 }}>
      <Nav current={current} />
      <main style={{ marginTop: 40 }}>{children}</main>
      <Footer dataVersion={dataVersion} ruleVersion={ruleVersion} />
    </div>
  );
}
