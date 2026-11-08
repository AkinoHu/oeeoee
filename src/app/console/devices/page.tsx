import type { Metadata } from "next";
import { ChevronRight, Cpu } from "lucide-react";
import Link from "next/link";
import { AddDeviceForm } from "@/components/console/AddDeviceForm";
import { DemoPotButton } from "@/components/console/DemoPotButton";
import { isDemoSerial } from "@/components/console/display";
import { MetricIcon } from "@/components/console/MetricIcon";
import { PageHeader, SectionTitle } from "@/components/console/PageHeader";
import { PotStatusBadge, PresenceDot } from "@/components/console/StatusBadge";
import { formatMetric } from "@/components/console/vitals-text";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { Badge, Card } from "@/components/ui/primitives";
import { getPlant, listPlants, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { formatDate, formatRelative } from "@/lib/companion/format";
import { companionClock, getOrCreateCompanion, loadPots } from "@/lib/companion/queries";
import { appUrl } from "@/lib/env";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("console"))("devices.title") };
}

export default async function DevicesPage() {
  const user = await requireUser("/console/devices");
  const [t, locale, companion] = await Promise.all([getT("console"), getLocale(), getOrCreateCompanion(user.id)]);
  const clock = companionClock(companion);
  const now = new Date();
  const pots = await loadPots(user.id, now, clock.vitalsOptions);
  const plants = listPlants()
    .map((p) => ({ id: p.id, name: lt(p.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <>
      <PageHeader title={t("devices.title")} description={t("devices.subtitle")} actions={<DemoPotButton variant="secondary" label={t("demo.another")} redirectTo="device" />} />

      <Card id="add" className="mb-6 scroll-mt-28 p-5 sm:p-6">
        <SectionTitle hint={t("devices.addHint")}>{t("devices.add")}</SectionTitle>
        <AddDeviceForm plants={plants} baseUrl={appUrl()} />
      </Card>

      {pots.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Cpu className="h-6 w-6 text-leaf-300" aria-hidden />
          <p className="max-w-sm text-sm text-muted">{t("devices.empty")}</p>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {pots.map(({ device, vitals, snapshot }) => {
            const plant = getPlant(device.plantId);
            const seen = snapshot ? formatRelative(snapshot.recordedAt, now, locale) : t("time.never");
            return (
              <li key={device.id}>
                <Link
                  href={`/console/devices/${device.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong hover:bg-surface-2/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-surface-2">
                      {plant && <PlantArt plantId={plant.id} width={36} animated={false} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{device.name}</span>
                        {isDemoSerial(device.serial) && <Badge>{t("demo.badge")}</Badge>}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {plant ? lt(plant.name, locale) : device.plantId ? t("device.unknownPlant") : t("devices.plantNone")}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <PotStatusBadge vitals={vitals} statusLabel={t(`status.${vitals.status}`)} waitingLabel={t("status.new")} />
                    <PresenceDot online={vitals.online} label={vitals.online ? t("status.online") : t("status.offline")} />
                    {(["soilMoisture", "waterLevel"] as const).map((m) => {
                      const value = formatMetric(m, vitals.metrics[m].value, locale);
                      return value ? (
                        <span key={m} className="inline-flex items-center gap-1 text-xs text-muted">
                          <MetricIcon metric={m} className="h-3.5 w-3.5" />
                          <span className="sr-only">{t(`metric.${m}`)}</span>
                          {value}%
                        </span>
                      ) : null;
                    })}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-faint">{t("devices.serial")}</dt>
                      <dd className="mt-0.5 truncate font-mono text-fg/80">{device.serial}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-faint">{t("devices.lastSeen")}</dt>
                      <dd className="mt-0.5 truncate text-fg/80">{seen}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-faint">{t("devices.added")}</dt>
                      <dd className="mt-0.5 truncate text-fg/80">{formatDate(device.createdAt, locale, clock.timeZone)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
