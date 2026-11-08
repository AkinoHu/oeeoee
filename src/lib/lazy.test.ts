import { describe, expect, it } from "vitest";
import { lazyObject } from "./lazy";

describe("lazyObject", () => {
  it("does not resolve until first use", () => {
    let calls = 0;
    const obj = lazyObject(() => {
      calls++;
      return { a: 1 };
    });
    expect(calls).toBe(0);
    expect(obj.a).toBe(1);
    expect(calls).toBe(1);
  });

  it("answers `in` checks from the real object", () => {
    // Better Auth's toNextJsHandler does `"handler" in auth`.
    const obj = lazyObject(() => ({ handler: () => "ok" }));
    expect("handler" in obj).toBe(true);
    expect("missing" in obj).toBe(false);
  });

  it("binds methods to the real object", () => {
    class Counter {
      n = 2;
      read() {
        return this.n;
      }
    }
    const obj = lazyObject(() => new Counter());
    const { read } = obj;
    expect(read()).toBe(2);
  });
});
