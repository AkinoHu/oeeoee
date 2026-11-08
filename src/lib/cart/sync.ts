import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { orderIdFromSession, paidOrderUpdate } from "@/lib/orders";

/**
 * Order state transitions driven by Stripe. Shared by the webhook and the
 * success page (which reconciles in case the webhook hasn't arrived yet).
 * Every transition is a conditional update, so replays are harmless.
 */

async function findOrderId(session: Stripe.Checkout.Session): Promise<string | null> {
  const byMeta = orderIdFromSession(session);
  const order = await prisma.order.findFirst({
    where: byMeta ? { id: byMeta } : { stripeSessionId: session.id },
    select: { id: true, stripeSessionId: true },
  });
  if (!order) return null;
  // The session must be the one we created for this order.
  if (order.stripeSessionId && order.stripeSessionId !== session.id) return null;
  return order.id;
}

export type SyncResult = "paid" | "canceled" | "unchanged" | "not_found" | "not_paid";

/** PENDING (or CANCELED by an earlier expiry race) → PAID, only when Stripe says it's paid. */
export async function markOrderPaid(session: Stripe.Checkout.Session): Promise<SyncResult> {
  if (session.payment_status !== "paid") return "not_paid";
  const orderId = await findOrderId(session);
  if (!orderId) return "not_found";
  const { shippingAddress, ...update } = paidOrderUpdate(session);
  const res = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING", "CANCELED"] } },
    data: {
      ...update,
      shippingAddress: shippingAddress ? (shippingAddress as Prisma.InputJsonValue) : Prisma.DbNull,
      stripeSessionId: session.id,
    },
  });
  return res.count ? "paid" : "unchanged";
}

/** PENDING → CANCELED (expired session or failed async payment). Never touches paid orders. */
export async function markOrderCanceled(session: Stripe.Checkout.Session): Promise<SyncResult> {
  const orderId = await findOrderId(session);
  if (!orderId) return "not_found";
  const res = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELED" },
  });
  return res.count ? "canceled" : "unchanged";
}
