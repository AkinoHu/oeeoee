import { ArrowRight, Brain, Cpu, MessagesSquare, Package, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { DemoPotButton } from "@/components/console/DemoPotButton";
import { SeverityIcon } from "@/components/console/MetricIcon";
import { PageHeader, SectionTitle } from "@/components/console/PageHeader";
import { PotCard } from "@/components/console/PotCard";
import { issueText } from "@/components/console/vitals-text";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { getPlant, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { vitalsLine } from "@/lib/companion/fallback";
import { companionClock, getOrCreateCompanion, loadPots } from "@/lib/companion/queries";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { localHour } from "@/lib/vitals";

export default async function ConsoleOverviewPage() {
  const user = await requireUser("/console");
  const [t, locale, companion] = await Promise.all([getT("console"), getLocale(), getOrCreateCompanion(user.id)]);
  const clock = companionClock(companion);
  const now = new Date();
  const [pots, memoryCount] = await Promise.all([
    loadPots(user.id, now, clock.vitalsOptions),
    prisma.memory.count({ where: { companionId: companion.id } }),
  ]);

  const h = localHour(now, clock.timeZone);
  const period = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 && h < 23 ? "evening" : "night";
  const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];

  if (pots.length === 0) {
    return (
      <>
        <PageHeader title={t(`overview.greeting.${period}`, { name: firstName })} description={t("overview.subtitle")} />
        <Card className="bg-grid relative overflow-hidden px-6 py-12 text-center sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--glow)/0.12),transparent_60%)]" />
          <div className="relative mx-auto flex max-w-md flex-col items-center">
            <CompanionFace expression="curious" size={168} className="animate-float" />
            <h2 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">{t("empty.title")}</h2>
            <p className="mt-2 text-sm text-muted text-pretty sm:text-base">{t("empty.body")}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/console/devices#add" variant="secondary">
                <Plus className="h-4 w-4" aria-hidden /> {t("empty.add")}
              </ButtonLink>
              <DemoPotButton />
            </div>
            <p className="mt-3 text-xs text-faint">{t("empty.demoHint")}</p>
          </div>
        </Card>
      </>
    );
  }

  const primary = pots[0];
  const plant = getPlant(primary.device.plantId);
  const mood = vitalsLine(primary.vitals, true, locale);
  const alerts = pots.flatMap((pot) =>
    pot.vitals.issues.map((issue) => ({ pot, issue, text: issueText(issue, pot.device.name, t, locale) })),
  );

  const links = [
    { href: "/console/companion", label: t("overview.link.companion"), icon: Sparkles },
    { href: "/console/memories", label: t("overview.link.memories"), icon: Brain },
    { href: "/console/devices", label: t("overview.link.devices"), icon: Cpu },
    { href: "/console/playground", label: t("overview.link.playground"), icon: MessagesSquare },
    { href: "/console/orders", label: t("overview.link.orders"), icon: Package },
  ];

  return (
    <>
      <PageHeader title={t(`overview.greeting.${period}`, { name: firstName })} description={t("overview.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Companion */}
        <Card className="relative overflow-hidden p-5 sm:p-6 lg:col-span-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-72 bg-[radial-gradient(ellipse_at_left,rgb(var(--glow)/0.13),transparent_70%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <CompanionFace expression={primary.vitals.expression} size={136} className="shrink-0 self-center" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{t("overview.companion")}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{companion.name}</p>
              <p className="text-sm text-muted">
                {plant ? t("overview.livesIn", { plant: lt(plant.name, locale) }) : t("overview.noHome")}
              </p>
              <blockquote className="mt-3 rounded-xl border border-line bg-surface-2/70 px-4 py-3 text-sm leading-relaxed text-fg/90">
                “{mood}”
              </blockquote>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ButtonLink href="/console/playground" size="sm">
                  <MessagesSquare className="h-4 w-4" aria-hidden /> {t("overview.chat", { name: companion.name })}
                </ButtonLink>
                <ButtonLink href="/console/companion" size="sm" variant="secondary">
                  {t("overview.tune")}
                </ButtonLink>
                <dl className="ml-auto flex gap-4 text-xs">
                  <div>
                    <dt className="text-faint">{t("overview.model")}</dt>
                    <dd className="mt-0.5 font-mono text-fg/90">{companion.model}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">{t("nav.memories")}</dt>
                    <dd className="mt-0.5 text-fg/90 tabular-nums">{memoryCount}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <SectionTitle>{t("overview.alerts")}</SectionTitle>
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <SeverityIcon severity={null} /> {t("overview.noAlerts")}
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map(({ pot, issue, text }) => (
                <li key={`${pot.device.id}-${issue.code}`}>
                  <Link
                    href={`/console/devices/${pot.device.id}`}
                    className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-sm hover:border-line-strong"
                  >
                    <SeverityIcon severity={issue.severity} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">{t(`severity.${issue.severity}`)}: </span>
                      {text}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Pots */}
      <section aria-labelledby="pots-heading" className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="pots-heading" className="text-sm font-semibold">
            {t("overview.pots")}
          </h2>
          <Link href="/console/devices#add" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
            <Plus className="h-4 w-4" aria-hidden /> {t("overview.addAnother")}
          </Link>
        </div>
        {pots.map((pot) => (
          <PotCard key={pot.device.id} pot={pot} locale={locale} now={now} />
        ))}
      </section>

      {/* Quick links */}
      <section aria-labelledby="links-heading" className="mt-8">
        <h2 id="links-heading" className="mb-3 text-sm font-semibold">
          {t("overview.quickLinks")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-muted transition hover:border-line-strong hover:text-fg"
              >
                <Icon className="h-4 w-4 shrink-0 text-faint group-hover:text-leaf-300" aria-hidden />
                <span className="flex-1">{label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
