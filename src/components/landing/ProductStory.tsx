import {
  Activity,
  ArrowRight,
  BellRing,
  Brain,
  Cloud,
  Droplets,
  Flower2,
  HeartPulse,
  Laptop,
  Map as MapIcon,
  Mic,
  ScanLine,
  Smartphone,
  Smile,
  SlidersHorizontal,
  Sprout,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PotPreview } from "@/components/pot/PotPreview";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { getT, type Translator } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { CompanionDemo } from "./CompanionDemo";
import { Reveal } from "./Reveal";
import { VitalsDashboard } from "./VitalsDashboard";

type T = Translator<"landing">;

/** Everything below the map: abilities, vital signs, ecosystem, steps, closing CTA. */
export async function ProductStory() {
  const t = await getT("landing");
  return (
    <div className="relative overflow-hidden">
      <Abilities t={t} />
      <Vitals t={t} />
      <Ecosystem t={t} />
      <Steps t={t} />
      <Closing t={t} />
    </div>
  );
}

// ── Abilities ──────────────────────────────────────────────────────────────

function Feature({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-leaf-300/15 bg-leaf-300/[0.07] text-leaf-300">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}

function AbilityCard({
  eyebrow,
  title,
  body,
  visual,
  features,
  className,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  features: { icon: LucideIcon; title: string; body: string }[];
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface/70 transition-colors duration-500 hover:border-leaf-300/25",
        className,
      )}
    >
      <div className="relative min-h-[22rem] border-b border-line/70 bg-[radial-gradient(ellipse_at_50%_30%,rgb(155_227_74/0.09),transparent_65%)]">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        {visual}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
        <p className="mt-3 text-muted text-pretty">{body}</p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </ul>
      </div>
    </article>
  );
}

