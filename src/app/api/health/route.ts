import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Railway health check. Reports DB reachability without failing the deploy on a slow DB. */
export async function GET() {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "unreachable";
  }
  return Response.json({ status: "ok", db, time: new Date().toISOString() });
}
