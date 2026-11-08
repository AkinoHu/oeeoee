import type { Metadata } from "next";
import { ArrowLeft, Droplets, Lightbulb, LightbulbOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceDangerZone, DeviceSettingsForm } from "@/components/console/DeviceControls";
import { isDemoSerial, METRIC_META } from "@/components/console/display";
import { MetricIcon } from "@/components/console/MetricIcon";
import { SectionTitle } from "@/components/console/PageHeader";
import { PotStatusBadge, PresenceDot } from "@/components/console/StatusBadge";
import { TelemetryChart } from "@/components/console/TelemetryChart";
import { formatMetric, formatRange, issueText, metricStatusLabel } from "@/components/console/vitals-text";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { Badge, Card } from "@/components/ui/primitives";
import { getPlant, listPlants, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { formatClock, formatNumber, formatRelative } from "@/lib/companion/format";
import { companionClock, getOrCreateCompanion, potState } from "@/lib/companion/queries";
import { bucketize, seriesStats } from "@/lib/companion/series";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { careProfile, lightWindow, METRIC_KEYS, type MetricKey } from "@/lib/vitals";
import { cn } from "@/lib/utils";
import { SeverityIcon } from "@/components/console/MetricIcon";

export async function generateMetadata({ params }: PageProps<"/console/devices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/console/devices/${id}`);
  const device = await prisma.device.findFirst({ where: { id, userId: user.id }, select: { name: true } });
  return { title: device?.name ?? (await getT("console"))("devices.title") };
}

const DOMAINS: Partial<Record<MetricKey, [number, number]>> = {
  soilMoisture: [0, 100],
  airHumidity: [0, 100],
  waterLevel: [0, 100],
};

export default async function DevicePage({ params, searchParams }: PageProps<"/console/devices/[id]">) {
  const { id } = await params;
  const range = (await searchParams).range === "7d" ? "7d" : "24h";
  const user = await requireUser(`/console/devices/${id}`);
  const device = await prisma.device.findFirst({ where: { id, userId: user.id } });
  if (!device) notFound();

  const [t, locale, companion] = await Promise.all([getT("console"), getLocale(), getOrCreateCompanion(user.id)]);
  const clock = companionClock(companion);
  const now = new Date();
  const hours = range === "7d" ? 168 : 24;
  const buckets = range === "7d" ? 168 : 96;
  const start = new Date(now.getTime() - hours * 3600_000);

  const [state, rows] = await Promise.all([
    potState(device, now, clock.vitalsOptions),
    prisma.telemetry.findMany({
      where: { deviceId: device.id, recordedAt: { gte: start, lte: now } },
      orderBy: { recordedAt: "asc" },
    }),
  ]);
  const { vitals, actions, snapshot } = state;
  const plant = getPlant(device.plantId);
  const profile = careProfile(plant);
  const window = lightWindow(profile.lightHours);
  const plants = listPlants()
    .map((p) => ({ id: p.id, name: lt(p.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  const growBand = bucketize(rows, start, now, buckets, (r) => r.growLightOn, "any");
  const pumpMarks = bucketize(rows, start, now, buckets, (r) => r.pumpRanSec, "sum").map((v) => (v ? v : null));

  const charts = METRIC_KEYS.map((metric) => {
    const values = bucketize(rows, start, now, buckets, (r) => r[metric]);
    const stats = seriesStats(values);
    const label = t(`metric.${metric}`);
    const unit = METRIC_META[metric].unit === "lux" ? " lux" : METRIC_META[metric].unit;
    const f = (v: number) => `${formatNumber(v, locale, METRIC_META[metric].digits)}${unit}`;
    return {
      metric,
      label,
      values,
      summary: stats ? t("device.chartSummary", { label, latest: f(stats.latest), min: f(stats.min), max: f(stats.max) }) : t("device.chartEmpty"),
    };
  });

  const seen = snapshot ? formatRelative(snapshot.recordedAt, now, locale) : t("time.never");
  const targets = [
    { label: t("device.target.soil"), value: formatRange("soilMoisture", profile.soilMoisture, locale) },
    {
      label: t("device.target.light"),
      value: t("device.target.lightValue", { h: profile.lightHours, start: formatClock(window.start), end: formatClock(window.end) }),
    },
    { label: t("device.target.lux"), value: formatRange("lightLux", profile.lux, locale) },
    { label: t("device.target.temp"), value: formatRange("airTemp", profile.tempRange, locale) },
    { label: t("device.target.humidity"), value: formatRange("airHumidity", profile.humidity, locale) },
  ];

  return (
    <>
      <Link href="/console/devices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("device.back")}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <CompanionFace expression={vitals.expression} size={88} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{device.name}</h1>
            {isDemoSerial(device.serial) && <Badge>{t("demo.badge")}</Badge>}
            <PotStatusBadge vitals={vitals} statusLabel={t(`status.${vitals.status}`)} waitingLabel={t("status.new")} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {plant ? `${lt(plant.name, locale)} · ${plant.scientificName}` : t("device.unknownPlant")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <PresenceDot online={vitals.online} label={`${vitals.online ? t("status.online") : t("status.offline")} · ${seen}`} />
            <span className="font-mono">{device.serial}</span>
            {device.firmwareVersion && (
              <span>
                {t("devices.firmware")} <span className="font-mono">{device.firmwareVersion}</span>
              </span>
            )}
            <span>{t("device.readings", { n: formatNumber(rows.length, locale) })}</span>
          </div>
        </div>
        <nav aria-label={t("device.range")} className="inline-flex shrink-0 self-start rounded-xl border border-line bg-surface p-1 sm:self-center">
          {(["24h", "7d"] as const).map((r) => (
            <Link
              key={r}
              href={r === "24h" ? `/console/devices/${device.id}` : `/console/devices/${device.id}?range=7d`}
              aria-current={range === r ? "page" : undefined}
              scroll={false}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition",
                range === r ? "bg-surface-3 font-medium text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t(`device.range.${r}`)}
            </Link>
          ))}
        </nav>
      </div>

      {vitals.issues.length > 0 && (
        <ul className="mb-6 grid gap-2 sm:grid-cols-2">
          {vitals.issues.map((issue) => (
            <li key={issue.code} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
              <SeverityIcon severity={issue.severity} className="mt-0.5 shrink-0" />
              <span>
                <span className="sr-only">{t(`severity.${issue.severity}`)}: </span>
                {issueText(issue, device.name, t, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label={t("device.charts")} className="min-w-0 space-y-4">
          {charts.map(({ metric, label, values, summary }) => {
            const m = vitals.metrics[metric];
            const value = formatMetric(metric, m.value, locale);
            return (
              <Card key={metric} className="p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <MetricIcon metric={metric} className="text-muted" /> {label}
                  </h2>
                  <div className="text-right">
                    <p className="text-lg leading-none font-semibold">
                      {value ?? "—"}
                      {value && <span className="ml-0.5 text-xs font-normal text-muted">{METRIC_META[metric].unit === "lux" ? " lux" : METRIC_META[metric].unit}</span>}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                      {m.value !== null && <SeverityIcon severity={m.severity} className="h-3.5 w-3.5" />}
                      {metricStatusLabel(metric, vitals, snapshot?.growLightOn, t)}
                    </p>
                  </div>
                </div>
                <TelemetryChart
                  title={label}
                  unit={METRIC_META[metric].unit}
                  digits={METRIC_META[metric].digits}
                  values={values}
                  start={start.getTime()}
                  end={now.getTime()}
                  target={m.target}
                  domain={DOMAINS[metric]}
                  band={metric === "lightLux" ? growBand : undefined}
                  markers={metric === "soilMoisture" || metric === "waterLevel" ? pumpMarks : undefined}
                  labels={{
                    target: t("device.targetBand"),
                    band: t("device.growLightBand"),
                    markers: t("device.watering"),
                    empty: t("device.chartEmpty"),
                    summary,
                  }}
                  locale={locale}
                  timeZone={clock.timeZone}
                />
              </Card>
            );
          })}
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <SectionTitle>{t("device.autoCare")}</SectionTitle>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Droplets className={cn("h-4 w-4", actions.pumpSeconds > 0 ? "text-sky" : "text-faint")} aria-hidden />
                {actions.pumpSeconds > 0 ? t("device.autoCare.water", { s: actions.pumpSeconds }) : t("device.autoCare.noWater")}
              </li>
              <li className="flex items-center gap-2">
                {actions.growLightOn ? (
                  <Lightbulb className="h-4 w-4 text-sun" aria-hidden />
                ) : (
                  <LightbulbOff className="h-4 w-4 text-faint" aria-hidden />
                )}
                {actions.growLightOn ? t("device.autoCare.lightOn") : t("device.autoCare.lightOff")}
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle hint={plant ? t("device.targetsFor", { plant: lt(plant.name, locale) }) : undefined}>{t("device.targets")}</SectionTitle>
            <dl className="divide-y divide-line text-sm">
              {targets.map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <SectionTitle>{t("device.settings")}</SectionTitle>
            <DeviceSettingsForm device={{ id: device.id, name: device.name, plantId: device.plantId, potSize: device.potSize }} plants={plants} />
          </Card>

          <Card className="p-5">
            <SectionTitle>{t("device.danger")}</SectionTitle>
            <DeviceDangerZone device={{ id: device.id, name: device.name }} baseUrl={appUrl()} />
          </Card>
        </aside>
      </div>
    </>
  );
}
