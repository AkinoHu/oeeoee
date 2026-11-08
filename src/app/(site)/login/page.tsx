import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/site/Logo";
import { Card } from "@/components/ui/primitives";
import { getT } from "@/i18n/server";
import { devPasswordLoginEnabled } from "@/lib/auth";
import { appUrl, features } from "@/lib/env";
import { getUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import { safeNext } from "./safe-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("common");
  return { title: t("nav.signIn") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const oauthError = typeof params.error === "string" && params.error.length > 0;
  // Sign-in only works on the configured origin (OAuth callback, cookies, CSRF
  // origin check), so send visitors of e.g. *.up.railway.app there first.
  const canonical = new URL(appUrl());
  const host = (await headers()).get("host");
  if (host && host !== canonical.host) redirect(`${canonical.origin}/login?next=${encodeURIComponent(next)}`);
  if (await getUser()) redirect(next);
  const t = await getT("auth");

  return (
    <section className="bg-grid relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(155_227_74/0.12),transparent_60%)]" />
      <Card className="relative w-full max-w-md p-8">
        <LogoMark className="mb-6 h-12 w-12" />
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
        <LoginForm next={next} google={features.google} devLogin={devPasswordLoginEnabled()} oauthError={oauthError} />
        <p className="mt-6 text-xs text-faint">{t("chinaNote")}</p>
        <p className="mt-2 text-xs text-faint">{t("terms")}</p>
      </Card>
    </section>
  );
}
