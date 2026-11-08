import { headers } from "next/headers";
import { ProductStory } from "@/components/landing/ProductStory";
import { buildMapModel } from "@/components/map/model";
import { WorldExplorer } from "@/components/map/WorldExplorer";
import { getLocale } from "@/i18n/server";
import { guessCountryFromHeaders } from "@/lib/geo";

/** Landing: the world map hero (#explore) followed by the product story (#product). */
export default async function HomePage() {
  const [locale, requestHeaders] = await Promise.all([getLocale(), headers()]);
  const { regions, markets } = buildMapModel(locale);
  const guess = guessCountryFromHeaders(requestHeaders);

  return (
    <>
      <WorldExplorer regions={regions} markets={markets} guess={guess} />
      <ProductStory />
    </>
  );
}
