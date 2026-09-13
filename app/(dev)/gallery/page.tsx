// Development gallery: every registered chart in its wide and half frames. Not part of the production site.
import { notFound } from "next/navigation";
import { GALLERY } from "@/components/charts/gallery-registry";
import { Grid2 } from "@/components/layout/Grid2";
import { Shell } from "@/components/layout/Shell";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = { title: "Gallery" };

export default function GalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Shell current="/gallery">
      <h1 className="h2" style={{ fontSize: 19 }}>Chart gallery</h1>
      <p className="sub">
        {GALLERY.length} {GALLERY.length === 1 ? "entry" : "entries"} · wide 800x300 · half 400x320 · click a card to replay motion
      </p>
      {GALLERY.map((g, i) => (
        <section key={`${i}-${g.title}`} style={{ marginTop: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{g.title}</div>
          <Grid2>
            <div className="wide">
              <Reveal>{g.wide}</Reveal>
            </div>
            <div>
              <Reveal>{g.half}</Reveal>
            </div>
          </Grid2>
        </section>
      ))}
    </Shell>
  );
}
