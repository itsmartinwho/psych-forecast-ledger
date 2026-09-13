// Two equal columns with a 22px gap; a child with class "wide" spans both. One column under 900px.
import type { ReactNode } from "react";

export function Grid2({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["grid2", className].filter(Boolean).join(" ")}>{children}</div>;
}
