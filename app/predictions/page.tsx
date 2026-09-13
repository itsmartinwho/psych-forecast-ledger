import type { Metadata } from "next";
import { Suspense } from "react";
import { Ledger } from "@/components/ledger/Ledger";
import { Shell } from "@/components/layout/Shell";
import { getDataset } from "@/lib/data/cached";
import { ledgerRows } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";

export const metadata: Metadata = { title: "Predictions" };

export default function PredictionsPage() {
  const ds = getDataset();
  const snap = getScores();
  const rows = ledgerRows(ds, snap);
  return (
    <Shell current="/predictions" dataVersion={ds.version.as_of} ruleVersion={ds.version.version}>
      <header style={{ marginBottom: 18 }}>
        <div className="eyebrow">the ledger</div>
        <h1 className="h2 big" style={{ marginTop: 8 }}>{rows.length} statements, every one with its quote, source and status.</h1>
        <p className="sub">Filters live in the address bar, so a view can be shared. Each row opens the full record.</p>
      </header>
      <Suspense fallback={<p className="sub">Loading the ledger…</p>}>
        <Ledger rows={rows} forecasters={ds.forecasters.map((f) => ({ slug: f.slug, name: f.name }))} areas={ds.areas.map((a) => ({ slug: a.slug, name: a.name }))} />
      </Suspense>
    </Shell>
  );
}
