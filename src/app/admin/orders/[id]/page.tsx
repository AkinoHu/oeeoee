import type { Metadata } from "next";
import { ExternalLink, Info } from "lucide-react";
import { notFound } from "next/navigation";
import { formatAddress, formatDateTime, shortId, stripePaymentUrl } from "@/components/admin/format";
import { ORDER_FLOW } from "@/components/admin/order-status";
import { OrderStatusActions } from "@/components/admin/StatusControls";
import { DataTable, Field, OrderStatusBadge, PageHeader, Panel } from "@/components/admin/ui";
import { countryName } from "@/components/partners/markets";
import { Badge } from "@/components/ui/primitives";
import { localeLabels, isLocale } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const [t, { id }] = await Promise.all([getT("partners"), params]);
  return { title: t("admin.order.title", { id: `#${shortId(id)}` }) };
}

const KIND_KEYS = { pot: "admin.order.kind.pot", plant: "admin.order.kind.plant", addon: "admin.order.kind.addon" } as const;

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const [t, locale, { id }] = await Promise.all([getT("partners"), getLocale(), params]);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, order.currency, locale);
  const address = formatAddress(order.shippingAddress, (code) => countryName(code, locale));
  const testMode =
    order.stripeSessionId?.startsWith("cs_test_") || process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || false;
  const flowIndex = ORDER_FLOW.indexOf(order.status);
  const none = <span className="text-faint">{t("admin.none")}</span>;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: t("admin.order.back") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{t("admin.order.title", { id: `#${shortId(order.id)}` })}</span>
            <OrderStatusBadge status={order.status} label={t(`orderStatus.${order.status}`)} className="text-sm" />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t("admin.order.placed", { date: formatDateTime(order.createdAt, locale) })}</span>
            <span className="text-faint">·</span>
            <span>{countryName(order.countryCode, locale)}</span>
            <span className="hidden text-faint sm:inline">·</span>
            <span className="hidden font-mono text-xs text-faint sm:inline">{order.id}</span>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-4">
          <Panel title={t("admin.order.items")} bodyClassName="p-0">
            <DataTable bare>
              <thead>
                <tr>
                  <th>{t("admin.order.col.item")}</th>
                  <th className="text-right!">{t("admin.order.col.qty")}</th>
                  <th className="hidden text-right! sm:table-cell">{t("admin.order.col.unit")}</th>
                  <th className="text-right!">{t("admin.order.col.total")}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        {item.kind in KIND_KEYS && (
                          <Badge className="text-[0.65rem]">{t(KIND_KEYS[item.kind as keyof typeof KIND_KEYS])}</Badge>
                        )}
                      </span>
                      <span className="block font-mono text-xs text-faint">{item.sku}</span>
                    </td>
                    <td className="text-right font-mono">{item.quantity}</td>
                    <td className="hidden text-right font-mono whitespace-nowrap text-muted sm:table-cell">
                      {money(item.unitAmount)}
                    </td>
                    <td className="text-right font-mono whitespace-nowrap">{money(item.unitAmount * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <dl className="space-y-2 border-t border-line px-4 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("admin.order.subtotal")}</dt>
                <dd className="font-mono">{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("admin.order.shipping")}</dt>
                <dd className="font-mono">{order.shippingAmount === 0 ? t("admin.order.free") : money(order.shippingAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
                <dt>{t("admin.order.total")}</dt>
                <dd className="font-mono text-leaf-200">{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title={t("admin.order.customer")}>
              <dl className="divide-y divide-line/60">
                <Field label={t("admin.order.name")}>{order.customerName ?? none}</Field>
                <Field label={t("admin.order.email")}>
                  {order.email ? (
                    <a href={`mailto:${order.email}`} className="text-leaf-200 hover:underline">
                      {order.email}
                    </a>
                  ) : (
                    none
                  )}
                </Field>
                <Field label={t("admin.order.phone")}>
                  {order.phone ? (
                    <a href={`tel:${order.phone}`} className="hover:underline">
                      {order.phone}
                    </a>
                  ) : (
                    none
                  )}
                </Field>
                <Field label={t("admin.order.account")}>
                  {order.user ? (
                    <span>
                      {order.user.name}
                      <span className="block text-xs text-faint">{order.user.email}</span>
                    </span>
                  ) : (
                    <span className="text-muted">{t("admin.order.guest")}</span>
                  )}
                </Field>
                <Field label={t("admin.order.locale")}>
                  {order.locale && isLocale(order.locale) ? localeLabels[order.locale] : (order.locale ?? none)}
                </Field>
              </dl>
            </Panel>

            <Panel title={t("admin.order.address")}>
              {address ? (
                <div className="space-y-4">
                  <address className="text-sm leading-relaxed not-italic">
                    {address.recipient.map((line, i) => (
                      <span key={`r${i}`} className="block font-medium">
                        {line}
                      </span>
                    ))}
                    {address.lines.map((line, i) => (
                      <span key={`l${i}`} className="block text-fg/90">
                        {line}
                      </span>
                    ))}
                  </address>
                  {address.extra.length > 0 && (
                    <dl className="divide-y divide-line/60 border-t border-line pt-3">
                      {address.extra.map(([key, value]) => (
                        <Field key={key} label={key}>
                          {value}
                        </Field>
                      ))}
                    </dl>
                  )}
                  <details className="group text-xs">
                    <summary className="cursor-pointer text-muted select-none hover:text-fg">{t("admin.order.rawJson")}</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-line bg-bg p-3 font-mono text-[0.7rem] leading-relaxed text-muted">
                      {JSON.stringify(order.shippingAddress, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-sm text-faint">{t("admin.order.noAddress")}</p>
              )}
            </Panel>
          </div>
        </div>

        <div className="order-first space-y-4 lg:order-none">
          <Panel title={t("admin.order.status")}>
            <ol className="mb-5 flex items-center gap-1" aria-label={t("admin.order.status")}>
              {ORDER_FLOW.map((step, i) => {
                const reached = flowIndex >= i;
                return (
                  <li key={step} className="flex flex-1 flex-col gap-1.5" aria-current={step === order.status ? "step" : undefined}>
                    <span
                      className={cn(
                        "h-1.5 rounded-full",
                        reached ? "bg-leaf-400" : "bg-surface-3",
                        flowIndex === -1 && "bg-surface-3",
                      )}
                    />
                    <span className={cn("truncate text-[0.65rem]", step === order.status ? "text-fg" : "text-faint")}>
                      {t(`orderStatus.${step}`)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <h3 className="mb-3 text-xs font-medium tracking-wide text-faint uppercase">{t("admin.order.actions")}</h3>
            <OrderStatusActions orderId={order.id} current={order.status} />
            <p className="mt-4 flex gap-2 rounded-xl border border-line bg-surface-2/50 p-3 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky" aria-hidden />
              {t("admin.order.refundNote")}
            </p>
          </Panel>

          <Panel title={t("admin.order.payment")}>
            <dl className="divide-y divide-line/60">
              <Field label={t("admin.order.paidAt")}>
                {order.paidAt ? formatDateTime(order.paidAt, locale) : none}
              </Field>
              <Field label={t("admin.order.stripeSession")}>
                {order.stripeSessionId ? <code className="font-mono text-xs break-all">{order.stripeSessionId}</code> : none}
              </Field>
              <Field label={t("admin.order.paymentIntent")}>
                {order.stripePaymentIntentId ? (
                  <span className="space-y-1">
                    <code className="block font-mono text-xs break-all">{order.stripePaymentIntentId}</code>
                    <a
                      href={stripePaymentUrl(order.stripePaymentIntentId, testMode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-leaf-200 hover:underline"
                    >
                      {t("admin.order.openStripe")} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </span>
                ) : (
                  none
                )}
              </Field>
              <Field label={t("admin.order.updatedAt")}>{formatDateTime(order.updatedAt, locale)}</Field>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
