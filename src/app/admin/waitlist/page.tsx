import type { Metadata } from "next";
import { Download } from "lucide-react";
import Link from "next/link";
import { daysAgo, formatDateTime, formatNumber, parseCountryParam } from "@/components/admin/format";
import { BarList, DataTable, EmptyState, PageHeader, Panel, StatTile } from "@/components/admin/ui";
import { countryName } from "@/components/partners/markets";
import { buttonVariants } from "@/components/ui/button";
import { localeLabels, isLocale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const RECENT = 50;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return { title: t("admin.waitlist.title") };
}

export default async function AdminWaitlistPage({ searchParams }: PageProps<"/admin/waitlist">) {
  await requireAdmin();
  const [t, locale, params] = await Promise.all([getT("partners"), getLocale(), searchParams]);
  const country = parseCountryParam(params.country);
  const weekAgo = daysAgo(7);

  const [byCountry, total, lastWeek, recent] = await Promise.all([
    prisma.waitlistEntry.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.waitlistEntry.findMany({
      where: country ? { countryCode: country } : {},
      orderBy: { createdAt: "desc" },
      take: RECENT,
    }),
  ]);

  const ranked = [...byCountry].sort((a, b) => b._count._all - a._count._all);
  const exportHref = country ? `/admin/waitlist/export?country=${country}` : "/admin/waitlist/export";

  return (
    <>
      <PageHeader
        title={t("admin.waitlist.title")}
        subtitle={t("admin.waitlist.subtitle")}
        actions={
          <a href={exportHref} className={buttonVariants({ variant: "secondary" })} download>
            <Download className="h-4 w-4" aria-hidden />
            {t("admin.waitlist.export")}
            {country && <span className="font-mono text-xs text-muted">{country}</span>}
          </a>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile label={t("admin.waitlist.total")} value={formatNumber(total, locale)} accent />
        <StatTile label={t("admin.waitlist.countries")} value={formatNumber(byCountry.length, locale)} />
        <StatTile label={t("admin.waitlist.last7")} value={formatNumber(lastWeek, locale)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <Panel
          title={t("admin.waitlist.byCountry")}
          action={
            country ? (
              <Link href="/admin/waitlist" className="text-leaf-200 hover:text-leaf-100">
                {t("admin.filter.reset")}
              </Link>
            ) : undefined
          }
        >
          <BarList
            emptyText={t("admin.waitlist.empty")}
            items={ranked.map((row) => ({
              key: row.countryCode,
              label: (
                <span className={row.countryCode === country ? "font-semibold text-leaf-100" : undefined}>
                  {countryName(row.countryCode, locale)}{" "}
                  <span className="font-mono text-[0.65rem] text-faint">{row.countryCode}</span>
                </span>
              ),
              value: row._count._all,
              display: formatNumber(row._count._all, locale),
              href: row.countryCode === country ? "/admin/waitlist" : `/admin/waitlist?country=${row.countryCode}`,
            }))}
          />
        </Panel>

        <Panel
          title={country ? `${t("admin.waitlist.recent")} — ${countryName(country, locale)}` : t("admin.waitlist.recent")}
          description={recent.length >= RECENT ? t("admin.waitlist.showing", { n: RECENT }) : undefined}
          bodyClassName="p-0"
        >
          {recent.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("admin.waitlist.empty")}</EmptyState>
            </div>
          ) : (
            <DataTable bare>
              <thead>
                <tr>
                  <th>{t("admin.waitlist.col.email")}</th>
                  <th className="hidden sm:table-cell">{t("admin.waitlist.col.country")}</th>
                  <th className="hidden md:table-cell">{t("admin.waitlist.col.locale")}</th>
                  <th className="hidden sm:table-cell">{t("admin.waitlist.col.date")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="max-w-64">
                      <span className="block truncate">{entry.email}</span>
                      <span className="block text-xs text-faint sm:hidden">
                        {countryName(entry.countryCode, locale)} · {formatDateTime(entry.createdAt, locale)}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap sm:table-cell">
                      {countryName(entry.countryCode, locale)}{" "}
                      <span className="font-mono text-[0.65rem] text-faint">{entry.countryCode}</span>
                    </td>
                    <td className="hidden text-muted md:table-cell">
                      {entry.locale && isLocale(entry.locale) ? localeLabels[entry.locale] : (entry.locale ?? t("admin.none"))}
                    </td>
                    <td className="hidden text-xs whitespace-nowrap text-muted sm:table-cell">{formatDateTime(entry.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>
      </div>
    </>
  );
}
