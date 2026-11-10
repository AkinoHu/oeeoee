import type { Metadata } from "next";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { PartnerHero } from "@/components/partners/PartnerHero";
import {
  ApplyIntro,
  FaqSection,
  HowSection,
  MarketsSection,
  PlantsSection,
  RequirementsSection,
  Section,
  StatsStrip,
  WhySection,
} from "@/components/partners/PartnerSections";
import { countryOptions } from "@/components/partners/markets";
import { Card } from "@/components/ui/primitives";
import { getCountry, listCountries, listRegions, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return { title: t("meta.title"), description: t("meta.description") };
}

export default async function PartnersPage({ searchParams }: PageProps<"/partners">) {
  const raw = (await searchParams).country;
  const country = getCountry(Array.isArray(raw) ? raw[0] : raw);
  const locale = await getLocale();
  const countryName = country ? lt(country.name, locale) : undefined;

  return (
    // auto-phrase keeps Japanese words together when wrapping (no-op elsewhere);
    // overflow-wrap:anywhere still breaks a phrase that can't fit on one line.
    <div className="[overflow-wrap:anywhere] [word-break:auto-phrase]">
      <PartnerHero countryName={countryName} />
      <StatsStrip />
      <WhySection />
      <HowSection />
      <RequirementsSection />
      <MarketsSection selected={country?.code} />
      <PlantsSection />
      <FaqSection />
      <Section id="apply" className="relative overflow-hidden border-t border-line/60">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_at_bottom,rgb(var(--glow)/0.08),transparent_65%)]" />
        <div className="relative grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <ApplyIntro />
          <Card className="p-5 sm:p-8">
            {/* Re-key on the URL's country so the select picks up the new default. */}
            <PartnerForm
              key={country?.code ?? "none"}
              countryGroups={countryOptions(listCountries(), listRegions(), locale)}
              defaultCountry={country?.code}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
