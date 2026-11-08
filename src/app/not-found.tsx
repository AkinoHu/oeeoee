import type { Metadata } from "next";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { ButtonLink } from "@/components/ui/button";
import { StatusArt, StatusScreen } from "@/components/ui/status-screen";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("landing");
  return { title: t("errorPage.notFound.title") };
}

/** Branded 404 for unmatched URLs and notFound() anywhere in the app. */
export default async function NotFound() {
  const t = await getT("landing");
  return (
    <StatusScreen
      art={
        <StatusArt>
          <CompanionFace expression="curious" size={132} />
        </StatusArt>
      }
      eyebrow={t("errorPage.notFound.eyebrow")}
      title={t("errorPage.notFound.title")}
      body={t("errorPage.notFound.body")}
      actions={
        <>
          <ButtonLink href="/" size="lg">
            {t("errorPage.home")}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/#explore" size="lg" variant="ghost">
            <MapIcon className="size-4" aria-hidden />
            {t("closing.cta")}
          </ButtonLink>
        </>
      }
    />
  );
}
