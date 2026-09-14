import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shell } from "@/components/layout/Shell";
import { getDataset } from "@/lib/data/cached";

export default function NotFound() {
  const ds = getDataset();
  const hero = ds.forecasters.find((f) => f.hero) ?? ds.forecasters[0];
  return (
    <Shell hero={{ slug: hero.slug, name: hero.name }}>
      <PageHeader title="No such page" version={ds.version} lede={<Link href="/">Back to the overview</Link>} />
    </Shell>
  );
}
