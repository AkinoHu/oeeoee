import type Stripe from "stripe";
import { markOrderCanceled, markOrderPaid, type SyncResult } from "@/lib/cart/sync";
import { getStripe, stripeCryptoProvider } from "@/lib/stripe";

/**
 * POST /api/stripe/webhook — configure these events on the endpoint:
 *   checkout.session.completed
 *   checkout.session.async_payment_succeeded
 *   checkout.session.async_payment_failed
 *   checkout.session.expired
 *
 * Signature-verified against the raw body. Handlers are idempotent (conditional
 * status transitions), so Stripe retries and replays are safe. Unknown events are
 * acknowledged with 200; only a failure while handling a known event returns 500
 * so that Stripe retries it.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing_signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, stripeCryptoProvider);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  let result: SyncResult;
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        // `completed` also fires for delayed methods with payment_status "unpaid";
        // markOrderPaid only acts once Stripe reports "paid".
        result = await markOrderPaid(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        result = await markOrderCanceled(event.data.object);
        break;
      default:
        return Response.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    console.error(`[stripe:webhook] failed to handle ${event.type} ${event.id}`, err);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }

  if (result === "not_found") console.warn(`[stripe:webhook] no order for ${event.type} ${event.id}`);
  return Response.json({ received: true, result });
}
