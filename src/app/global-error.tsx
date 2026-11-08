"use client";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { RotateCcw } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { Button, buttonVariants } from "@/components/ui/button";
import { errorDigest, StatusArt, StatusScreen } from "@/components/ui/status-screen";
import { I18nProvider, useT } from "@/i18n/client";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "@/i18n/config";
import "./globals.css";

const HTML_LANG = { en: "en", zh: "zh-CN", ja: "ja" } as const;
const noopSubscribe = () => () => {};
const serverLocale = (): Locale => "en";

/** The root layout (which resolves the locale) is what failed, so read the cookie / browser languages here. */
function browserLocale(): Locale {
  const fromCookie = document.cookie
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === LOCALE_COOKIE)?.[1];
  if (isLocale(fromCookie)) return fromCookie;
  return matchLocale(navigator.languages?.join(",") || navigator.language);
}

/**
 * Last-resort error UI: replaces the root layout when it (or a provider in it)
 * throws, so it renders its own <html>/<body> and pulls in the global styles.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const locale = useSyncExternalStore(noopSubscribe, browserLocale, serverLocale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={HTML_LANG[locale]} className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <GlobalErrorScreen error={error} retry={retry} />
        </I18nProvider>
      </body>
    </html>
  );
}

function GlobalErrorScreen({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT("landing");
  const tc = useT("common");
  const digest = errorDigest(error);
  return (
    <>
      <title>{`${t("errorPage.error.title")} · oeeoee`}</title>
      <StatusScreen
        art={
          <StatusArt>
            <CompanionFace expression="sad" size={132} />
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
            {/* Full load: the root layout is what failed, so rebuild the app shell from scratch. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className={buttonVariants({ size: "lg", variant: "ghost" })}>
              {t("errorPage.home")}
            </a>
          </>
        }
        footnote={digest ? t("errorPage.reference", { id: digest }) : undefined}
      />
    </>
  );
}
