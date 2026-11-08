import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Web Crypto provider for verifying webhook signatures on Workers. */
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();

/** Lazily-created Stripe client. Returns null when STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // fetch + Web Crypto work on both Cloudflare Workers and Node.
  client ??= new Stripe(key, { appInfo: { name: "oeeoee" }, httpClient: Stripe.createFetchHttpClient() });
  return client;
}
