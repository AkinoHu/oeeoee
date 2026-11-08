import type { Locale } from "./config";

/**
 * A namespace of flat, dot-keyed messages. English is the source of truth for
 * keys; zh and ja must provide exactly the same keys (enforced by the type).
 *
 * Interpolation: "Hello {name}" + { name: "Ann" }.
 */
export type Messages = Record<string, string>;

export type NamespaceMessages<T extends Messages> = { en: T } & {
  [L in Exclude<Locale, "en">]: { [K in keyof T]: string };
};

export function defineMessages<const T extends Messages>(m: NamespaceMessages<T>) {
  return m;
}

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
