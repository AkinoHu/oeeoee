import { getCountry, lt, type Country, type Region } from "@/data";
import type { Locale } from "@/i18n/config";

/**
 * Helpers that derive the partner programme's market overview from the
 * catalog. Pure functions so they work with however many markets the catalog
 * ships (3 today, ~40 later).
 */

export type PartnerStatus = Country["partnerStatus"];

export const PARTNER_STATUS_ORDER: PartnerStatus[] = ["recruiting", "planned", "live"];

export const LOCALE_TAG: Record<Locale, string> = { en: "en-US", zh: "zh-CN", ja: "ja-JP" };

export interface MarketGroup {
  region: Region;
  countries: Country[];
  counts: Record<PartnerStatus, number>;
}

export function countByStatus(countries: Country[]): Record<PartnerStatus, number> {
  const counts: Record<PartnerStatus, number> = { recruiting: 0, planned: 0, live: 0 };
  for (const c of countries) counts[c.partnerStatus] += 1;
  return counts;
}

/**
 * Countries grouped by region (regions keep catalog order, empty ones are
 * dropped). Within a region: recruiting first, then planned, then live, then
 * alphabetical in the viewer's language.
 */
export function groupMarketsByRegion(countries: Country[], regions: Region[], locale: Locale): MarketGroup[] {
  const collator = new Intl.Collator(LOCALE_TAG[locale]);
  return regions
    .map((region) => {
      const list = countries
        .filter((c) => c.region === region.id)
        .sort(
          (a, b) =>
            PARTNER_STATUS_ORDER.indexOf(a.partnerStatus) - PARTNER_STATUS_ORDER.indexOf(b.partnerStatus) ||
            collator.compare(lt(a.name, locale), lt(b.name, locale)),
        );
      return { region, countries: list, counts: countByStatus(list) };
    })
    .filter((g) => g.countries.length > 0);
}

/** Select options for the application form: regions as optgroups, names sorted. */
export function countryOptions(countries: Country[], regions: Region[], locale: Locale) {
  const collator = new Intl.Collator(LOCALE_TAG[locale]);
  return regions
    .map((region) => ({
      label: lt(region.name, locale),
      options: countries
        .filter((c) => c.region === region.id)
        .map((c) => ({ code: c.code, name: lt(c.name, locale) }))
        .sort((a, b) => collator.compare(a.name, b.name)),
    }))
    .filter((g) => g.options.length > 0);
}

/**
 * Display name for any ISO country code: catalog name first, then the
 * runtime's region names, then the raw code.
 */
export function countryName(code: string | null | undefined, locale: Locale): string {
  if (!code) return "";
  const country = getCountry(code);
  if (country) return lt(country.name, locale);
  try {
    return new Intl.DisplayNames([LOCALE_TAG[locale]], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code.toUpperCase();
  }
}
