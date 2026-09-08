import { describe, expect, it, vi } from "vitest";
import { edgeCacheGet, edgeCacheSet } from "./edge-ttl-cache";

describe("edgeCacheGet/edgeCacheSet", () => {
  it("returns undefined for a key that was never set", () => {
    expect(edgeCacheGet(`missing:${Math.random()}`)).toBeUndefined();
  });

  it("returns the stored value before the TTL expires", () => {
    const key = `hit:${Math.random()}`;
    edgeCacheSet(key, { onboardingDone: true }, 10_000);
    expect(edgeCacheGet(key)).toEqual({ onboardingDone: true });
  });

  it("returns undefined once the TTL has elapsed, and clears the entry", () => {
    const key = `expired:${Math.random()}`;
    vi.useFakeTimers();
    try {
      edgeCacheSet(key, "value", 1_000);
      vi.advanceTimersByTime(1_001);
      expect(edgeCacheGet(key)).toBeUndefined();
      // a re-read after "expiry" must not resurrect the deleted entry
      expect(edgeCacheGet(key)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps different keys independent", () => {
    const keyA = `a:${Math.random()}`;
    const keyB = `b:${Math.random()}`;
    edgeCacheSet(keyA, 1, 10_000);
    edgeCacheSet(keyB, 2, 10_000);
    expect(edgeCacheGet(keyA)).toBe(1);
    expect(edgeCacheGet(keyB)).toBe(2);
  });
});
