"use client";

import { createContext, useCallback, useContext } from "react";
import type { Locale } from "./config";
import { interpolate } from "./define";
import { catalog, type MessageKey, type Namespace } from "./messages";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/**
 * Client components:
 *   const t = useT("store");
 *   t("cart.title")
 */
export function useT<N extends Namespace>(ns: N) {
  const locale = useLocale();
  return useCallback(
    (key: MessageKey<N>, vars?: Record<string, string | number>) => {
      const dict = catalog[ns][locale] as Record<string, string>;
      const fallback = catalog[ns].en as Record<string, string>;
      return interpolate(dict[key] ?? fallback[key] ?? key, vars);
    },
    [ns, locale],
  );
}
