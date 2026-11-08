import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as { email: string } | null, where: undefined as unknown }));

vi.mock("@/lib/session", () => ({
  getUser: async () => state.user,
  isAdminEmail: (email: string) => email === "admin@example.com",
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    waitlistEntry: {
      findMany: async ({ where }: { where: unknown }) => {
        state.where = where;
        return [
          { email: "+1@example.com", countryCode: "JP", locale: "=HYPERLINK(\"http://x\")", createdAt: new Date("2026-01-02T03:04:05Z") },
        ];
      },
    },
  },
}));

const { GET } = await import("./route");

// `next start` builds request.url from its own host/port, not the public Host header.
const internal = (path: string) => new Request(`http://localhost:8080${path}`, { headers: { host: "oeeoee.com" } });

beforeEach(() => {
  state.user = null;
  state.where = undefined;
});

describe("GET /admin/waitlist/export", () => {
  it("sends signed-out visitors to sign in on the same host (relative Location)", async () => {
    const res = await GET(internal("/admin/waitlist/export"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login?next=%2Fadmin%2Fwaitlist");
  });

  it("forbids signed-in non-admins", async () => {
    state.user = { email: "someone@example.com" };
    const res = await GET(internal("/admin/waitlist/export"));
    expect(res.status).toBe(403);
    expect(state.where).toBeUndefined();
  });

  it("exports CSV for admins with formula cells neutralised", async () => {
    state.user = { email: "admin@example.com" };
    const res = await GET(internal("/admin/waitlist/export?country=jp"));
    expect(res.status).toBe(200);
    expect(state.where).toEqual({ countryCode: "JP" });
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="oeeoee-waitlist-jp-\d{4}-\d{2}-\d{2}\.csv"$/);
    const body = await res.text();
    expect(body).toContain("'+1@example.com,JP,");
    expect(body).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});
