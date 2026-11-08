import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { appUrl, features } from "@/lib/env";
import { lazyObject } from "@/lib/lazy";

function createAuth() {
  return betterAuth({
    baseURL: appUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "sqlite" }),
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
      enabled: features.devPasswordLogin,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | null = null;

/**
 * Better Auth instance, created on first use: on Cloudflare Workers the
 * Worker's vars/secrets reach process.env only once a request is running.
 */
export const auth = lazyObject<Auth>(() => (instance ??= createAuth()));

export type AuthSession = Auth["$Infer"]["Session"];
