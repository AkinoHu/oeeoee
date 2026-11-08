import { ArrowRight, Bell, ChevronRight, Clock, Coins, Handshake, Package, Sprout, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveStudio } from "@/components/store/studio";
import { StoreExperience } from "@/components/store/StoreExperience";
import { WaitlistForm } from "@/components/store/WaitlistForm";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container } from "@/components/ui/primitives";
import { getCountry, getRegion, lt, type Country } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { getUser } from "@/lib/session";
import { cn } from "@/lib/utils";

type SearchParams = Awaited<PageProps<"/c/[country]">["searchParams"]>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function lookup(code: string): Country | undefined {
  return /^[a-z]{2}$/i.test(code) ? getCountry(code) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/c/[country]">): Promise<Metadata> {
  const { country: code } = await params;
  const country = lookup(code);
  if (!country) return {};
  const [t, locale] = await Promise.all([getT("store"), getLocale()]);
  const name = lt(country.name, locale);
  return {
    title: t("meta.title", { country: name }),
    description: t(`meta.description.${country.salesMode}`, { country: name }),
  };
}

export default async function CountryStorePage({ params, searchParams }: PageProps<"/c/[country]">) {
  const [{ country: code }, query] = await Promise.all([params, searchParams]);
  const country = lookup(code);
  if (!country) notFound();
  if (code !== code.toLowerCase()) redirect(`/c/${code.toLowerCase()}${queryString(query)}`);

  const [t, locale, user] = await Promise.all([getT("store"), getLocale(), getUser()]);
  const name = lt(country.name, locale);
  const region = getRegion(country.region);
  const mode = country.salesMode;
  const money = (n: number) => formatMoney(n, country.currency, locale);
  const { flatFee, freeOver, etaDays } = country.shipping;

  const initial = resolveStudio(country, { size: one(query.size), finish: one(query.finish), plant: one(query.plant) });

  const tone = { full: "leaf", pot_only: "sky", coming_soon: "sun" } as const;
  const StatusIcon = { full: Truck, pot_only: Package, coming_soon: Bell }[mode];
  const facts =
    mode === "coming_soon"
      ? []
      : [
          {
            icon: Truck,
            text:
              flatFee === 0
                ? t("shipping.free")
                : freeOver !== undefined
                  ? `${t("shipping.flat", { fee: money(flatFee) })} · ${t("shipping.freeOver", { amount: money(freeOver) })}`
                  : t("shipping.flat", { fee: money(flatFee) }),
          },
          { icon: Clock, text: t("shipping.eta", { min: etaDays[0], max: etaDays[1] }) },
          { icon: Coins, text: t("shipping.currency", { currency: country.currency.toUpperCase() }) },
        ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_15%_0%,rgb(155_227_74/0.13),transparent_65%)]" />
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-70" />
        <Container className="relative pt-8 pb-10 sm:pt-10 sm:pb-14">
          <nav aria-label={t("hero.breadcrumbLabel")} className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/#explore" className="hover:text-fg">
              {t("hero.breadcrumb")}
            </Link>
            {region && (
              <>
                <ChevronRight className="h-3 w-3 text-faint" aria-hidden />
                <span>{lt(region.name, locale)}</span>
              </>
            )}
            <ChevronRight className="h-3 w-3 text-faint" aria-hidden />
            <span className="text-fg/80" aria-current="page">
              {name}
            </span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
            <div>
              <Badge tone={tone[mode]}>{t(`mode.${mode}`)}</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{name}</h1>
              <p className="mt-4 max-w-xl text-base text-pretty text-muted sm:text-lg">{t(`hero.lead.${mode}`)}</p>
            </div>

            <div
              className={cn(
                "glass rounded-3xl p-5 sm:p-6",
                mode === "full" && "ring-1 ring-leaf-300/20",
                mode === "pot_only" && "ring-1 ring-sky/20",
                mode === "coming_soon" && "ring-1 ring-sun/20",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    mode === "full" && "bg-leaf-300/15 text-leaf-200",
                    mode === "pot_only" && "bg-sky/15 text-sky",
                    mode === "coming_soon" && "bg-sun/15 text-sun",
                  )}
                >
                  <StatusIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-pretty">{t(`status.${mode}.title`)}</p>
                  <p className="mt-1 text-sm text-pretty text-muted">{t(`status.${mode}.body`, { country: name })}</p>
                  {mode === "pot_only" && (
                    <Link href="/partners" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky hover:underline">
                      {t("status.pot_only.partners")}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
              {mode === "coming_soon" ? (
                <WaitlistForm countryCode={country.code} defaultEmail={user?.email} className="mt-5" />
              ) : (
                <ul className="mt-5 grid gap-2 border-t border-line/70 pt-4 text-sm text-muted sm:grid-cols-2">
                  {facts.map(({ icon: Icon, text }, i) => (
                    <li key={i} className={cn("flex items-start gap-2", i === 0 && "sm:col-span-2")}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Container>
      </section>

      <StoreExperience
        countryCode={country.code}
        initial={initial}
        canceled={one(query.canceled) === "1"}
        resumeCheckout={one(query.checkout) === "1"}
        defaultEmail={user?.email}
      />

      {mode === "pot_only" && (
        <section id="local-plants" className="scroll-mt-20 border-t border-line/60">
          <Container className="grid gap-4 py-14 sm:py-20 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf-300/15 text-leaf-200">
                <Sprout className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">{t("local.title")}</h2>
              <p className="mt-2 mb-5 text-sm text-pretty text-muted">{t("local.body", { country: name })}</p>
              <WaitlistForm countryCode={country.code} variant="plants" defaultEmail={user?.email} />
            </div>
            <div className="flex flex-col rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky/15 text-sky">
                <Handshake className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">{t("local.partnerTitle")}</h2>
              <p className="mt-2 text-sm text-pretty text-muted">{t("local.partnerBody", { country: name })}</p>
              <ButtonLink href="/partners" variant="outline" className="mt-6 self-start md:mt-auto">
                {t("local.partnerCta")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

function queryString(query: SearchParams): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    for (const value of Array.isArray(v) ? v : v === undefined ? [] : [v]) params.append(k, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
