import "server-only";

/**
 * Feature flags derived from environment variables. Every integration degrades
 * gracefully when its keys are missing so the site runs locally with only a
 * DATABASE_URL.
 */
export const features = {
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  /** Email + password login. Only for local development and automated tests. */
  devPasswordLogin: process.env.AUTH_DEV_PASSWORD_LOGIN === "true",
};

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")
  ).replace(/\/$/, "");
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
