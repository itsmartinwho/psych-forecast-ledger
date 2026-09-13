import Link from "next/link";
import { Shell } from "@/components/layout/Shell";

export default function NotFound() {
  return (
    <Shell>
      <h1 className="h2 big">No such page.</h1>
      <p className="sub"><Link href="/">Back to the ledger</Link></p>
    </Shell>
  );
}
