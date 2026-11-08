import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";
import { lazyObject } from "@/lib/lazy";

const clients = new WeakMap<D1Database, PrismaClient>();

/** Prisma client bound to this request's Cloudflare D1 binding (`DB` in wrangler.jsonc). */
export function getPrisma(): PrismaClient {
  const { env } = getCloudflareContext();
  let client = clients.get(env.DB);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    clients.set(env.DB, client);
  }
  return client;
}

/**
 * Shared Prisma client. Bindings only exist inside a request on Workers, so
 * this resolves the D1 binding lazily on each property access; call sites use
 * it exactly like a normal PrismaClient.
 */
export const prisma = lazyObject(getPrisma);
