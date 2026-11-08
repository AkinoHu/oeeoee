"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canTransition, type AdminActionState } from "@/components/admin/order-status";
import { OrderStatus } from "@/generated/prisma/enums";
import { getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const input = z.object({
  orderId: z.string().min(1).max(64),
  /** Status the admin saw when clicking; guards against acting on stale data. */
  from: z.enum(OrderStatus),
  next: z.enum(OrderStatus),
});

/**
 * Moves an order along PAID → FULFILLING → SHIPPED → DELIVERED, or marks it
 * canceled / refunded. Only the DB status changes — refunds happen in Stripe.
 */
export async function updateOrderStatus(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const t = await getT("partners");
  const at = Date.now();

  const parsed = input.safeParse({
    orderId: formData.get("orderId"),
    from: formData.get("from"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { status: "error", message: t("admin.order.error.invalid"), at };
  const { orderId, from, next } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { status: "error", message: t("admin.order.error.notFound"), at };
  if (order.status !== from) return { status: "error", message: t("admin.order.error.conflict"), at };
  if (!canTransition(from, next)) return { status: "error", message: t("admin.order.error.invalid"), at };

  // Conditional update so two admins clicking at once can't both win.
  const { count } = await prisma.order.updateMany({ where: { id: orderId, status: from }, data: { status: next } });
  if (count === 0) return { status: "error", message: t("admin.order.error.conflict"), at };

  revalidatePath("/admin", "layout");
  return { status: "ok", message: t("admin.order.updated", { status: t(`orderStatus.${next}`) }), at };
}
