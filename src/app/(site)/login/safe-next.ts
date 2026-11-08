const FALLBACK = "/console";
const BASE = "https://oeeoee.invalid";

/**
 * Where to go after signing in: only same-site, root-relative paths. Browsers
 * read "\" as "/" and drop tabs/newlines, so "/\evil.com" and "/\t/evil.com"
 * both mean "//evil.com" — reject those, encoded separators and anything that
 * resolves to another origin. Mirrors Better Auth's own callbackURL check, so
 * a value accepted here is also accepted by `signIn.social({ callbackURL })`.
 */
export function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || /[\\\u0000-\u001f\u007f-\u009f]/.test(v)) return FALLBACK;
  if (/%2f|%5c/i.test(v.split(/[?#]/, 1)[0])) return FALLBACK;
  try {
    return new URL(v, BASE).origin === BASE ? v : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
