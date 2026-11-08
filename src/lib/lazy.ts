/**
 * An object that stands in for `resolve()`'s result, calling `resolve` on every
 * access. Used where the real object can only be built inside a request
 * (Cloudflare bindings, env vars). Methods are bound to the real object, and
 * `in` checks are answered by it too — libraries probe with `"x" in obj`.
 */
export function lazyObject<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = resolve();
      const value = Reflect.get(real, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
    has(_target, prop) {
      return Reflect.has(resolve(), prop);
    },
  });
}
