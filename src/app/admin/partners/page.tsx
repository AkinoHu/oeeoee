import type { Metadata } from "next";
import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { firstParam, formatDate, parseCountryParam, parsePage } from "@/components/admin/format";
import { PARTNER_STATUSES, isPartnerStatus } from "@/components/admin/order-status";
import {
  DataTable,
  EmptyState,
  FilterPills,
  PageHeader,
  Pagination,
  PartnerStatusBadge,
  clickableRowClass,
  rowLinkClass,
} from "@/components/admin/ui";
import { BUSINESS_TYPES, CAPACITY_OPTIONS } from "@/components/partners/application-fields";
import { countryName } from "@/components/partners/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import type { Prisma } from "@/generated/prisma/client";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const PAGE_SIZE = 25;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("partners");
  return { title: t("admin.partners.title") };
}

export default async function AdminPartnersPage({ searchParams }: PageProps<"/admin/partners">) {
  await requireAdmin();
  const [t, locale, params] = await Promise.all([getT("partners"), getLocale(), searchParams]);

  const rawStatus = firstParam(params.status);
  const status = isPartnerStatus(rawStatus) ? rawStatus : undefined;
  const country = parseCountryParam(params.country);
  const q = firstParam(params.q)?.trim().slice(0, 100) || undefined;
  const page = parsePage(params.page);

  const base: Prisma.PartnerApplicationWhereInput = {
    ...(country ? { countryCode: country } : {}),
    ...(q
      ? {
          OR: [
            { company: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.PartnerApplicationWhereInput = { ...base, ...(status ? { status } : {}) };

  const [total, apps, statusCounts, countries] = await Promise.all([
    prisma.partnerApplication.count({ where }),
    prisma.partnerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        company: true,
        contactName: true,
        email: true,
        countryCode: true,
        city: true,
        businessType: true,
        monthlyCapacity: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.partnerApplication.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.partnerApplication.groupBy({ by: ["countryCode"], _count: { _all: true }, orderBy: { countryCode: "asc" } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (next: { status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (next.status) qs.set("status", next.status);
    if (country) qs.set("country", country);
    if (q) qs.set("q", q);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    const s = qs.toString();
    return s ? `/admin/partners?${s}` : "/admin/partners";
  };
  const countFor = (s: string) => statusCounts.find((r) => r.status === s)?._count._all ?? 0;
  const allCount = statusCounts.reduce((sum, r) => sum + r._count._all, 0);
  const businessLabel = (type: string) =>
    (BUSINESS_TYPES as readonly string[]).includes(type) ? t(`business.${type as (typeof BUSINESS_TYPES)[number]}`) : type;
  const capacityLabel = (c: string | null) =>
    c && (CAPACITY_OPTIONS as readonly string[]).includes(c) ? t(`capacity.${c as (typeof CAPACITY_OPTIONS)[number]}`) : c;

  return (
    <>
      <PageHeader title={t("admin.partners.title")} subtitle={t("admin.partners.subtitle")} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          label={t("admin.partners.col.status")}
          items={[
            { key: "all", label: t("admin.filter.all"), count: allCount, href: href({}), active: !status },
            ...PARTNER_STATUSES.map((s) => ({
              key: s,
              label: t(`partnerStatus.${s}`),
              count: countFor(s),
              href: href({ status: s }),
              active: status === s,
            })),
          ]}
        />
        <Form action="/admin/partners" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <label htmlFor="partners-q" className="sr-only">
              {t("admin.filter.search")}
            </label>
            <Input
              id="partners-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("admin.filter.searchPlaceholder")}
              className="h-9 pl-9 sm:w-64"
            />
          </div>
          <label htmlFor="partners-country" className="sr-only">
            {t("admin.filter.country")}
          </label>
          <AutoSubmitSelect id="partners-country" name="country" defaultValue={country ?? ""} className="h-9 sm:w-48">
            <option value="">{t("admin.filter.allCountries")}</option>
            {countries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {countryName(c.countryCode, locale)} ({c._count._all})
              </option>
            ))}
          </AutoSubmitSelect>
          <Button type="submit" size="sm" variant="secondary" className="h-9">
            {t("admin.filter.apply")}
          </Button>
          {(q || country) && (
            <Link href={status ? `/admin/partners?status=${status}` : "/admin/partners"} className="px-1 text-sm text-muted hover:text-fg">
              {t("admin.filter.reset")}
            </Link>
          )}
        </Form>
      </div>

      {apps.length === 0 ? (
        <EmptyState className="py-16">{t("admin.partners.empty")}</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>{t("admin.partners.col.company")}</th>
              <th className="hidden sm:table-cell">{t("admin.partners.col.country")}</th>
              <th className="hidden md:table-cell">{t("admin.partners.col.type")}</th>
              <th className="hidden lg:table-cell">{t("admin.partners.col.capacity")}</th>
              <th className="hidden md:table-cell">{t("admin.partners.col.received")}</th>
              <th>{t("admin.partners.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id} className={clickableRowClass}>
                <td>
                  <Link href={`/admin/partners/${app.id}`} className={rowLinkClass}>
                    {app.company}
                  </Link>
                  <span className="block max-w-64 truncate text-xs text-faint">
                    {app.contactName} · {app.email}
                  </span>
                  <span className="block text-xs text-faint sm:hidden">{countryName(app.countryCode, locale)}</span>
                </td>
                <td className="hidden sm:table-cell">
                  <span className="whitespace-nowrap">{countryName(app.countryCode, locale)}</span>
                  {app.city && <span className="block max-w-40 truncate text-xs text-faint">{app.city}</span>}
                </td>
                <td className="hidden text-muted md:table-cell">{businessLabel(app.businessType)}</td>
                <td className="hidden whitespace-nowrap text-muted lg:table-cell">
                  {capacityLabel(app.monthlyCapacity) ?? <span className="text-faint">{t("admin.none")}</span>}
                </td>
                <td className="hidden whitespace-nowrap text-muted md:table-cell">{formatDate(app.createdAt, locale)}</td>
                <td>
                  <PartnerStatusBadge status={app.status} label={t(`partnerStatus.${app.status}`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Pagination
        page={page}
        pages={pages}
        hrefFor={(p) => href({ status, page: p })}
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
