import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { adminEmails } from "@/lib/env";

/** Current session or null. Cached per request. */
export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
});

export async function getUser() {
  return (await getSession())?.user ?? null;
}

/** Use in server components / actions that need a signed-in user. */
export async function requireUser(returnTo = "/console") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export function isAdminEmail(email: string | null | undefined) {
  return !!email && adminEmails().includes(email.toLowerCase());
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) redirect("/");
  return user;
}