function Abilities({ t }: { t: T }) {
  return (
    <section id="product" className="relative scroll-mt-16 pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-leaf-300/30 to-transparent" />
      <Container>
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow={t("product.eyebrow")}
            title={t("product.title")}
            description={t("product.body")}
          />
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:mt-20 lg:grid-cols-2">
          <Reveal>
            <AbilityCard
              eyebrow={t("care.eyebrow")}
              title={t("care.title")}
              body={t("care.body")}
              visual={
                <div className="relative flex h-full items-center justify-center px-6 py-8">
                  <div aria-hidden className="absolute bottom-10 h-10 w-56 rounded-[100%] bg-leaf-300/15 blur-2xl" />
                  <PotPreview
                    size="M"
                    finish="sage"
                    plantId="pothos"
                    expression="happy"
                    ringRotating
                    lightOn
                    annotated
                    className="relative w-full max-w-[17rem]"
                  />
                </div>
              }
              features={[
                { icon: Sun, title: t("care.light.title"), body: t("care.light.body") },
                { icon: Droplets, title: t("care.water.title"), body: t("care.water.body") },
                { icon: Thermometer, title: t("care.climate.title"), body: t("care.climate.body") },
                { icon: ScanLine, title: t("care.ring.title"), body: t("care.ring.body") },
              ]}
            />
          </Reveal>
          <Reveal delay={0.12}>
            <AbilityCard
              eyebrow={t("companion.eyebrow")}
              title={t("companion.title")}
              body={t("companion.body")}
              visual={<CompanionDemo />}
              features={[
                { icon: Smile, title: t("companion.face.title"), body: t("companion.face.body") },
                { icon: Mic, title: t("companion.voice.title"), body: t("companion.voice.body") },
                { icon: BellRing, title: t("companion.remind.title"), body: t("companion.remind.body") },
                { icon: Cloud, title: t("companion.cloud.title"), body: t("companion.cloud.body") },
              ]}
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

// ── Vital signs ────────────────────────────────────────────────────────────

function Vitals({ t }: { t: T }) {
  return (
    <section className="relative py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf-400/[0.05] blur-[100px]" />
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal>
          <SectionHeading eyebrow={t("vitals.eyebrow")} title={t("vitals.title")} description={t("vitals.body")} />
          <ol className="relative mt-9 max-w-md space-y-3">
            <span aria-hidden className="absolute top-6 bottom-6 left-[1.2rem] w-px bg-gradient-to-b from-leaf-300/40 via-leaf-300/20 to-sky/30" />
            {(
              [
                ["vitals.chain.sensors", "vitals.chain.sensorsBody", Activity],
                ["vitals.chain.body", "vitals.chain.bodyBody", HeartPulse],
                ["vitals.chain.mood", "vitals.chain.moodBody", Smile],
              ] as const
            ).map(([title, body, Icon]) => (
              <li key={title} className="relative flex items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-leaf-300/25 bg-bg text-leaf-300 shadow-[0_0_20px_-6px_rgb(182_243_107/0.6)]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t(title)}</span>
                  <span className="block text-sm text-muted">{t(body)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.1}>
          <VitalsDashboard />
        </Reveal>
      </Container>
    </section>
  );
}

// ── Ecosystem ──────────────────────────────────────────────────────────────

function EcoCard({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-leaf-300/30 sm:p-6",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-2xl border border-leaf-300/20 bg-leaf-300/10 text-leaf-300">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Ecosystem({ t }: { t: T }) {
  const left = [
    { icon: Flower2, title: t("eco.pot.title"), body: t("eco.pot.body") },
    { icon: Laptop, title: t("eco.desktop.title"), body: t("eco.desktop.body") },
  ];
  const right = [
    { icon: SlidersHorizontal, title: t("eco.console.title"), body: t("eco.console.body") },
    { icon: Smartphone, title: t("eco.mobile.title"), body: t("eco.mobile.body") },
  ];
  return (
    <section className="relative py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading align="center" eyebrow={t("eco.eyebrow")} title={t("eco.title")} description={t("eco.body")} />
        </Reveal>
        <Reveal delay={0.1} className="relative mt-14 lg:mt-20">
          {/* Connectors (desktop): hub ↔ four cards, with data pulses flowing to the brain */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            viewBox="0 0 1000 400"
            preserveAspectRatio="none"
          >
            {[
              "M350,90 C440,90 430,200 500,200",
              "M350,310 C440,310 430,200 500,200",
              "M650,90 C560,90 570,200 500,200",
              "M650,310 C560,310 570,200 500,200",
            ].map((d, i) => (
              <g key={d}>
                <path d={d} fill="none" stroke="rgb(182 243 107 / 0.18)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <path
                  d={d}
                  fill="none"
                  stroke="var(--color-leaf-300)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="10 190"
                  vectorEffect="non-scaling-stroke"
                  className="animate-[eco-flow_2.8s_linear_infinite]"
                  style={{ animationDelay: `${i * 0.7}s` }}
                />
              </g>
            ))}
          </svg>
          <style>{`@keyframes eco-flow{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}`}</style>

          <div className="relative grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-8">
              {left.map((c) => (
                <EcoCard key={c.title} {...c} />
              ))}
            </div>

            <div className="order-first mx-auto py-6 lg:order-none lg:py-0">
              <div className="relative grid size-56 place-items-center">
                <div aria-hidden className="absolute inset-0 animate-[spin_24s_linear_infinite] rounded-full border border-dashed border-leaf-300/25" />
                <div aria-hidden className="absolute inset-5 rounded-full border border-leaf-300/10" />
                <div aria-hidden className="absolute inset-8 rounded-full bg-leaf-300/10 blur-2xl" />
                <div className="relative grid size-40 place-items-center rounded-full border border-leaf-300/30 bg-surface-2 text-center shadow-[0_0_60px_-10px_rgb(182_243_107/0.5)]">
                  <div>
                    <Brain className="mx-auto size-7 text-leaf-300" aria-hidden />
                    <p className="mt-2 text-sm font-semibold">{t("eco.hub")}</p>
                    <p className="mt-1 px-4 text-[11px] leading-snug text-muted">{t("eco.hubBody")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-8">
              {right.map((c) => (
                <EcoCard key={c.title} {...c} />
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

// ── How it works ───────────────────────────────────────────────────────────

function Steps({ t }: { t: T }) {
  const steps = [
    { icon: MapIcon, title: t("steps.1.title"), body: t("steps.1.body") },
    { icon: Flower2, title: t("steps.2.title"), body: t("steps.2.body") },
    { icon: Sprout, title: t("steps.3.title"), body: t("steps.3.body") },
  ];
  return (
    <section className="relative py-16 sm:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow={t("steps.eyebrow")} title={t("steps.title")} />
        </Reveal>
        <div className="relative mt-12">
          <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <Reveal
                key={s.title}
                as="li"
                delay={i * 0.1}
                className="relative h-full rounded-3xl border border-line bg-surface/60 p-6 transition-colors duration-300 hover:border-leaf-300/25 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="relative grid size-12 place-items-center rounded-2xl border border-leaf-300/25 bg-bg text-leaf-300 shadow-[0_0_30px_-8px_rgb(182_243_107/0.5)]">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span aria-hidden className="font-mono text-4xl font-semibold text-fg/10 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

// ── Closing CTA ────────────────────────────────────────────────────────────

function Closing({ t }: { t: T }) {
  return (
    <section className="relative pt-8 pb-24 sm:pb-32">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-leaf-300/20 bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(150_172_160/0.35)_1px,transparent_1.2px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]"
            />
            <div aria-hidden className="absolute top-1/2 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf-300/15 blur-[90px]" />
            <div className="relative">
              <p className="eyebrow">{t("closing.eyebrow")}</p>
              <h2 className="text-gradient mx-auto mt-4 max-w-2xl pb-1 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {t("closing.title")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-muted text-pretty sm:text-lg">{t("closing.body")}</p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/#explore" size="lg">
                  <MapIcon className="size-4" aria-hidden />
                  {t("closing.cta")}
                </ButtonLink>
                <Link
                  href="/partners"
                  className="inline-flex h-12 items-center gap-1.5 rounded-2xl px-5 text-sm font-medium text-muted transition hover:text-fg"
                >
                  {t("closing.secondary")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
