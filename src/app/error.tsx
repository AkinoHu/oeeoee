"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { Button, buttonVariants } from "@/components/ui/button";
import { errorDigest, StatusArt, StatusScreen } from "@/components/ui/status-screen";
import { useT } from "@/i18n/client";

/**
 * Branded fallback for any uncaught error below the root layout (pages, the
 * site / console / admin layouts). Errors in the root layout itself are
 * handled by global-error.tsx.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT("landing");
  const tc = useT("common");
  const digest = errorDigest(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      art={
        <StatusArt>
          <CompanionFace expression="concerned" size={132} />
        </StatusArt>
      }
      eyebrow={t("errorPage.error.eyebrow")}
      title={t("errorPage.error.title")}
      body={tc("state.error")}
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RotateCcw className="size-4" aria-hidden />
            {t("errorPage.retry")}
          </Button>
          {/* A full load (not a soft navigation): it also recovers when the error is on "/" itself. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={buttonVariants({ size: "lg", variant: "ghost" })}>
            {t("errorPage.home")}
          </a>
        </>
      }
      footnote={digest ? t("errorPage.reference", { id: digest }) : undefined}
    />
  );
}
