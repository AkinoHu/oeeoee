"use client";

import { Info, Sparkles, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type { Expression } from "@/components/companion-face/types";
import { Container } from "@/components/ui/primitives";
import { getCountry, getPlant, lt, type PotFinishId, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { CompanionCard } from "./CompanionCard";
import { PlantQuiz } from "./PlantQuiz";
import { PlantSwitcher } from "./PlantSwitcher";
import { StepHeading, FinishPicker, SizePicker } from "./StudioPickers";
import { StudioPreview } from "./StudioPreview";
import { StudioSummary } from "./StudioSummary";
import { studioPlants, type StudioState } from "./studio";

/**
 * The interactive part of /c/[country]: pot studio + "find my plant" quiz.
 * Studio state lives in the URL (?size=M&finish=sage&plant=pothos) so links are shareable.
 */
export function StoreExperience({
  countryCode,
  initial,
  canceled,
  resumeCheckout,
  defaultEmail,
}: {
  countryCode: string;
  initial: StudioState;
  canceled: boolean;
  resumeCheckout: boolean;
  defaultEmail?: string | null;
}) {
  const t = useT("store");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const country = getCountry(countryCode)!;
  const plants = useMemo(() => studioPlants(country), [country]);

  const [studio, setStudio] = useState<StudioState>(initial);
  const [includePlant, setIncludePlant] = useState(true);
  const [expression, setExpression] = useState<Expression>("happy");
  const [showCanceled, setShowCanceled] = useState(canceled);
  const exprTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const plant = getPlant(studio.plantId) ?? plants[0];

  function flashExpression(next: Expression, ms = 1400) {
    setExpression(next);
    clearTimeout(exprTimer.current);
    exprTimer.current = setTimeout(() => setExpression("happy"), ms);
  }

  function update(patch: Partial<StudioState>) {
    const next = { ...studio, ...patch };
    setStudio(next);
    const params = new URLSearchParams(window.location.search);
    params.set("size", next.size);
    params.set("finish", next.finish);
    params.set("plant", next.plantId);
    params.delete("canceled");
    params.delete("checkout");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  function choosePlant(plantId: string) {
    if (plantId === studio.plantId) return;
    update({ plantId });
    flashExpression("excited");
  }

  function applyFromQuiz(plantId: string, size: PotSize) {
    update({ plantId, size });
    setIncludePlant(true);
    flashExpression("love", 2400);
    document.getElementById("studio")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // One-shot URL flags from the server render: drop them so a refresh doesn't repeat them.
  useEffect(() => {
    if (!canceled && !resumeCheckout) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("canceled");
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [canceled, resumeCheckout]);

  // Back from /login?next=/c/xx?checkout=1 — pick checkout up where it stopped.
  const { hydrated, cart, startCheckout } = useCart();
  const resumed = useRef(false);
  useEffect(() => {
    if (!resumeCheckout || !hydrated || resumed.current) return;
    resumed.current = true;
    if (cart.countryCode === country.code && cart.lines.length > 0) void startCheckout({ resuming: true });
  }, [resumeCheckout, hydrated, cart, country.code, startCheckout]);

  useEffect(() => () => clearTimeout(exprTimer.current), []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {showCanceled && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <Container className="pt-6">
              <div role="status" className="flex items-start gap-3 rounded-2xl border border-sky/25 bg-sky/[0.07] px-4 py-3 text-sm text-sky">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p className="flex-1 text-pretty">{t("notice.canceled")}</p>
                <button
                  type="button"
                  onClick={() => setShowCanceled(false)}
                  className="-m-1 cursor-pointer rounded-lg p-1 text-sky/70 hover:text-sky"
                  aria-label={t("notice.dismiss")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="studio" className="scroll-mt-20" aria-labelledby="studio-title">
        <Container className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <StudioPreview size={studio.size} finish={studio.finish} plantId={plant.id} expression={expression} />
          </div>

          <div className="min-w-0">
            <p className="eyebrow">{t("studio.eyebrow")}</p>
            <h2 id="studio-title" className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("studio.title")}
            </h2>
            <p className="mt-3 text-muted text-pretty">{t(`studio.lead.${country.salesMode}`)}</p>

            <div className="mt-8 space-y-8">
              <div>
                <StepHeading index={1} title={t("studio.step.size")} />
                <SizePicker
                  country={country}
                  value={studio.size}
                  onChange={(size) => update({ size })}
                  fits={plant.sizes}
                  showPrices={country.salesMode !== "coming_soon"}
                />
              </div>

              <div>
                <StepHeading index={2} title={t("studio.step.finish")} />
                <FinishPicker value={studio.finish} onChange={(finish: PotFinishId) => update({ finish })} />
              </div>

              <div>
                <StepHeading
                  index={3}
                  title={t("studio.step.plant")}
                  aside={
                    <a href="#quiz" className="inline-flex items-center gap-1.5 text-xs font-medium text-leaf-300 hover:text-leaf-200">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      {t("studio.plant.help")}
                    </a>
                  }
                />
                <p className="-mt-1.5 mb-3 text-xs text-muted">
                  {country.salesMode === "full"
                    ? t("studio.plant.hint.full", { n: plants.length })
                    : t("studio.plant.hint.local", { n: plants.length, country: lt(country.name, locale) })}
                </p>
                <PlantSwitcher country={country} plants={plants} value={plant.id} size={studio.size} onChange={choosePlant} />
                <CompanionCard
                  plant={plant}
                  size={studio.size}
                  expression={expression}
                  onSwitchSize={(size) => {
                    update({ size });
                    flashExpression("happy");
                  }}
                />
              </div>

              <StudioSummary
                country={country}
                size={studio.size}
                finish={studio.finish}
                plant={plant}
                includePlant={includePlant}
                onIncludePlantChange={setIncludePlant}
                defaultEmail={defaultEmail}
              />
            </div>
          </div>
        </Container>
      </section>

      <section id="quiz" className="scroll-mt-20 border-t border-line/60 bg-surface/30" aria-labelledby="quiz-title">
        <Container className="py-14 sm:py-20">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">{t("quiz.eyebrow")}</p>
            <h2 id="quiz-title" className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("quiz.title")}
            </h2>
            <p className="mt-3 text-muted text-pretty">{t("quiz.description")}</p>
          </div>
          <PlantQuiz country={country} currentPlantId={plant.id} onApply={applyFromQuiz} />
        </Container>
      </section>
    </MotionConfig>
  );
}
