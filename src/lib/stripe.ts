import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily-created Stripe client. Returns null when STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "oeeoee" } });
  return client;
}
