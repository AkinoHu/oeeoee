import type { CurrencyCode } from "@/data/types";
import type { Locale } from "@/i18n/config";

/** Currencies Stripe treats as zero-decimal (amounts are already whole units). */
const ZERO_DECIMAL = new Set<string>(["jpy", "krw", "vnd", "clp", "ugx", "xof"]);

export function currencyExponent(currency: CurrencyCode | string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
}

const LOCALE_TAG: Record<Locale, string> = { en: "en-US", zh: "zh-CN", ja: "ja-JP" };

/**
 * Format an amount in minor units (Stripe convention) for display.
 * formatMoney(69900, "cny", "zh") -> "¥699"
 */
export function formatMoney(amountMinor: number, currency: CurrencyCode | string, locale: Locale = "en"): string {
  const exp = currencyExponent(currency);
  const value = amountMinor / 10 ** exp;
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(LOCALE_TAG[locale] ?? "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : exp,
    maximumFractionDigits: exp,
  }).format(value);
}
