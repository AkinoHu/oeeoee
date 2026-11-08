"use client";

import {
  ArrowLeft,
  BedDouble,
  Check,
  CloudSun,
  Flower2,
  Heart,
  House,
  Leaf,
  LampDesk,
  Moon,
  PawPrint,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { getPotModel, lt, type Country, type LightLevel, type Placement, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { recommendPlants, type RecommendInput } from "@/lib/recommend";
import { cn } from "@/lib/utils";
import { suggestedSize } from "./studio";

type Experience = NonNullable<RecommendInput["experience"]>;
interface Answers {
  placement?: Placement;
  light?: LightLevel;
  pets?: "yes" | "no";
  experience?: Experience;
}
type QuestionId = keyof Answers;

interface Option<V extends string> {
  value: V;
  icon: LucideIcon;
}

const QUESTIONS: { id: QuestionId; options: Option<string>[] }[] = [
  {
    id: "placement",
    options: [
      { value: "desk", icon: LampDesk },
      { value: "bedside", icon: BedDouble },
      { value: "living_room", icon: House },
    ],
  },
  {
    id: "light",
    options: [
      { value: "low", icon: Moon },
      { value: "medium", icon: CloudSun },
      { value: "bright", icon: Sun },
    ],
  },
  {
    id: "pets",
    options: [
      { value: "yes", icon: PawPrint },
      { value: "no", icon: Heart },
    ],
  },
  {
    id: "experience",
    options: [
      { value: "beginner", icon: Sprout },
      { value: "some", icon: Leaf },
      { value: "expert", icon: Flower2 },
    ],
  },
];

/** Recommend-engine size hint for a spot (bedside is left open: S or M). */
const SPOT_SIZE: Partial<Record<Placement, PotSize>> = { desk: "S", living_room: "L" };

export function PlantQuiz({
  country,
  currentPlantId,
  onApply,
}: {
  country: Country;
  currentPlantId: string;
  onApply: (plantId: string, size: PotSize) => void;
}) {
  const t = useT("store");
  const tr = useT("recommend");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const done = step >= QUESTIONS.length;

  const results = useMemo(() => {
    if (!done || !answers.placement) return null;
    const input: RecommendInput = {
      country,
      size: SPOT_SIZE[answers.placement],
      placement: answers.placement,
      light: answers.light,
      petSafeOnly: answers.pets === "yes",
      experience: answers.experience,
    };
    let recs = recommendPlants(input);
    let relaxedPets = false;
    if (input.petSafeOnly) {
      const safe = recs.filter((r) => r.plant.petSafe);
      if (safe.length) recs = safe;
      else {
        recs = recommendPlants({ ...input, petSafeOnly: false });
        relaxedPets = true;
      }
    }
    return { recs: recs.slice(0, 3), relaxedPets, placement: answers.placement };
  }, [done, answers, country]);

  function choose(id: QuestionId, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
    setDir(1);
    // A beat of feedback on the chosen tile, then move on.
    const target = Math.min(step + 1, QUESTIONS.length);
    setTimeout(() => setStep(target), 160);
  }

  function back() {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function restart() {
    setDir(-1);
    setAnswers({});
    setStep(0);
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -32 }),
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-leaf-400/10 blur-3xl" />
      <div className="relative p-5 sm:p-8">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {QUESTIONS.map((q, i) => (
              <span key={q.id} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <motion.span
                  className="block h-full rounded-full bg-leaf-300"
                  initial={false}
                  animate={{ width: i < step ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </span>
            ))}
          </div>
          <p className="shrink-0 font-mono text-xs text-muted" aria-live="polite">
            {done ? t("quiz.results.label") : t("quiz.progress", { n: step + 1, total: QUESTIONS.length })}
          </p>
        </div>

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {!done ? (
            <motion.div
              key={QUESTIONS[step].id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Question
                id={QUESTIONS[step].id}
                options={QUESTIONS[step].options}
                value={answers[QUESTIONS[step].id]}
                onChoose={choose}
              />
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted hover:text-fg"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {t("quiz.back")}
                </button>
              )}
            </motion.div>
          ) : (
            results && (
              <motion.div key="results" custom={dir} variants={variants} initial="enter" animate="center" exit="exit">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <Sparkles className="h-5 w-5 text-leaf-300" aria-hidden />
                      {t("quiz.results.title")}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{t("quiz.results.subtitle", { country: lt(country.name, locale) })}</p>
                  </div>
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted hover:text-fg"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden />
                    {t("quiz.results.restart")}
                  </button>
                </div>
                {results.relaxedPets && (
                  <p className="mt-4 rounded-xl border border-sun/25 bg-sun/[0.07] px-4 py-2.5 text-sm text-sun/90">
                    {t("quiz.results.noPetSafe")}
                  </p>
                )}
                <ol className="mt-5 grid gap-3 md:grid-cols-3">
                  {results.recs.map((rec, i) => {
                    const size = suggestedSize(rec.plant, results.placement);
                    const pot = getPotModel(size);
                    const active = rec.plant.id === currentPlantId;
                    return (
                      <motion.li
                        key={rec.plant.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.09, type: "spring", stiffness: 260, damping: 24 }}
                        className={cn(
                          "flex flex-col rounded-2xl border p-4",
                          i === 0 ? "border-leaf-300/40 bg-leaf-300/[0.04]" : "border-line bg-surface-2/40",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden rounded-xl"
                            style={{ background: `radial-gradient(circle at 50% 85%, ${rec.plant.color}40, transparent 72%), var(--color-surface-2)` }}
                          >
                            <PlantArt plantId={rec.plant.id} width={64} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10px] tracking-widest text-leaf-300 uppercase">
                              {i === 0 ? t("quiz.results.top") : `#${i + 1}`}
                            </p>
                            <p className="mt-0.5 font-semibold">{lt(rec.plant.name, locale)}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                                <motion.span
                                  className="block h-full rounded-full bg-gradient-to-r from-leaf-500 to-leaf-300"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(6, Math.min(100, rec.score))}%` }}
                                  transition={{ delay: 0.25 + i * 0.09, duration: 0.6, ease: "easeOut" }}
                                />
                              </span>
                              <span className="font-mono text-[10px] text-muted">
                                {t("quiz.results.match", { score: Math.round(rec.score) })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {rec.reasons.slice(0, 4).map((code) => (
                            <li
                              key={code}
                              className="inline-flex items-center gap-1 rounded-full border border-leaf-300/20 bg-leaf-300/[0.07] px-2 py-0.5 text-[11px] text-leaf-100"
                            >
                              <Check className="h-3 w-3 text-leaf-300" aria-hidden />
                              {tr(`reason.${code}`)}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
                          <span>
                            {t("quiz.results.suggestedSize", { size: pot ? `${lt(pot.name, locale)} (${size})` : size })}
                          </span>
                          {rec.sellable && rec.price !== null ? (
                            <span className="font-medium text-leaf-200 tabular-nums">
                              + {formatMoney(rec.price, country.currency, locale)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Store className="h-3 w-3" aria-hidden />
                              {t("studio.plant.local")}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onApply(rec.plant.id, size)}
                          className={cn(
                            "mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors md:mt-auto",
                            active
                              ? "border border-leaf-300/40 bg-transparent text-leaf-200"
                              : "bg-leaf-300 text-bg hover:bg-leaf-200",
                          )}
                        >
                          {active ? <Check className="h-4 w-4" aria-hidden /> : <Sprout className="h-4 w-4" aria-hidden />}
                          {active ? t("quiz.results.applied") : t("quiz.results.try")}
                        </button>
                      </motion.li>
                    );
                  })}
                </ol>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Question({
  id,
  options,
  value,
  onChoose,
}: {
  id: QuestionId;
  options: Option<string>[];
  value: string | undefined;
  onChoose: (id: QuestionId, value: string) => void;
}) {
  const t = useT("store");
  type Key = Parameters<typeof t>[0];
  return (
    <fieldset>
      <legend className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t(`quiz.q.${id}`)}</legend>
      <div className={cn("mt-5 grid gap-2.5", options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {options.map(({ value: v, icon: Icon }) => {
          const selected = value === v;
          return (
            <motion.button
              key={v}
              type="button"
              whileTap={{ scale: 0.97 }}
              aria-pressed={selected}
              onClick={() => onChoose(id, v)}
              className={cn(
                "group flex cursor-pointer items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors sm:flex-col sm:items-start sm:gap-4 sm:p-5",
                selected ? "border-leaf-300/60 bg-leaf-300/[0.08]" : "border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selected ? "bg-leaf-300 text-bg" : "bg-surface-3 text-leaf-200 group-hover:text-leaf-100",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{t(`quiz.${id}.${v}` as Key)}</span>
                <span className="mt-0.5 block text-sm text-muted">{t(`quiz.${id}.${v}.hint` as Key)}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}
