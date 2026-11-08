import { toCsv } from "@/components/admin/csv";
import { parseCountryParam } from "@/components/admin/format";
import { countryName } from "@/components/partners/markets";
import { prisma } from "@/lib/db";
import { getUser, isAdminEmail } from "@/lib/session";

/** GET /admin/waitlist/export[?country=XX] — waitlist as CSV. Admins only. */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    // Relative on purpose: behind Railway's proxy request.url carries the
    // server's internal host (e.g. localhost:8080), not the public one.
    return new Response(null, {
      status: 303,
      headers: { Location: "/login?next=%2Fadmin%2Fwaitlist", "Cache-Control": "no-store" },
    });
  }
  if (!isAdminEmail(user.email)) {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const country = parseCountryParam(new URL(request.url).searchParams.get("country") ?? undefined);
  const entries = await prisma.waitlistEntry.findMany({
    where: country ? { countryCode: country } : {},
    orderBy: { createdAt: "desc" },
    select: { email: true, countryCode: true, locale: true, createdAt: true },
  });

  const csv = toCsv(
    ["email", "country_code", "country", "locale", "created_at"],
    entries.map((e) => [e.email, e.countryCode, countryName(e.countryCode, "en"), e.locale, e.createdAt]),
  );
  const date = new Date().toISOString().slice(0, 10);
  const filename = `oeeoee-waitlist${country ? `-${country.toLowerCase()}` : ""}-${date}.csv`;

  // BOM so Excel opens UTF-8 (e.g. CJK locales) correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
