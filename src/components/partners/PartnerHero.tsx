import { ArrowRight, Check, Droplets, MapPin, Sparkles, Sun } from "lucide-react";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { getPlant, listPlants, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";

/** Hero for /partners with an illustrative "partner view" of an incoming order. */
export async function PartnerHero({ countryName }: { countryName?: string }) {
  const [t, locale] = await Promise.all([getT("partners"), getLocale()]);
  const plant = getPlant("monstera") ?? listPlants()[0];
  const size = plant?.sizes.includes("M") ? "M" : (plant?.sizes[0] ?? "M");

  return (
    <section className="relative overflow-hidden border-b border-line/60">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgb(155_227_74/0.14),transparent_65%)]" />

      <Container className="relative grid items-center gap-12 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pt-24 lg:pb-24">
        <div>
          <p className="eyebrow">{t("hero.eyebrow")}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("hero.title")}
            <span className="text-gradient mt-2 block pb-1 text-[1.75rem] leading-tight sm:text-4xl lg:text-5xl">
              {countryName ? t("hero.subtitleCountry", { country: countryName }) : t("hero.subtitle")}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted">{t("hero.lead")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#apply" size="lg">
              {t("hero.ctaApply")} <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#markets" size="lg" variant="secondary">
              <MapPin className="h-4 w-4" aria-hidden /> {t("hero.ctaMarkets")}
            </ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {(["hero.trust1", "hero.trust2", "hero.trust3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-leaf-300" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* Illustrative partner view — decorative, so hidden from assistive tech. */}
        <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[26rem] lg:max-w-[30rem]">
          <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(155_227_74/0.22),transparent_65%)] blur-2xl" />
          <div className="absolute inset-[10%] rounded-full border border-leaf-300/15" />
          <div className="absolute inset-[20%] rounded-full border border-dashed border-leaf-300/25 motion-safe:animate-[spin_60s_linear_infinite]" />
          <div className="absolute inset-[30%] rounded-full bg-surface/60 ring-1 ring-line" />
          {plant && (
            <div className="absolute inset-x-[24%] top-[16%] bottom-[22%] flex items-end justify-center">
              <PlantArt plantId={plant.id} className="h-full w-auto drop-shadow-[0_20px_40px_rgb(0_0_0/0.5)]" />
            </div>
          )}

          <div className="glass absolute top-[4%] left-0 w-[64%] max-w-[15.5rem] rounded-2xl p-3 shadow-2xl sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.7rem] font-medium tracking-wide text-muted uppercase">{t("hero.card.orderTitle")}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-300/12 px-2 py-0.5 text-[0.65rem] font-medium text-leaf-200">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf-300 motion-safe:animate-pulse-soft" />
                {t("hero.card.orderLive")}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {t("hero.card.orderItem", { plant: plant ? lt(plant.name, locale) : "", size })}
            </p>
            <p className="mt-1 text-xs text-muted">{t("hero.card.orderEta")}</p>
            <p className="mt-2.5 flex items-start gap-1.5 border-t border-line pt-2.5 text-[0.7rem] leading-snug text-leaf-200/90">
              <Sparkles className="mt-px h-3 w-3 shrink-0" />
              {t("hero.card.orderMatched")}
            </p>
          </div>

          <div className="glass absolute right-0 bottom-[3%] w-[60%] max-w-[15rem] rounded-2xl p-3 shadow-2xl sm:p-3.5">
            <p className="text-[0.7rem] font-medium tracking-wide text-muted uppercase">{t("hero.card.healthTitle")}</p>
            <div className="mt-2.5 space-y-2">
              <Meter icon={<Droplets className="h-3 w-3 text-sky" />} label={t("hero.card.moisture")} value="42%" fill={42} />
              <Meter
                icon={<Sun className="h-3 w-3 text-sun" />}
                label={t("hero.card.light")}
                value={t("hero.card.lightValue", { h: 6.5 })}
                fill={65}
              />
            </div>
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-leaf-200">
              <Check className="h-3.5 w-3.5" />
              {t("hero.card.status")}
            </p>
          </div>

          <div className="glass absolute top-[44%] right-[-2%] hidden rounded-full px-3 py-1.5 text-xs font-medium text-fg/90 shadow-xl sm:block">
            {t("hero.card.ring")}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Meter({ icon, label, value, fill }: { icon: React.ReactNode; label: string; value: string; fill: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[0.7rem]">
        <span className="inline-flex items-center gap-1.5 text-muted">
          {icon}
          {label}
        </span>
        <span className="font-mono text-fg/90">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-leaf-400" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
