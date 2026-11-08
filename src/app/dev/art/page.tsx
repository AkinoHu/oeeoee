import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtGallery } from "./ArtGallery";

export const metadata: Metadata = {
  title: "Art gallery (dev)",
  robots: { index: false, follow: false },
};

/** Dev-only review page for the pot, plant and face illustrations. */
export default function DevArtPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ArtGallery />;
}
