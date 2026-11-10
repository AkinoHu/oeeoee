import {
  Activity,
  Award,
  BadgeCheck,
  Boxes,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  FileCheck2,
  Inbox,
  PhoneCall,
  Repeat,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { Card, Container, SectionHeading } from "@/components/ui/primitives";
import { listCountries, listPlants, listPotModels, listRegions, lt, type Country } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { PARTNERS_EMAIL } from "./application-fields";
import { PARTNER_STATUS_ORDER, countByStatus, groupMarketsByRegion, type PartnerStatus } from "./markets";

type Key = MessageKey<"partners">;

/** Replaces the email address inside a translated sentence with a mailto link. */
function withEmailLink(text: string, email = PARTNERS_EMAIL) {
  const parts = text.split(email);
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a
            key={i}
            href={`mailto:${email}`}
            className="font-medium text-leaf-200 underline decoration-leaf-300/40 underline-offset-4 hover:decoration-leaf-300"
          >
            {email}
          </a>,
          part,
        ],
  );
}

export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 sm:py-24", className)}>
      <Container>{children}</Container>
    </section>
  );
}

// ── Stats strip ──────────────────────────────────────────────

export async function StatsStrip() {
  const t = await getT("partners");
  const counts = countByStatus(listCountries());
  const stats: { value: string; label: string }[] = [
    { value: String(counts.recruiting), label: t("stats.markets") },
    { value: String(listPlants().length), label: t("stats.species") },
    { value: String(listPotModels().length || 3), label: t("stats.sizes") },
    { value: "1", label: t("stats.perPot") },
  ];
  return (
    <Container className="relative -mt-8 sm:-mt-10">
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface/90 backdrop-blur lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col-reverse gap-1 p-5 sm:p-6",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="text-3xl font-extrabold tracking-tight text-leaf-200 tabular-nums sm:text-4xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

// ── Why partner ──────────────────────────────────────────────

const WHY: { icon: LucideIcon; key: "demand" | "matched" | "data" | "brand" | "fulfil" | "founding" }[] = [
  { icon: Repeat, key: "demand" },
  { icon: Sparkles, key: "matched" },
  { icon: Activity, key: "data" },
  { icon: BadgeCheck, key: "brand" },
  { icon: Truck, key: "fulfil" },
  { icon: Award, key: "founding" },
];

export async function WhySection() {
  const t = await getT("partners");
  return (
    <Section id="why">
      <SectionHeading eyebrow={t("why.eyebrow")} title={t("why.title")} description={t("why.description")} />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map(({ icon: Icon, key }) => (
          <Card key={key} className="group relative overflow-hidden p-6 transition hover:border-line-strong">
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-leaf-300/5 opacity-0 blur-2xl transition group-hover:opacity-100" />
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-300/10 text-leaf-300 ring-1 ring-leaf-300/20">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{t(`why.${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(`why.${key}.body`)}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

// ── How it works ─────────────────────────────────────────────

const STEPS: { icon: LucideIcon; key: "apply" | "call" | "list" | "orders" | "deliver" }[] = [
  { icon: ClipboardList, key: "apply" },
  { icon: PhoneCall, key: "call" },
  { icon: Boxes, key: "list" },
  { icon: Inbox, key: "orders" },
  { icon: Truck, key: "deliver" },
];

export async function HowSection() {
  const t = await getT("partners");
  return (
    <Section id="how" className="border-y border-line/60 bg-surface/30">
      <SectionHeading eyebrow={t("how.eyebrow")} title={t("how.title")} />
      <ol className="relative mt-12 grid gap-8 lg:grid-cols-5 lg:gap-6">
        <div aria-hidden className="absolute top-6 right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-leaf-300/0 via-leaf-300/30 to-leaf-300/0 lg:block" />
        {STEPS.map(({ icon: Icon, key }, i) => (
          <li key={key} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
            {i < STEPS.length - 1 && (
              <div aria-hidden className="absolute top-12 bottom-[-2rem] left-6 w-px bg-line lg:hidden" />
            )}
            <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-leaf-300/30 bg-bg text-leaf-300 shadow-glow">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold tabular-nums text-xs tracking-wide text-faint uppercase">{t("how.step", { n: i + 1 })}</p>
              <h3 className="mt-1 font-semibold">{t(`how.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`how.${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── Requirements ─────────────────────────────────────────────

const REQS: { icon: LucideIcon; key: "licensed" | "phyto" | "delivery" | "stock" }[] = [
  { icon: ShieldCheck, key: "licensed" },
  { icon: FileCheck2, key: "phyto" },
  { icon: Truck, key: "delivery" },
  { icon: Sprout, key: "stock" },
];

export async function RequirementsSection() {
  const t = await getT("partners");
  const dims = Object.fromEntries(listPotModels().map((p) => [p.size, p.dims.diameterCm]));
  return (
    <Section id="requirements">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading eyebrow={t("req.eyebrow")} title={t("req.title")} description={t("req.description")} />
          <div className="mt-8 rounded-2xl border border-dashed border-leaf-300/30 bg-leaf-300/[0.04] p-5">
            <p className="font-medium text-leaf-200">{t("req.note.title")}</p>
            <p className="mt-1.5 text-sm text-muted">{t("req.note.body")}</p>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {REQS.map(({ icon: Icon, key }) => (
            <li key={key}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-leaf-300" aria-hidden />
                  <h3 className="font-semibold">{t(`req.${key}.title`)}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {t(`req.${key}.body`, { s: dims.S ?? 12, m: dims.M ?? 16, l: dims.L ?? 24 })}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ── Markets ──────────────────────────────────────────────────

const STATUS_STYLE: Record<PartnerStatus, { dot: string; chip: string }> = {
  recruiting: {
    dot: "bg-leaf-300 shadow-[0_0_0_3px_rgb(var(--accent)/0.18)]",
    chip: "border-leaf-300/30 bg-leaf-300/[0.06] hover:border-leaf-300/60 hover:bg-leaf-300/10",
  },
  planned: { dot: "bg-faint", chip: "border-line bg-surface-2/60 hover:border-line-strong" },
  live: { dot: "bg-sky", chip: "border-sky/25 bg-sky/[0.05] hover:border-sky/50" },
};

const STATUS_KEY: Record<PartnerStatus, Key> = {
  recruiting: "markets.status.recruiting",
  planned: "markets.status.planned",
  live: "markets.status.live",
};

export function StatusDot({ status, className }: { status: PartnerStatus; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STATUS_STYLE[status].dot, className)} />;
}

export async function MarketsSection({ selected }: { selected?: string }) {
  const [t, locale] = await Promise.all([getT("partners"), getLocale()]);
  const countries = listCountries();
  const groups = groupMarketsByRegion(countries, listRegions(), locale);
  const totals = countByStatus(countries);

  return (
    <Section id="markets" className="border-y border-line/60 bg-surface/30">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading eyebrow={t("markets.eyebrow")} title={t("markets.title")} description={t("markets.description")} />
        <ul className="flex flex-wrap gap-2">
          {PARTNER_STATUS_ORDER.map((status) => (
            <li
              key={status}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
            >
              <StatusDot status={status} />
              <span>{t(STATUS_KEY[status])}</span>
              <span className="font-bold tabular-nums text-xs text-muted">{totals[status]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.region.id} className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">{lt(group.region.name, locale)}</h3>
              <span className="font-bold tabular-nums text-xs text-faint">{group.countries.length === 1 ? t("markets.countOne") : t("markets.count", { n: group.countries.length })}</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {group.countries.map((country) => (
                <li key={country.code}>
                  <MarketChip country={country} name={lt(country.name, locale)} selected={selected === country.code} t={t} />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted">{withEmailLink(t("markets.missing", { email: PARTNERS_EMAIL }))}</p>
    </Section>
  );
}

function MarketChip({
  country,
  name,
  selected,
  t,
}: {
  country: Country;
  name: string;
  selected: boolean;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}) {
  const status = country.partnerStatus;
  return (
    <Link
      href={`/partners?country=${country.code}#apply`}
      title={`${t(STATUS_KEY[status])} · ${t("markets.apply", { country: name })}`}
      aria-label={`${name} — ${t(STATUS_KEY[status])}. ${t("markets.apply", { country: name })}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        STATUS_STYLE[status].chip,
        selected && "ring-2 ring-leaf-300/60",
      )}
    >
      <StatusDot status={status} />
      <span>{name}</span>
      <span className="font-bold tabular-nums text-[0.65rem] text-faint">{country.code}</span>
    </Link>
  );
}

// ── Plants ───────────────────────────────────────────────────

export async function PlantsSection() {
  const [t, locale] = await Promise.all([getT("partners"), getLocale()]);
  const plants = listPlants();
  if (plants.length === 0) return null;
  return (
    <Section id="plants">
      <SectionHeading eyebrow={t("plants.eyebrow")} title={t("plants.title")} description={t("plants.description")} />
      <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {plants.map((plant) => (
          <li key={plant.id}>
            <Card className="group flex h-full flex-col overflow-hidden transition hover:border-line-strong">
              <div
                className="relative flex aspect-square items-end justify-center overflow-hidden border-b border-line p-4"
                style={{ background: `radial-gradient(circle at 50% 70%, ${plant.color}26, transparent 70%)` }}
              >
                <PlantArt plantId={plant.id} animated={false} className="h-[85%] w-auto transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <p className="font-medium leading-snug">{lt(plant.name, locale)}</p>
                <p className="mt-0.5 truncate text-xs text-faint italic">{plant.scientificName}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                  <span className="sr-only">{t("plants.sizes")}:</span>
                  {plant.sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-bold tabular-nums text-[0.65rem] text-muted"
                    >
                      {size}
                    </span>
                  ))}
                  {plant.difficulty === 1 && (
                    <span className="ml-auto text-[0.65rem] font-medium text-leaf-300">{t("plants.easy")}</span>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────

const FAQ = [1, 2, 3, 4, 5, 6, 7] as const;

export async function FaqSection() {
  const t = await getT("partners");
  return (
    <Section id="faq" className="border-t border-line/60">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading eyebrow={t("faq.eyebrow")} title={t("faq.title")} />
        <div className="space-y-3">
          {FAQ.map((n) => (
            <details
              key={n}
              className="group rounded-2xl border border-line bg-surface transition-colors open:border-line-strong open:bg-surface-2/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium select-none hover:text-leaf-100 [&::-webkit-details-marker]:hidden">
                {t(`faq.q${n}`)}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                {withEmailLink(t(`faq.a${n}`, { email: PARTNERS_EMAIL }))}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Apply (copy column; the form itself is a client component) ──

export async function ApplyIntro() {
  const t = await getT("partners");
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <SectionHeading eyebrow={t("apply.eyebrow")} title={t("apply.title")} description={t("apply.description")} />
      <div className="mt-10">
        <h3 className="text-sm font-semibold tracking-wide text-fg/90">{t("apply.next.title")}</h3>
        <ol className="mt-4 space-y-4">
          {(["apply.next.1", "apply.next.2", "apply.next.3"] as const).map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-leaf-300/30 bg-leaf-300/10 font-bold tabular-nums text-xs text-leaf-200">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-muted">{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-10 space-y-3 border-t border-line pt-6 text-sm text-muted">
        <p className="flex items-center gap-2">
          <CircleCheck className="h-4 w-4 shrink-0 text-leaf-300" aria-hidden />
          <span>{withEmailLink(t("apply.contact", { email: PARTNERS_EMAIL }))}</span>
        </p>
        <p className="text-xs text-faint">{t("apply.privacy")}</p>
      </div>
    </div>
  );
}
