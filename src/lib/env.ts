import "server-only";

/**
 * Feature flags derived from environment variables. Every integration degrades
 * gracefully when its keys are missing so the site runs locally with only the
 * D1 database binding.
 */
export const features = {
  // Getters, not values: on Cloudflare Workers process.env is filled from the
  // Worker's vars/secrets at request time, after this module may have loaded.
  get google() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
  get stripe() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
  get anthropic() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  /** Email + password login. Only for local development and automated tests. */
  get devPasswordLogin() {
    return process.env.AUTH_DEV_PASSWORD_LOGIN === "true";
  },
};

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
