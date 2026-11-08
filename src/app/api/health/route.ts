import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Railway health check. Reports DB reachability without failing the deploy on
 * a slow DB, but fails (503) when auth cannot start — e.g. BETTER_AUTH_SECRET
 * missing in production — so a broken release is never promoted.
 */
export async function GET() {
  let authStatus = "ok";
  try {
    await auth.$context;
  } catch (error) {
    console.error("[health] auth failed to initialise", error);
    authStatus = "misconfigured";
  }
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "unreachable";
  }
  const ok = authStatus === "ok";
  return Response.json(
    { status: ok ? "ok" : "error", db, auth: authStatus, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
