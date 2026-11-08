import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { adminEmails } from "@/lib/env";

/** Current session or null. Cached per request. */
export const getSession = cache(async () => {
  // Read the request headers before touching auth: this marks the route as
  // dynamic, so nothing reaches the database (D1 binding) during the build.
  const requestHeaders = await headers();
  try {
    return await auth.api.getSession({ headers: requestHeaders });
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
