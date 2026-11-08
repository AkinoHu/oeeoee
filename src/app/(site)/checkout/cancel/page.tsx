import { ArrowRight, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { getCountry } from "@/data";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("store");
  return { title: t("cancel.title"), robots: { index: false } };
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Stripe's cancel_url. Sends the shopper straight back to the studio they came
 * from (same pot / finish / plant) with a gentle notice; the cart is untouched.
 */
export default async function CheckoutCancelPage({ searchParams }: PageProps<"/checkout/cancel">) {
  const query = await searchParams;
  const country = getCountry(one(query.country));
  if (country) {
    const params = new URLSearchParams({ canceled: "1" });
    for (const key of ["size", "finish", "plant"] as const) {
      const v = one(query[key]);
      if (v && /^[\w-]{1,64}$/.test(v)) params.set(key, v);
    }
    redirect(`/c/${country.code.toLowerCase()}?${params.toString()}`);
  }

  const t = await getT("store");
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/15 text-sky">
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{t("cancel.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("cancel.body")}</p>
        <ButtonLink href="/#explore" className="mt-6">
          {t("cancel.cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </Card>
    </section>
  );
}
