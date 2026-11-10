import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConceptBoard } from "./ConceptBoard";

export function generateMetadata(): Metadata {
  if (process.env.NODE_ENV === "production") notFound();
  return { title: "Pot concepts (dev)", robots: { index: false, follow: false } };
}

/** Dev-only board comparing form concepts for the pot. */
export default function DevConceptsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ConceptBoard />;
}
