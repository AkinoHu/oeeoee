import type { Metadata } from "next";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/components/admin/format";
import { PartnerStatusControl } from "@/components/admin/StatusControls";
import { Field, PageHeader, Panel, PartnerStatusBadge } from "@/components/admin/ui";
import { applicationRef } from "@/components/partners/application";
import { BUSINESS_TYPES, CAPACITY_OPTIONS } from "@/components/partners/application-fields";
import { countryName } from "@/components/partners/markets";
import { StatusDot } from "@/components/partners/PartnerSections";
import { buttonVariants } from "@/components/ui/button";
import { getCountry } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/admin/partners/[id]">): Promise<Metadata> {
  await requireAdmin();
  const { id } = await params;
  const app = await prisma.partnerApplication.findUnique({ where: { id }, select: { company: true } });
  return { title: app?.company ?? (await getT("partners"))("admin.partners.title") };
}

const MARKET_STATUS_KEY = {
  recruiting: "markets.status.recruiting",
  planned: "markets.status.planned",
  live: "markets.status.live",
} as const;

export default async function AdminPartnerPage({ params }: PageProps<"/admin/partners/[id]">) {
  await requireAdmin();
  const [t, locale, { id }] = await Promise.all([getT("partners"), getLocale(), params]);

  const app = await prisma.partnerApplication.findUnique({ where: { id } });
  if (!app) notFound();

  const market = getCountry(app.countryCode);
  const country = countryName(app.countryCode, locale);
  const none = <span className="text-faint">{t("admin.none")}</span>;
  const businessType = (BUSINESS_TYPES as readonly string[]).includes(app.businessType)
    ? t(`business.${app.businessType as (typeof BUSINESS_TYPES)[number]}`)
    : app.businessType;
  const capacity =
    app.monthlyCapacity && (CAPACITY_OPTIONS as readonly string[]).includes(app.monthlyCapacity)
      ? t(`capacity.${app.monthlyCapacity as (typeof CAPACITY_OPTIONS)[number]}`)
      : app.monthlyCapacity;
  const mailto = `mailto:${app.email}?${new URLSearchParams({
    subject: t("admin.partner.mailSubject", { company: app.company }),
    body: t("admin.partner.mailBody", { name: app.contactName, country }),
  })
    .toString()
    .replace(/\+/g, "%20")}`;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/partners", label: t("admin.partner.back") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {app.company}
            <PartnerStatusBadge status={app.status} label={t(`partnerStatus.${app.status}`)} className="text-sm" />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t("admin.partner.received", { date: formatDateTime(app.createdAt, locale) })}</span>
            <span className="text-faint">·</span>
            <span>
              {t("admin.partner.reference")} <span className="font-mono text-fg/80">{applicationRef(app.id)}</span>
            </span>
          </span>
        }
        actions={
          <a href={mailto} className={buttonVariants({ size: "md" })}>
            <Mail className="h-4 w-4" aria-hidden />
            {t("admin.partner.emailCta", { name: app.contactName })}
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title={t("admin.partner.contact")}>
              <dl className="divide-y divide-line/60">
                <Field label={t("admin.partner.contact")}>{app.contactName}</Field>
                <Field label={t("admin.partner.email")}>
                  <a href={mailto} className="text-leaf-200 hover:underline">
                    {app.email}
                  </a>
                </Field>
                <Field label={t("admin.partner.phone")}>
                  {app.phone ? (
                    <a href={`tel:${app.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-3.5 w-3.5 text-faint" aria-hidden />
                      {app.phone}
                    </a>
                  ) : (
                    none
                  )}
                </Field>
                <Field label={t("admin.partner.website")}>
                  {app.website && /^https?:\/\//i.test(app.website) ? (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-leaf-200 hover:underline"
                    >
                      <span className="break-all">{app.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                    </a>
                  ) : (
                    (app.website ?? none)
                  )}
                </Field>
              </dl>
            </Panel>

            <Panel title={t("admin.partner.business")}>
              <dl className="divide-y divide-line/60">
                <Field label={t("admin.partner.type")}>{businessType}</Field>
                <Field label={t("admin.partner.capacity")}>{capacity ?? none}</Field>
                <Field label={t("admin.partner.location")}>
                  {app.city ? `${app.city}, ${country}` : country}
                  <span className="ml-1.5 font-mono text-xs text-faint">{app.countryCode}</span>
                </Field>
                <Field label={t("admin.partner.marketStatus")}>
                  {market ? (
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={market.partnerStatus} />
                      {t(MARKET_STATUS_KEY[market.partnerStatus])}
                    </span>
                  ) : (
                    none
                  )}
                </Field>
              </dl>
            </Panel>
          </div>

          <Panel title={t("admin.partner.species")}>
            {app.speciesNotes ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{app.speciesNotes}</p> : none}
          </Panel>
          <Panel title={t("admin.partner.message")}>
            {app.message ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{app.message}</p> : none}
          </Panel>
        </div>

        <Panel title={t("admin.partner.status")} description={t("admin.partner.statusHint")}>
          <PartnerStatusControl applicationId={app.id} current={app.status} />
        </Panel>
      </div>
    </>
  );
}
