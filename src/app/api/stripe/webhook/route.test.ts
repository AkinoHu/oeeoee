import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory stand-in for the two Prisma calls the order sync makes. */
interface FakeOrder {
  id: string;
  status: string;
  stripeSessionId: string | null;
  [key: string]: unknown;
}
const db = vi.hoisted(() => ({ orders: new Map<string, FakeOrder>() }));

vi.mock("@/lib/db", () => {
  const matches = (o: FakeOrder, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === "object" && "in" in v) return (v as { in: unknown[] }).in.includes(o[k]);
      return o[k] === v;
    });
  return {
    prisma: {
      order: {
        findFirst: async ({ where }: { where: Record<string, unknown> }) =>
          [...db.orders.values()].find((o) => matches(o, where)) ?? null,
        updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          let count = 0;
          for (const o of db.orders.values()) {
            if (matches(o, where)) {
              Object.assign(o, data);
              count++;
            }
          }
          return { count };
        },
      },
    },
  };
});

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    object: "checkout.session",
    client_reference_id: "order_1",
    metadata: { orderId: "order_1" },
    payment_status: "paid",
    payment_intent: "pi_1",
    customer_details: { name: "Billing", phone: "+1 555 0100", email: "a@example.com" },
    collected_information: { shipping_details: { name: "Ship To", address: { country: "US", line1: "1 Main St" } } },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

async function deliver(type: string, object: Stripe.Checkout.Session, { secret = SECRET } = {}) {
  const payload = JSON.stringify({ id: `evt_${Math.random()}`, object: "event", type, data: { object } });
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
  const { POST } = await import("./route");
  return POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  db.orders.clear();
  db.orders.set("order_1", { id: "order_1", status: "PENDING", stripeSessionId: "cs_test_1" });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/webhook", () => {
  it("rejects a bad signature without touching orders", async () => {
    const res = await deliver("checkout.session.completed", session(), { secret: "whsec_wrong" });
    expect(res.status).toBe(400);
    expect(db.orders.get("order_1")!.status).toBe("PENDING");
  });

  it("marks the order paid once, storing shipping details, and ignores replays", async () => {
    const first = await deliver("checkout.session.completed", session());
    expect(await first.json()).toMatchObject({ result: "paid" });
    const order = db.orders.get("order_1")!;
    expect(order).toMatchObject({ status: "PAID", stripePaymentIntentId: "pi_1", customerName: "Ship To", phone: "+1 555 0100" });
    expect(order.shippingAddress).toEqual({ name: "Ship To", address: { country: "US", line1: "1 Main St" } });

    const replay = await deliver("checkout.session.completed", session());
    expect(await replay.json()).toMatchObject({ result: "unchanged" });
  });

  it("stores the address from an endpoint on a pre-2025-03-31 API version", async () => {
    const legacy = session({ collected_information: null });
    Object.assign(legacy, { shipping_details: { name: "Old API", address: { country: "US", line1: "2 Elm St" } } });
    await deliver("checkout.session.completed", legacy);
    expect(db.orders.get("order_1")!.shippingAddress).toEqual({ name: "Old API", address: { country: "US", line1: "2 Elm St" } });
  });

  it("never cancels a paid order when a late expiry/failure arrives", async () => {
    await deliver("checkout.session.completed", session());
    const late = await deliver("checkout.session.expired", session({ payment_status: "unpaid" }));
    expect(await late.json()).toMatchObject({ result: "unchanged" });
    expect(db.orders.get("order_1")!.status).toBe("PAID");
  });

  it("waits for async payments, then pays or cancels", async () => {
    const pending = await deliver("checkout.session.completed", session({ payment_status: "unpaid" }));
    expect(await pending.json()).toMatchObject({ result: "not_paid" });
    expect(db.orders.get("order_1")!.status).toBe("PENDING");

    await deliver("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
    expect(db.orders.get("order_1")!.status).toBe("CANCELED");
  });

  it("ignores a session that isn't the one created for the order", async () => {
    const res = await deliver("checkout.session.completed", session({ id: "cs_other" }));
    expect(await res.json()).toMatchObject({ result: "not_found" });
    expect(db.orders.get("order_1")!.status).toBe("PENDING");
  });
});
