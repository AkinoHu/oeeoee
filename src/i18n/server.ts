import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, matchLocale, type Locale } from "./config";
import { interpolate } from "./define";
import { catalog, type MessageKey, type Namespace } from "./messages";

/** Locale for the current request: cookie → Accept-Language → default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return matchLocale((await headers()).get("accept-language"));
});

export type Translator<N extends Namespace> = (key: MessageKey<N>, vars?: Record<string, string | number>) => string;

export function translator<N extends Namespace>(ns: N, locale: Locale): Translator<N> {
  const dict = catalog[ns][locale] as Record<string, string>;
  const fallback = catalog[ns].en as Record<string, string>;
  return (key, vars) => interpolate(dict[key] ?? fallback[key] ?? key, vars);
}

/**
 * Server components / actions:
 *   const t = await getT("landing");
 *   t("hero.title")
 */
export async function getT<N extends Namespace>(ns: N): Promise<Translator<N>> {
  return translator(ns, await getLocale());
}
