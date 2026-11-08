import { OrderStatus, PartnerStatus } from "@/generated/prisma/enums";

/**
 * Order / partner-application status rules for the admin. Client-safe (only
 * the generated enum constants), so buttons and server actions share them.
 */

export type BadgeTone = "leaf" | "sky" | "sun" | "rose" | "neutral";

export const ORDER_STATUSES = Object.values(OrderStatus) as OrderStatus[];
export const PARTNER_STATUSES = Object.values(PartnerStatus) as PartnerStatus[];

/** Statuses that count as revenue (money captured and not given back). */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "FULFILLING", "SHIPPED", "DELIVERED"];

/** The happy path shown as a progress track. */
export const ORDER_FLOW: OrderStatus[] = ["PENDING", "PAID", "FULFILLING", "SHIPPED", "DELIVERED"];

/**
 * Allowed manual transitions. PENDING → PAID only happens through the Stripe
 * webhook, never by hand. CANCELED / REFUNDED are final.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CANCELED"],
  PAID: ["FULFILLING", "CANCELED", "REFUNDED"],
  FULFILLING: ["SHIPPED", "CANCELED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};

/** Targets that need an explicit confirmation in the UI. */
export const DESTRUCTIVE_STATUSES: OrderStatus[] = ["CANCELED", "REFUNDED"];

export function nextOrderStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return nextOrderStatuses(from).includes(to);
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as string[]).includes(value);
}

export function isPartnerStatus(value: unknown): value is PartnerStatus {
  return typeof value === "string" && (PARTNER_STATUSES as string[]).includes(value);
}

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: "neutral",
  PAID: "sun",
  FULFILLING: "sky",
  SHIPPED: "sky",
  DELIVERED: "leaf",
  CANCELED: "neutral",
  REFUNDED: "rose",
};

export const PARTNER_STATUS_TONE: Record<PartnerStatus, BadgeTone> = {
  NEW: "sun",
  CONTACTED: "sky",
  APPROVED: "leaf",
  REJECTED: "rose",
};

/** Result of an admin mutation, rendered next to the buttons. */
export type AdminActionState = { status: "idle" } | { status: "ok" | "error"; message: string; at: number };

export const idleActionState: AdminActionState = { status: "idle" };
