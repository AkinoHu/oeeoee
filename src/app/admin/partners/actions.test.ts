import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rows: new Map<string, { status: string }>() }));

vi.mock("@/lib/session", () => ({ requireAdmin: vi.fn(async () => ({ email: "admin@example.com" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/i18n/server", () => ({ getT: async () => (key: string) => key }));
vi.mock("@/lib/db", () => ({
  prisma: {
    partnerApplication: {
      updateMany: async ({ where, data }: { where: { id: string; status?: string }; data: { status: string } }) => {
        const row = db.rows.get(where.id);
        if (!row || (where.status !== undefined && row.status !== where.status)) return { count: 0 };
        row.status = data.status;
        return { count: 1 };
      },
      findUnique: async ({ where }: { where: { id: string } }) => (db.rows.has(where.id) ? { id: where.id } : null),
    },
  },
}));

const { updatePartnerStatus } = await import("./actions");
const { requireAdmin } = await import("@/lib/session");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  db.rows.clear();
  db.rows.set("app1", { status: "NEW" });
});

describe("updatePartnerStatus", () => {
  it("checks admin access before anything else", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", from: "NEW", status: "APPROVED" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(db.rows.get("app1")?.status).toBe("NEW");
  });

  it("updates the status the admin saw", async () => {
    const res = await updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", from: "NEW", status: "APPROVED" }));
    expect(res).toMatchObject({ status: "ok" });
    expect(db.rows.get("app1")?.status).toBe("APPROVED");
  });

  it("doesn't let a stale page overwrite another admin's change", async () => {
    await updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", from: "NEW", status: "APPROVED" }));
    const stale = await updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", from: "NEW", status: "CONTACTED" }));
    expect(stale).toMatchObject({ status: "error", message: "admin.partner.conflict" });
    expect(db.rows.get("app1")?.status).toBe("APPROVED");
  });

  it("rejects unknown ids and bad input", async () => {
    expect(await updatePartnerStatus({ status: "idle" }, form({ applicationId: "nope", from: "NEW", status: "APPROVED" }))).toMatchObject({
      status: "error",
      message: "admin.partner.error",
    });
    expect(await updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", from: "NEW", status: "HIRED" }))).toMatchObject({
      status: "error",
    });
    expect(await updatePartnerStatus({ status: "idle" }, form({ applicationId: "app1", status: "APPROVED" }))).toMatchObject({
      status: "error",
    });
  });
});
