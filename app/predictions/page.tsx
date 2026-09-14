// Statements: every statement in the census with its quote, source and state; filters live in the address bar.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { Ledger } from "@/components/ledger/Ledger";
import { getDataset } from "@/lib/data/cached";
import { ledgerRows } from "@/lib/data/derive";
import { getScores } from "@/lib/data/scores";
import { plural } from "@/lib/data/text";
import { yearOf } from "@/lib/dates";

export const metadata: Metadata = { title: "Statements" };

export default function PredictionsPage() {
  const ds = getDataset();
  const snap = getScores();
  const hero = ds.forecasters.find((x) => x.hero) ?? ds.forecasters[0];
  const rows = ledgerRows(ds, snap);
  const years = rows.map((r) => yearOf(r.d));
  const span = years.length ? `${Math.min(...years)} to ${Math.max(...years)}` : "";
  return (
    <Shell current="/predictions" hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="Statements" version={ds.version} meta={[plural(rows.length, "statement"), plural(ds.forecasters.length, "forecaster"), span]} />
      <Suspense fallback={<p className="count-line">Loading the ledger…</p>}>
        <Ledger
          rows={rows}
          forecasters={ds.forecasters.map((f) => ({ slug: f.slug, short: f.short }))}
          areas={ds.areas.map((a) => ({ slug: a.slug, short: a.short ?? a.name }))}
          reasons={ds.reason_codes.not_admitted.map((r) => ({ code: r.code, label: r.label }))}
          undatedMonths={ds.thresholds.undated_window_months}
        />
      </Suspense>
    </Shell>
  );
}
