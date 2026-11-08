import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/console/PageHeader";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import type { OrderStatus } from "@/generated/prisma/client";
import { getLocale, getT } from "@/i18n/server";
import { formatDate } from "@/lib/companion/format";
import { companionClock, getOrCreateCompanion } from "@/lib/companion/queries";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("console"))("orders.title") };
}

const STATUS_TONE: Record<OrderStatus, "leaf" | "sky" | "sun" | "rose" | "neutral"> = {
  PENDING: "sun",
  PAID: "sky",
  FULFILLING: "sky",
  SHIPPED: "leaf",
  DELIVERED: "leaf",
  CANCELED: "neutral",
  REFUNDED: "neutral",
};

export default async function OrdersPage() {
  const user = await requireUser("/console/orders");
  const [t, locale, companion] = await Promise.all([getT("console"), getLocale(), getOrCreateCompanion(user.id)]);
  const { timeZone } = companionClock(companion);
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <>
      <PageHeader title={t("orders.title")} description={t("orders.subtitle")} />
      {orders.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
            <Package className="h-6 w-6 text-leaf-300" aria-hidden />
          </span>
          <p className="text-sm text-muted">{t("orders.empty")}</p>
          <ButtonLink href="/" variant="secondary">
            {t("orders.shop")}
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">{t("orders.order", { id: order.id.slice(-8).toUpperCase() })}</p>
                    <p className="mt-0.5 text-xs text-muted">{t("orders.placed", { date: formatDate(order.createdAt, locale, timeZone) })}</p>
                  </div>
                  <Badge tone={STATUS_TONE[order.status]}>{t(`orders.status.${order.status}`)}</Badge>
                </div>
                <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">
                        {item.name} <span className="text-muted">{t("orders.qty", { n: item.quantity })}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {formatMoney(item.unitAmount * item.quantity, order.currency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 text-sm">
                  {order.shippingAmount > 0 && (
                    <span className="text-muted">
                      {t("orders.shipping")} <span className="tabular-nums">{formatMoney(order.shippingAmount, order.currency, locale)}</span>
                    </span>
                  )}
                  <span>
                    {t("orders.total")} <span className="ml-1 font-semibold tabular-nums">{formatMoney(order.total, order.currency, locale)}</span>
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
