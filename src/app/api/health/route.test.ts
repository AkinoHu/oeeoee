import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ authError: null as Error | null, dbError: null as Error | null }));

vi.mock("@/lib/auth", () => ({
  auth: {
    get $context() {
      return state.authError ? Promise.reject(state.authError) : Promise.resolve({});
    },
  },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: () => (state.dbError ? Promise.reject(state.dbError) : Promise.resolve([{ "?column?": 1 }])),
  },
}));

const { GET } = await import("./route");

beforeEach(() => {
  state.authError = null;
  state.dbError = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/health", () => {
  it("is ok when auth and the database are up", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok", auth: "ok" });
  });

  it("stays 200 with the database down, so a slow DB doesn't fail the deploy", async () => {
    state.dbError = new Error("connect timeout");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "unreachable" });
  });

  it("fails when auth can't start (e.g. BETTER_AUTH_SECRET missing in production)", async () => {
    state.authError = new Error("You are using the default secret.");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "error", auth: "misconfigured" });
  });
});
