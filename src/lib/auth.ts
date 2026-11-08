import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { appUrl, features } from "@/lib/env";

/**
 * Email + password sign-in is for local development and automated tests only:
 * anyone can register any address with it, including one in ADMIN_EMAILS. A
 * production build therefore ignores AUTH_DEV_PASSWORD_LOGIN unless the app's
 * URL is explicitly set to this machine (e.g. `next start` on localhost for
 * e2e runs) — not when it is merely appUrl()'s fallback.
 */
export function devPasswordLoginEnabled(): boolean {
  if (!features.devPasswordLogin) return false;
  if (process.env.NODE_ENV !== "production") return true;
  const configured = ["NEXT_PUBLIC_APP_URL", "BETTER_AUTH_URL"].map((name) => process.env[name]?.trim()).find(Boolean);
  return !!configured && isLoopbackUrl(configured);
}

export function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

if (features.devPasswordLogin && !devPasswordLoginEnabled()) {
  console.error(`[auth] AUTH_DEV_PASSWORD_LOGIN is ignored: password sign-in is disabled for ${appUrl()}.`);
}

export const auth = betterAuth({
  baseURL: appUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: features.google
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          prompt: "select_account",
        },
      }
    : {},
  emailAndPassword: {
    // Dev/test only — production uses Google sign-in.
    enabled: devPasswordLoginEnabled(),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    // Railway's edge sets X-Real-IP to the caller's address. Better Auth only
    // trusts a single-value X-Forwarded-For, so behind a proxy that appends to
    // it (or Cloudflare) every visitor fell into one shared rate-limit bucket.
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
