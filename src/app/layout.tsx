import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { CartProvider } from "@/components/cart/CartProvider";
import { I18nProvider } from "@/i18n/client";
import { getLocale, translator } from "@/i18n/server";
import { appUrl } from "@/lib/env";
import "@fontsource-variable/nunito";
import "./globals.css";

const OG_LOCALE = { en: "en_US", zh: "zh_CN", ja: "ja_JP" } as const;

/** Site-wide defaults in the visitor's language; pages override the title via the template. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = translator("landing", locale);
  return {
    title: { default: t("meta.title"), template: "%s · oeeoee" },
    description: t("meta.description"),
    metadataBase: new URL(appUrl()),
    applicationName: "oeeoee",
    openGraph: { type: "website", siteName: "oeeoee", locale: OG_LOCALE[locale] },
    twitter: { card: "summary" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  colorScheme: "light",
};

const HTML_LANG = { en: "en", zh: "zh-CN", ja: "ja" } as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]} className={`${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>
          <CartProvider>{children}</CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
