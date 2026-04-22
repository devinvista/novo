import { describe, it, expect, beforeEach } from "vitest";
import { cached, invalidateLookupCache } from "../server/cache";

describe("server/cache", () => {
  beforeEach(() => invalidateLookupCache());

  it("returns the loader value on first call", async () => {
    let calls = 0;
    const value = await cached("k1", async () => {
      calls++;
      return { hello: "world" };
    });
    expect(value).toEqual({ hello: "world" });
    expect(calls).toBe(1);
  });

  it("returns the cached value on subsequent calls without invoking loader", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return calls;
    };
    await cached("k2", loader);
    await cached("k2", loader);
    await cached("k2", loader);
    expect(calls).toBe(1);
  });

  it("invalidates by prefix", async () => {
    let calls = 0;
    const loader = async () => ++calls;
    await cached("regions:all", loader);
    await cached("solutions:all", loader);
    invalidateLookupCache("regions:");
    await cached("regions:all", loader);
    await cached("solutions:all", loader);
    expect(calls).toBe(3);
  });
});
