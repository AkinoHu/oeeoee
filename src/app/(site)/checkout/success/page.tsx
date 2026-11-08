import { ArrowRight, Check, Clock, MapPin, Sprout, X } from "lucide-react";
import type { Metadata } from "next";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";
import { PotPreview } from "@/components/pot/PotPreview";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/primitives";
import { getCountry, getFinish, getPlant, getPotModel, lt, type PotFinishId, type PotSize } from "@/data";
import type { Locale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { markOrderPaid } from "@/lib/cart/sync";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { orderReference } from "@/lib/orders";
import { getUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("store");
  return { title: t("success.meta"), robots: { index: false } };
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

interface ItemMeta {
  size: PotSize;
  finish: PotFinishId;
  plantId: string | null;
  previewPlantId: string | null;
}

function readMeta(meta: unknown): ItemMeta | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const size = getPotModel(String(m.size))?.size;
  const finish = getFinish(String(m.finish))?.id;
  if (!size || !finish) return null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return { size, finish, plantId: str(m.plantId), previewPlantId: str(m.previewPlantId) };
}

interface Address {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

function addressLines(json: unknown, locale: Locale): string[] {
  if (!json || typeof json !== "object") return [];
  const { name, address } = json as { name?: string | null; address?: Address | null };
  const a = address ?? {};
  const country = getCountry(a.country);
  return [
    name,
    a.line1,
    a.line2,
    [a.postal_code, a.city, a.state].filter(Boolean).join(" "),
    country ? lt(country.name, locale) : a.country,
  ].filter(
    (l): l is string => typeof l === "string" && l.trim().length > 0,
  );
}

async function loadOrder(sessionId: string | undefined, userId: string | undefined) {
  if (!sessionId || !userId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const find = () => prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: { items: true } });
  let order = await find().catch(() => null);
  if (!order || order.userId !== userId) return null;

  // The webhook may not have landed yet (or isn't forwarded locally): ask Stripe directly.
  const stripe = getStripe();
  if (order.status === "PENDING" && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if ((await markOrderPaid(session)) === "paid") order = (await find()) ?? order;
    } catch (err) {
      console.error("[checkout:success] could not reconcile session", err);
    }
  }
  return order;
}

/** Stripe success_url: /checkout/success?session_id={CHECKOUT_SESSION_ID} */
export default async function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const sessionId = one((await searchParams).session_id);
  const [t, locale, user] = await Promise.all([getT("store"), getLocale(), getUser()]);
  const order = await loadOrder(sessionId, user?.id);

  if (!order) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <ClearCartOnMount />
        <Card className="w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-300 text-bg shadow-glow">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t("success.generic.title")}</h1>
          <p className="mt-2 text-sm text-pretty text-muted">{t("success.generic.body")}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <ButtonLink href="/console">{t("success.cta.console")}</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              {t("success.cta.home")}
            </ButtonLink>
          </div>
        </Card>
      </section>
    );
  }

  const country = getCountry(order.countryCode);
  const money = (n: number) => formatMoney(n, order.currency, locale);
  const potItems = order.items.filter((i) => i.kind === "pot");
  const hero = readMeta(potItems[0]?.meta);
  const heroPlantId = hero ? (hero.plantId ?? hero.previewPlantId) : null;
  const heroPlant = getPlant(heroPlantId);
  const paid = order.status !== "PENDING" && order.status !== "CANCELED";
  const canceled = order.status === "CANCELED";
  const [etaMin, etaMax] = country?.shipping.etaDays ?? [3, 7];
  const address = addressLines(order.shippingAddress, locale);
  const potOnly = !order.items.some((i) => i.kind === "plant");

  const steps = [
    potOnly
      ? heroPlant
        ? t("success.next.potOnly", { min: etaMin, max: etaMax, plant: lt(heroPlant.name, locale) })
        : t("success.next.potOnlyNoPlant", { min: etaMin, max: etaMax })
      : t("success.next.full", { min: etaMin, max: etaMax }),
    t("success.next.console"),
    t("success.next.pair"),
  ];

  return (
    <section className="relative overflow-hidden">
      <ClearCartOnMount />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgb(155_227_74/0.16),transparent_70%)]" />
      <Container className="relative max-w-5xl py-12 sm:py-16">
        <div className="text-center">
          <span
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
              paid && "bg-leaf-300 text-bg shadow-glow",
              !paid && !canceled && "bg-sky/15 text-sky",
              canceled && "bg-rose/15 text-rose",
            )}
          >
            {paid ? <Check className="h-7 w-7" aria-hidden /> : canceled ? <X className="h-7 w-7" aria-hidden /> : <Clock className="h-7 w-7" aria-hidden />}
          </span>
          <p className="eyebrow mt-6">{t("success.eyebrow", { ref: orderReference(order.id) })}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {paid ? t("success.title") : canceled ? t("success.titleCanceled") : t("success.titlePending")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted">
            {paid
              ? t("success.body", { email: order.email ?? "" })
              : canceled
                ? t("success.canceledBody")
                : t("success.pendingBody", { email: order.email ?? "" })}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="relative flex items-center justify-center overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgb(155_227_74/0.12),transparent_70%)]" />
            {hero && (
              <div className="relative w-full max-w-[280px]">
                <PotPreview size={hero.size} finish={hero.finish} plantId={heroPlantId} expression={paid ? "love" : "curious"} />
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-medium text-muted">{t("success.items")}</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{item.name}</span>
                    {item.kind === "plant" && <span className="ml-2 text-xs text-leaf-300">{t("success.livePlant")}</span>}
                    <span className="block text-xs text-faint">{t("success.qty", { n: item.quantity })}</span>
                  </span>
                  <span className="tabular-nums">{money(item.unitAmount * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-muted">
                <dt>{t("cart.subtotal")}</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>{t("cart.shipping")}</dt>
                <dd className="tabular-nums">{order.shippingAmount === 0 ? t("cart.shippingFree") : money(order.shippingAmount)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>{t("cart.total")}</dt>
                <dd className="tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>
            {address.length > 0 && (
              <div className="mt-5 flex gap-3 rounded-xl border border-line bg-surface-2/50 p-3.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
                <div>
                  <p className="text-xs text-muted">{t("success.shipTo")}</p>
                  {address.map((line, i) => (
                    <p key={i} className={i === 0 ? "font-medium" : "text-muted"}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {!canceled && (
          <Card className="mt-4 p-5 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Sprout className="h-5 w-5 text-leaf-300" aria-hidden />
              {t("success.next.title")}
            </h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {steps.map((text, i) => (
                <li key={i} className="rounded-2xl border border-line bg-surface-2/40 p-4">
                  <span className="font-mono text-xs text-leaf-300">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 text-sm text-pretty text-fg/90">{text}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <ButtonLink href="/console" size="lg">
            {t("success.cta.console")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
          {country && (
            <ButtonLink href={`/c/${country.code.toLowerCase()}`} size="lg" variant="secondary">
              {t("success.cta.store")}
            </ButtonLink>
          )}
        </div>
      </Container>
    </section>
  );
}
