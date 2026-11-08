import { ArrowRight, Droplets, Lightbulb, Moon } from "lucide-react";
import Link from "next/link";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { Badge, Card } from "@/components/ui/primitives";
import { getPlant, lt } from "@/data";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { formatRelative } from "@/lib/companion/format";
import type { PotSummary } from "@/lib/companion/queries";
import { isDemoSerial } from "./display";
import { PotStatusBadge, PresenceDot } from "./StatusBadge";
import { VitalTile } from "./VitalTile";
import { tileTexts } from "./vitals-text";

/** A pot on the overview: status, five vital signs with 24 h sparklines, auto-care. */
export async function PotCard({ pot, locale, now }: { pot: PotSummary; locale: Locale; now: Date }) {
  const t = await getT("console");
  const { device, vitals, actions, snapshot, series } = pot;
  const plant = getPlant(device.plantId);
  const tiles = tileTexts(vitals, snapshot?.growLightOn, t, locale);
  const seen = snapshot
    ? vitals.online
      ? `${t("status.online")} · ${t("status.seen", { time: formatRelative(snapshot.recordedAt, now, locale) })}`
      : `${t("status.offline")} · ${t("status.seen", { time: formatRelative(snapshot.recordedAt, now, locale) })}`
    : t("status.waiting");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-surface-2">
          {plant ? <PlantArt plantId={plant.id} width={40} animated={false} /> : <Moon className="mb-3 h-5 w-5 text-faint" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 font-semibold break-words">{device.name}</h3>
            {isDemoSerial(device.serial) && <Badge tone="neutral">{t("demo.badge")}</Badge>}
          </div>
          <p className="truncate text-sm text-muted">{plant ? lt(plant.name, locale) : t("device.unknownPlant")}</p>
          <div className="mt-1.5">
            <PresenceDot online={vitals.online} label={seen} />
          </div>
        </div>
        <PotStatusBadge vitals={vitals} statusLabel={t(`status.${vitals.status}`)} waitingLabel={t("status.new")} className="shrink-0" />
      </div>

      {snapshot ? (
        <>
          <p className="px-4 pb-2 text-xs text-faint sm:px-5">
            {t("device.charts")} · {t("overview.last24h")}
          </p>
          <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3 sm:px-5 lg:grid-cols-5">
            {tiles.map((tile) => (
              <VitalTile
                key={tile.metric}
                {...tile}
                state={vitals.metrics[tile.metric]}
                series={series[tile.metric]}
                className={tile.metric === "soilMoisture" ? "col-span-2 sm:col-span-1" : undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mx-4 rounded-xl border border-dashed border-line-strong px-4 py-5 text-sm text-muted sm:mx-5">{t("overview.waitingHint")}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
        <span className="mr-1 font-medium text-fg/80">{t("overview.autoCare")}</span>
        {actions.pumpSeconds > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 text-sky">
            <Droplets className="h-3.5 w-3.5" aria-hidden /> {t("overview.autoCare.water", { s: actions.pumpSeconds })}
          </span>
        )}
        {actions.growLightOn && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sun/10 px-2 py-0.5 text-sun">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> {t("overview.autoCare.light")}
          </span>
        )}
        {actions.pumpSeconds === 0 && !actions.growLightOn && <span>{t("overview.autoCare.idle")}</span>}
        <Link
          href={`/console/devices/${device.id}`}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-fg hover:bg-surface-2"
        >
          {t("overview.details")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
