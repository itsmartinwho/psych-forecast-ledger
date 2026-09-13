import type { MetadataRoute } from "next";
import { getDataset } from "@/lib/data/cached";

export default function sitemap(): MetadataRoute.Sitemap {
  const ds = getDataset();
  const base = "https://psych-forecast-ledger.vercel.app";
  return [
    { url: base }, { url: `${base}/methodology` }, { url: `${base}/predictions` }, { url: `${base}/events` }, { url: `${base}/about` },
    ...ds.forecasters.map((f) => ({ url: `${base}/forecasters/${f.slug}` })),
    ...ds.areas.map((a) => ({ url: `${base}/areas/${a.slug}` })),
    ...ds.statements.map((s) => ({ url: `${base}/predictions/${s.id}` })),
  ];
}
