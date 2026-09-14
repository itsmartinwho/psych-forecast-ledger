"use client";
// The ?a={area} filter of the Events page. The page stays static: every row carries data-area, and this
// component hides the rows of other areas with one style rule and names the area in the dateline.
import { useSearchParams } from "next/navigation";

export interface AreaFilterProps {
  areas: { slug: string; short?: string; name: string }[];
}

export function AreaFilter({ areas }: AreaFilterProps) {
  const sp = useSearchParams();
  const a = sp.get("a");
  const area = a ? areas.find((x) => x.slug === a) : undefined;
  if (!area) return null;
  const css = `[data-area]:not([data-area="${area.slug}"]) { display: none; }`;
  return (
    <>
      <style>{css}</style>
      <span className="dateline-part">
        <span className="dateline-dot"> · </span>
        {area.short ?? area.name}
      </span>
    </>
  );
}
