import "server-only";

/**
 * Feature flags derived from environment variables. Every integration degrades
 * gracefully when its keys are missing so the site runs locally with only a
 * DATABASE_URL. Getters, so flags always agree with code that reads
 * process.env at call time (getStripe(), appUrl(), …).
 */
export const features = {
  get google() {
    return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
  },
  get stripe() {
    return Boolean(env("STRIPE_SECRET_KEY"));
  },
  get anthropic() {
    return Boolean(env("ANTHROPIC_API_KEY"));
  },
  /** Email + password login. Only for local development and automated tests. */
  get devPasswordLogin() {
    return env("AUTH_DEV_PASSWORD_LOGIN") === "true";
  },
};

/** A trimmed env var, treating "" as unset (Railway lets you save empty values). */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

let warnedAboutAppUrl = false;

/**
 * Public origin of the site, e.g. https://oeeoee.com. Used for auth callbacks,
 * Stripe redirects and metadata. Set NEXT_PUBLIC_APP_URL in production.
 */
export function appUrl(): string {
  const configured = env("NEXT_PUBLIC_APP_URL") ?? env("BETTER_AUTH_URL");
  if (configured) return configured.replace(/\/$/, "");
  const railway = env("RAILWAY_PUBLIC_DOMAIN");
  if (process.env.NODE_ENV === "production" && !warnedAboutAppUrl) {
    warnedAboutAppUrl = true;
    console.warn(
      `[env] NEXT_PUBLIC_APP_URL is not set; falling back to ${railway ? `https://${railway}` : "http://localhost:3000"}. ` +
        "Sign-in and checkout redirects only work on that host.",
    );
  }
  return railway ? `https://${railway}` : "http://localhost:3000";
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
