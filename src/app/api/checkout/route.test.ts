import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPotBySku } from "@/data";

const h = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  orders: [] as Array<Record<string, unknown> & { id: string }>,
  create: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getUser: async () => h.user }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => (process.env.STRIPE_SECRET_KEY ? { checkout: { sessions: { create: h.create } } } : null) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const order = { ...data, id: `order_${h.orders.length + 1}` };
        h.orders.push(order);
        return { id: order.id };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const order = h.orders.find((o) => o.id === where.id)!;
        Object.assign(order, data);
        return order;
      },
    },
  },
}));

async function post(body: unknown) {
  const { POST } = await import("./route");
  return POST(new Request("http://localhost/api/checkout", { method: "POST", body: JSON.stringify(body) }));
}

const potM = getPotBySku("POT-M")!;

beforeEach(() => {
  h.user = { id: "user_1", email: "buyer@example.com" };
  h.orders = [];
  h.create.mockReset();
  h.create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/cs_test_1" });
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example/");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/checkout", () => {
  it("requires a signed-in user", async () => {
    h.user = null;
    expect((await post({})).status).toBe(401);
    expect(h.orders).toHaveLength(0);
  });

  it("prices on the server and builds the Stripe session for the cart's market", async () => {
    const res = await post({
      countryCode: "jp",
      locale: "ja",
      lines: [{ potSku: "POT-M", finish: "sage", plantId: null, previewPlantId: "pothos", quantity: 2, unitAmount: 1 }],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/cs_test_1" });

    const [params, opts] = h.create.mock.calls[0] as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }];
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items![0]).toMatchObject({ quantity: 2, price_data: { currency: "jpy", unit_amount: potM.prices.jpy } });
    // 2 × M is above Japan's free-shipping threshold.
    expect(params.shipping_options![0].shipping_rate_data).toMatchObject({ fixed_amount: { amount: 0, currency: "jpy" } });
    expect(params.shipping_address_collection!.allowed_countries).toEqual(["JP"]);
    expect(params.locale).toBe("ja");
    expect(params.success_url).toBe("https://shop.example/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://shop.example/checkout/cancel?country=jp&size=M&finish=sage&plant=pothos");
    expect(params.metadata).toMatchObject({ orderId: "order_1" });
    expect(opts.idempotencyKey).toBe("checkout-order_1");

    expect(h.orders[0]).toMatchObject({
      status: "PENDING",
      currency: "jpy",
      subtotal: potM.prices.jpy * 2,
      shippingAmount: 0,
      total: potM.prices.jpy * 2,
      stripeSessionId: "cs_test_1",
    });
  });

  it("writes nothing when Stripe isn't configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const res = await post({ countryCode: "US", locale: "en", lines: [{ potSku: "POT-S", finish: "sage", plantId: null, quantity: 1 }] });
    expect(res.status).toBe(503);
    expect(h.orders).toHaveLength(0);
  });

  it("cancels the order when Stripe fails", async () => {
    h.create.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ countryCode: "US", locale: "en", lines: [{ potSku: "POT-S", finish: "sage", plantId: null, quantity: 1 }] });
    expect(res.status).toBe(502);
    expect(h.orders[0].status).toBe("CANCELED");
  });

  it("rejects closed markets and live plants outside full markets", async () => {
    const line = { potSku: "POT-M", finish: "sage", plantId: null, quantity: 1 };
    expect((await post({ countryCode: "MY", locale: "en", lines: [line] })).status).toBe(400);
    const res = await post({ countryCode: "US", locale: "en", lines: [{ ...line, plantId: "pothos" }] });
    expect(await res.json()).toMatchObject({ error: "plant_not_sellable", lineIndex: 0 });
    expect(h.orders).toHaveLength(0);
  });
});
