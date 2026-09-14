"use client";
// The ?a={area} filter of the Events page. The page stays static: every row carries data-area, and this
// component hides the rows of other areas with one style rule and adds "· {area}" to the dateline.
// It renders inside the last dateline fragment, so an inactive filter leaves nothing behind.
import { useSearchParams } from "next/navigation";

export interface AreaFilterProps {
  areas: { slug: string; short?: string; name: string }[];
}

/** The style rule that hides every data-area row of other areas. */
export function areaFilterCss(slug: string): string {
  return `[data-area]:not([data-area="${slug}"]) { display: none; }`;
}

export function AreaFilter({ areas }: AreaFilterProps) {
  const sp = useSearchParams();
  const a = sp.get("a");
  const area = a ? areas.find((x) => x.slug === a) : undefined;
  if (!area) return null;
  return (
    <>
      <style>{areaFilterCss(area.slug)}</style>
      <span className="dateline-dot"> · </span>
      {area.short ?? area.name}
    </>
  );
}
