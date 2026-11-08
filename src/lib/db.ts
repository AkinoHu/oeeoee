import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Fail fast instead of hanging (pg's default is to wait forever), so
    // /api/health can report "unreachable" within Railway's health-check window.
    connectionTimeoutMillis: 5_000,
    // Cap runaway queries.
    statement_timeout: 15_000,
  });
  return new PrismaClient({ adapter });
}

/** Single shared Prisma client (reused across hot reloads in dev). */
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
