import type Stripe from "stripe";
import { getCountry } from "@/data";
import type { Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { checkoutRequestSchema } from "@/lib/cart/schema";
import { shownPlantId } from "@/lib/cart/types";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { priceCart } from "@/lib/orders";
import { getUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

const STRIPE_LOCALE: Record<Locale, Stripe.Checkout.SessionCreateParams.Locale> = { en: "en", zh: "zh", ja: "ja" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/**
 * POST /api/checkout  { countryCode, lines, locale } → { url }
 *
 * Prices are recomputed here from the catalog; the client only says *what* it wants.
 * Order lifecycle: no Stripe → 503 and nothing is written. Otherwise the Order
 * (PENDING) is created first so its id can ride along in the session metadata;
 * if Stripe then fails, the order is marked CANCELED so nothing is left dangling.
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const { countryCode, lines, locale } = parsed.data;

  const country = getCountry(countryCode);
  if (!country) return json({ error: "unknown_country" }, 400);
  if (country.salesMode === "coming_soon") return json({ error: "market_not_open" }, 400);

  const priced = priceCart(country, lines, locale);
  if (!priced.ok) return json({ error: priced.error, lineIndex: priced.lineIndex }, 400);
  const quote = priced.quote;

  const stripe = getStripe();
  if (!stripe) return json({ error: "stripe_not_configured" }, 503);

  const t = translator("store", locale);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      email: user.email,
      countryCode: country.code,
      currency: quote.currency,
      subtotal: quote.subtotal,
      shippingAmount: quote.shipping,
      total: quote.total,
      status: "PENDING",
      locale,
      items: {
        create: quote.items.map((item) => ({
          kind: item.kind,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          meta: item.meta,
        })),
      },
    },
    select: { id: true },
  });

  const base = appUrl();
  const first = quote.lines[0];
  const studio = new URLSearchParams({ country: country.code.toLowerCase(), size: first.size, finish: first.finish });
  const firstPlant = shownPlantId(first);
  if (firstPlant) studio.set("plant", firstPlant);
  const [etaMin, etaMax] = country.shipping.etaDays;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    // Payment methods are dynamic: whatever is enabled in the Stripe Dashboard
    // (Settings → Payment methods) is offered for the session's currency. For the
    // mainland-China store (CNY), enable Alipay and WeChat Pay there — no code change needed.
    line_items: quote.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: quote.currency,
        unit_amount: item.unitAmount,
        product_data: {
          name: item.name,
          description: item.kind === "plant" ? t("stripe.plantDescription") : t("stripe.potDescription"),
          metadata: { sku: item.sku, kind: item.kind },
        },
      },
    })),
    shipping_address_collection: {
      allowed_countries: [country.code as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: quote.shipping === 0 ? t("stripe.shippingFree") : t("stripe.shipping"),
          fixed_amount: { amount: quote.shipping, currency: quote.currency },
          delivery_estimate: {
            minimum: { unit: "business_day", value: Math.max(1, etaMin) },
            maximum: { unit: "business_day", value: Math.max(1, etaMin, etaMax) },
          },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    customer_email: user.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id, countryCode: country.code, userId: user.id },
    payment_intent_data: { metadata: { orderId: order.id } },
    locale: STRIPE_LOCALE[locale],
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout/cancel?${studio.toString()}`,
  };

  try {
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `checkout-${order.id}` });
    if (!session.url) throw new Error("Checkout Session has no url");
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return json({ url: session.url });
  } catch (err) {
    console.error("[checkout] could not create Stripe Checkout Session", err);
    await prisma.order
      .update({ where: { id: order.id }, data: { status: "CANCELED" } })
      .catch((e) => console.error("[checkout] could not cancel order", order.id, e));
    return json({ error: "payment_unavailable" }, 502);
  }
}
