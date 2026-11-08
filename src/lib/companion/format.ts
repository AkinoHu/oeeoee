/** Locale-aware formatting helpers shared by the console and the brain. Client-safe. */
import type { Locale } from "@/i18n/config";

const TAG: Record<Locale, string> = { en: "en-US", zh: "zh-CN", ja: "ja-JP" };

export function localeTag(locale: Locale): string {
  return TAG[locale] ?? "en-US";
}

/** "45 minutes", "3 hours", "2 days". */
export function formatDuration(minutes: number, locale: Locale): string {
  const [value, unit] =
    minutes < 60
      ? [Math.max(1, Math.round(minutes)), "minute"]
      : minutes < 48 * 60
        ? [Math.round(minutes / 60), "hour"]
        : [Math.round(minutes / 1440), "day"];
  return new Intl.NumberFormat(localeTag(locale), { style: "unit", unit, unitDisplay: "long" }).format(value);
}

/** "5 minutes ago", "yesterday". */
export function formatRelative(date: Date, now: Date, locale: Locale): string {
  const diffMin = (date.getTime() - now.getTime()) / 60000;
  const rtf = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto" });
  const abs = Math.abs(diffMin);
  if (abs < 1) return rtf.format(0, "second");
  if (abs < 60) return rtf.format(Math.round(diffMin), "minute");
  if (abs < 48 * 60) return rtf.format(Math.round(diffMin / 60), "hour");
  return rtf.format(Math.round(diffMin / 1440), "day");
}

export function formatNumber(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** "14:05" style clock for a fractional hour (e.g. 9.5 → "09:30"). */
export function formatClock(hour: number): string {
  const h = Math.floor(((hour % 24) + 24) % 24);
  const m = Math.round((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m === 60 ? 0 : m).padStart(2, "0")}`;
}

export function formatDate(date: Date, locale: Locale, timeZone?: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeZone }).format(date);
}

export function formatDateTime(date: Date, locale: Locale, timeZone?: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
}
