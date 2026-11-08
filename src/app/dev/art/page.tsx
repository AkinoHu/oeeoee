import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtGallery } from "./ArtGallery";

// A function (not a static export) so production 404s don't carry the dev page's title.
export function generateMetadata(): Metadata {
  if (process.env.NODE_ENV === "production") notFound();
  return { title: "Art gallery (dev)", robots: { index: false, follow: false } };
}

/** Dev-only review page for the pot, plant and face illustrations. */
export default function DevArtPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ArtGallery />;
}
