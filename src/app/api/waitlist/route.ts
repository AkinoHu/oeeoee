import { getCountry } from "@/data";
import { waitlistRequestSchema } from "@/lib/cart/schema";
import { prisma } from "@/lib/db";

/**
 * POST /api/waitlist  { email, countryCode, locale } → { ok: true }
 * Coming-soon markets ("tell me when you launch") and pot-only markets
 * ("tell me when local plants arrive") share one list per country.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = waitlistRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  const { email, countryCode, locale, website } = parsed.data;

  // Honeypot filled in → pretend success, store nothing.
  if (website) return Response.json({ ok: true });

  const country = getCountry(countryCode);
  if (!country) return Response.json({ error: "unknown_country" }, { status: 400 });

  try {
    await prisma.waitlistEntry.upsert({
      where: { email_countryCode: { email, countryCode: country.code } },
      create: { email, countryCode: country.code, locale: locale ?? null },
      update: locale ? { locale } : {},
    });
  } catch (err) {
    console.error("[waitlist] upsert failed", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  return Response.json({ ok: true });
}
