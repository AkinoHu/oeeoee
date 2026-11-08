import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { formatDateTime, parseCountryParam, parsePage, shortId } from "@/components/admin/format";
import { ORDER_STATUSES, isOrderStatus } from "@/components/admin/order-status";
import {
  DataTable,
  EmptyState,
  FilterPills,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  clickableRowClass,
  rowLinkClass,
} from "@/components/admin/ui";
import { countryName } from "@/components/partners/markets";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/session";

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return { title: t("admin.orders.title") };
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const [t, locale, params] = await Promise.all([getT("partners"), getLocale(), searchParams]);

  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isOrderStatus(rawStatus) ? rawStatus : undefined;
  const country = parseCountryParam(params.country);
  const page = parsePage(params.page);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(country ? { countryCode: country } : {}),
  };

  const [total, orders, statusCounts, countries] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        countryCode: true,
        currency: true,
        total: true,
        status: true,
        customerName: true,
        email: true,
        items: { select: { name: true, quantity: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], where: country ? { countryCode: country } : {}, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["countryCode"], _count: { _all: true }, orderBy: { countryCode: "asc" } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: { status?: string; country?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (next.status) qs.set("status", next.status);
    if (next.country) qs.set("country", next.country);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    const s = qs.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };
  const countFor = (s: string) => statusCounts.find((r) => r.status === s)?._count._all ?? 0;
  const allCount = statusCounts.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <>
      <PageHeader title={t("admin.orders.title")} subtitle={t("admin.orders.subtitle")} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          label={t("admin.orders.col.status")}
          items={[
            { key: "all", label: t("admin.filter.all"), count: allCount, href: href({ country }), active: !status },
            ...ORDER_STATUSES.map((s) => ({
              key: s,
              label: t(`orderStatus.${s}`),
              count: countFor(s),
              href: href({ status: s, country }),
              active: status === s,
            })),
          ]}
        />
        <Form action="/admin/orders" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="orders-country" className="sr-only">
            {t("admin.filter.country")}
          </label>
          <AutoSubmitSelect id="orders-country" name="country" defaultValue={country ?? ""} className="h-9 w-full lg:w-56">
            <option value="">{t("admin.filter.allCountries")}</option>
            {countries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {countryName(c.countryCode, locale)} ({c._count._all})
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <Button type="submit" size="sm" variant="secondary">
              {t("admin.filter.apply")}
            </Button>
          </noscript>
        </Form>
      </div>

      {orders.length === 0 ? (
        <EmptyState className="py-16">{t("admin.orders.empty")}</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>{t("admin.orders.col.order")}</th>
              <th className="hidden md:table-cell">{t("admin.orders.col.customer")}</th>
              <th className="hidden lg:table-cell">{t("admin.orders.col.items")}</th>
              <th className="text-right!">{t("admin.orders.col.total")}</th>
              <th>{t("admin.orders.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
              const summary = order.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(", ");
              return (
                <tr key={order.id} className={clickableRowClass}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className={rowLinkClass}>
                      <span className="font-mono">#{shortId(order.id)}</span>
                    </Link>
                    <span className="block text-xs whitespace-nowrap text-faint">
                      {formatDateTime(order.createdAt, locale)}
                    </span>
                    <span className="block text-xs text-faint md:hidden">
                      {order.customerName ?? order.email ?? t("admin.orders.guest")}
                    </span>
                  </td>
                  <td className="hidden md:table-cell">
                    <span className="block max-w-56 truncate">
                      {order.customerName ?? order.email ?? t("admin.orders.guest")}
                    </span>
                    <span className="block max-w-56 truncate text-xs text-faint">
                      {order.customerName && order.email ? `${order.email} · ` : ""}
                      {countryName(order.countryCode, locale)}
                    </span>
                  </td>
                  <td className="hidden max-w-72 lg:table-cell">
                    <span className="block truncate text-muted" title={summary}>
                      {summary || t("admin.none")}
                    </span>
                    <span className="block text-xs text-faint">{itemCount === 1 ? t("admin.orders.itemCountOne") : t("admin.orders.itemCount", { n: itemCount })}</span>
                  </td>
                  <td className="text-right font-mono whitespace-nowrap">{formatMoney(order.total, order.currency, locale)}</td>
                  <td>
                    <OrderStatusBadge status={order.status} label={t(`orderStatus.${order.status}`)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <Pagination
        page={page}
        pages={pages}
        hrefFor={(p) => href({ status, country, page: p })}
        labels={{
          nav: t("admin.pagination.label"),
          prev: t("admin.pagination.prev"),
          next: t("admin.pagination.next"),
          page: t("admin.pagination.page", { page, pages }),
        }}
      />
    </>
  );
}
