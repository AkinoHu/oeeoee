import { LOCALE_TAG } from "@/components/partners/markets";
import type { Locale } from "@/i18n/config";

/** Admin display helpers. Pure functions (unit-tested). */

export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { dateStyle: "medium" }).format(date);
}

/** The instant `days` days before `now`. */
export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(n);
}

/** Short, readable id for tables: last 8 chars of a cuid, upper-cased. */
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined): number {
  const n = Number.parseInt(firstParam(value) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

/** Two-letter country code from a query param, or undefined. */
export function parseCountryParam(value: string | string[] | undefined): string | undefined {
  const v = firstParam(value)?.trim().toUpperCase();
  return v && /^[A-Z]{2}$/.test(v) ? v : undefined;
}

export interface FormattedAddress {
  /** Name / company line(s), if present. */
  recipient: string[];
  /** Postal lines, in display order. */
  lines: string[];
  /** Any other scalar fields we didn't recognise, as label/value pairs. */
  extra: [string, string][];
}

const ADDRESS_KEYS = [
  "line1",
  "line2",
  "address1",
  "address2",
  "street",
  "city",
  "state",
  "province",
  "region",
  "postal_code",
  "postalCode",
  "zip",
  "country",
];
const RECIPIENT_KEYS = ["name", "company", "recipient"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

/**
 * Turns the order's `shippingAddress` JSON into display lines. Understands the
 * Stripe shape (`{ name, address: { line1, line2, city, state, postal_code, country } }`),
 * a flat address object, and keeps unknown scalar fields as extras.
 */
export function formatAddress(
  value: unknown,
  countryLabel: (code: string) => string = (code) => code,
): FormattedAddress | null {
  if (typeof value === "string") return value.trim() ? { recipient: [], lines: value.split(/\r?\n/), extra: [] } : null;
  if (!isRecord(value)) return null;

  const nested = isRecord(value.address) ? value.address : undefined;
  const addr: Record<string, unknown> = { ...(nested ?? {}), ...Object.fromEntries(Object.entries(value).filter(([k]) => k !== "address")) };

  const recipient = RECIPIENT_KEYS.map((k) => str(addr[k])).filter((v): v is string => !!v);
  const pick = (...keys: string[]) => keys.map((k) => str(addr[k])).find(Boolean);

  const street = [pick("line1", "address1", "street"), pick("line2", "address2")].filter((v): v is string => !!v);
  const cityLine = [pick("postal_code", "postalCode", "zip"), pick("city"), pick("state", "province", "region")]
    .filter(Boolean)
    .join(" ");
  const rawCountry = pick("country");
  const country = rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? countryLabel(rawCountry.toUpperCase()) : rawCountry;
  const lines = [...street, ...(cityLine ? [cityLine] : []), ...(country ? [country] : [])];

  const known = new Set([...ADDRESS_KEYS, ...RECIPIENT_KEYS]);
  const extra: [string, string][] = [];
  for (const [key, raw] of Object.entries(addr)) {
    if (known.has(key)) continue;
    const v = str(raw) ?? (typeof raw === "boolean" ? String(raw) : undefined);
    if (v) extra.push([key, v]);
  }

  if (recipient.length === 0 && lines.length === 0 && extra.length === 0) return null;
  return { recipient, lines, extra };
}

/** Link to a payment intent in the Stripe dashboard (test-mode aware). */
export function stripePaymentUrl(paymentIntentId: string, testMode: boolean): string {
  return `https://dashboard.stripe.com${testMode ? "/test" : ""}/payments/${encodeURIComponent(paymentIntentId)}`;
}
