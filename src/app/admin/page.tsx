import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, formatNumber, shortId } from "@/components/admin/format";
import { ORDER_STATUSES, PARTNER_STATUSES, REVENUE_STATUSES } from "@/components/admin/order-status";
import {
  BarList,
  DataTable,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  Panel,
  PartnerStatusBadge,
  StatTile,
  clickableRowClass,
  rowLinkClass,
} from "@/components/admin/ui";
import { countryName } from "@/components/partners/markets";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return { title: t("admin.overview.title") };
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, locale] = await Promise.all([getT("partners"), getLocale()]);

  const [
    ordersByStatus,
    revenue,
    appsByStatus,
    waitlistByCountry,
    waitlistTotal,
    recentOrders,
    recentApps,
  ] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.groupBy({
      by: ["currency"],
      where: { status: { in: REVENUE_STATUSES } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.partnerApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.waitlistEntry.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.waitlistEntry.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, createdAt: true, countryCode: true, currency: true, total: true, status: true, customerName: true, email: true },
    }),
    prisma.partnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, company: true, countryCode: true, status: true, createdAt: true },
    }),
  ]);

  const orderCount = (s: string) => ordersByStatus.find((r) => r.status === s)?._count._all ?? 0;
  const totalOrders = ordersByStatus.reduce((sum, r) => sum + r._count._all, 0);
  const paidOrders = REVENUE_STATUSES.reduce((sum, s) => sum + orderCount(s), 0);
  const appCount = (s: string) => appsByStatus.find((r) => r.status === s)?._count._all ?? 0;
  const totalApps = appsByStatus.reduce((sum, r) => sum + r._count._all, 0);
  const topWaitlist = [...waitlistByCountry].sort((a, b) => b._count._all - a._count._all).slice(0, 10);
  const revenueRows = [...revenue].sort((a, b) => b._count._all - a._count._all);

  return (
    <>
      <PageHeader title={t("admin.overview.title")} subtitle={t("admin.overview.subtitle")} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={t("admin.overview.kpi.orders")}
          value={formatNumber(totalOrders, locale)}
          hint={t("admin.overview.kpi.pending", { n: orderCount("PENDING") })}
          href="/admin/orders"
        />
        <StatTile
          label={t("admin.overview.kpi.paidOrders")}
          value={formatNumber(paidOrders, locale)}
          hint={t("admin.overview.kpi.toFulfil", { n: orderCount("PAID") })}
          href="/admin/orders?status=PAID"
        />
        <StatTile
          label={t("admin.overview.kpi.newApplications")}
          value={formatNumber(appCount("NEW"), locale)}
          hint={t("admin.overview.kpi.totalApplications", { n: totalApps })}
          href="/admin/partners?status=NEW"
          accent={appCount("NEW") > 0}
        />
        <StatTile
          label={t("admin.overview.kpi.waitlist")}
          value={formatNumber(waitlistTotal, locale)}
          hint={
            waitlistByCountry.length === 1
              ? t("admin.overview.kpi.waitlistCountriesOne")
              : t("admin.overview.kpi.waitlistCountries", { n: waitlistByCountry.length })
          }
          href="/admin/waitlist"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title={t("admin.overview.revenue")} description={t("admin.overview.revenueHint")}>
          {revenueRows.length === 0 ? (
            <EmptyState>{t("admin.overview.noRevenue")}</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {revenueRows.map((row) => (
                <li key={row.currency} className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-mono text-2xl font-semibold tracking-tight">
                      {formatMoney(row._sum.total ?? 0, row.currency, locale)}
                    </p>
                    <p className="mt-0.5 text-xs text-faint">
                      {row._count._all === 1
                        ? t("admin.overview.revenueOrdersOne")
                        : t("admin.overview.revenueOrders", { n: row._count._all })}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted uppercase">{row.currency}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("admin.overview.ordersByStatus")}>
          <BarList
            emptyText={t("admin.overview.noOrders")}
            items={
              totalOrders === 0
                ? []
                : ORDER_STATUSES.map((status) => ({
                    key: status,
                    label: <OrderStatusBadge status={status} label={t(`orderStatus.${status}`)} />,
                    value: orderCount(status),
                    href: `/admin/orders?status=${status}`,
                  }))
            }
          />
        </Panel>

        <Panel
          title={t("admin.overview.pipeline")}
          action={
            <Link href="/admin/partners" className="text-leaf-200 hover:text-leaf-100">
              {t("admin.viewAll")}
            </Link>
          }
        >
          <ul className="grid grid-cols-4 gap-2">
            {PARTNER_STATUSES.map((status) => (
              <li key={status}>
                <Link
                  href={`/admin/partners?status=${status}`}
                  className="block rounded-xl border border-line bg-surface-2/50 px-1.5 py-2.5 text-center transition-colors hover:border-line-strong"
                >
                  <span className="block font-mono text-xl font-semibold">{appCount(status)}</span>
                  <span className="mt-0.5 block truncate text-[0.7rem] text-muted">{t(`partnerStatus.${status}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 mb-2 text-xs font-medium tracking-wide text-faint uppercase">
            {t("admin.overview.recentApplications")}
          </h3>
          {recentApps.length === 0 ? (
            <EmptyState className="py-5">{t("admin.overview.noApplications")}</EmptyState>
          ) : (
            <ul className="-mx-2">
              {recentApps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/admin/partners/${app.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-2/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{app.company}</span>
                      <span className="block truncate text-xs text-faint">
                        {countryName(app.countryCode, locale)} · {formatDate(app.createdAt, locale)}
                      </span>
                    </span>
                    <PartnerStatusBadge status={app.status} label={t(`partnerStatus.${app.status}`)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          title={t("admin.overview.recentOrders")}
          action={
            <Link href="/admin/orders" className="text-leaf-200 hover:text-leaf-100">
              {t("admin.viewAll")}
            </Link>
          }
          bodyClassName="p-0"
        >
          {recentOrders.length === 0 ? (
            <div className="p-5">
              <EmptyState>{t("admin.overview.noOrders")}</EmptyState>
            </div>
          ) : (
            <DataTable bare>
                <thead>
                  <tr>
                    <th>{t("admin.orders.col.order")}</th>
                    <th className="hidden sm:table-cell">{t("admin.orders.col.customer")}</th>
                    <th className="text-right!">{t("admin.orders.col.total")}</th>
                    <th>{t("admin.orders.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className={clickableRowClass}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className={rowLinkClass}>
                          <span className="font-mono">#{shortId(order.id)}</span>
                        </Link>
                        <span className="block text-xs text-faint">
                          {order.countryCode} · {formatDate(order.createdAt, locale)}
                        </span>
                      </td>
                      <td className="hidden max-w-48 truncate text-muted sm:table-cell">
                        {order.customerName ?? order.email ?? t("admin.orders.guest")}
                      </td>
                      <td className="text-right font-mono whitespace-nowrap">
                        {formatMoney(order.total, order.currency, locale)}
                      </td>
                      <td>
                        <OrderStatusBadge status={order.status} label={t(`orderStatus.${order.status}`)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
          )}
        </Panel>

        <Panel
          title={t("admin.overview.waitlistTop")}
          action={
            <Link href="/admin/waitlist" className="text-leaf-200 hover:text-leaf-100">
              {t("admin.viewAll")}
            </Link>
          }
        >
          <BarList
            emptyText={t("admin.overview.noWaitlist")}
            items={topWaitlist.map((row) => ({
              key: row.countryCode,
              label: (
                <>
                  {countryName(row.countryCode, locale)}{" "}
                  <span className="font-mono text-[0.65rem] text-faint">{row.countryCode}</span>
                </>
              ),
              value: row._count._all,
              display: formatNumber(row._count._all, locale),
              href: `/admin/waitlist?country=${row.countryCode}`,
            }))}
          />
        </Panel>
      </div>
    </>
  );
}
