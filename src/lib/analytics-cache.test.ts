import { describe, it, expect, vi } from "vitest";
import { createAnalyticsCache } from "./analytics-cache";
describe("analytics bounded snapshots", () => {
 it("coalesces concurrent keys, isolates parameters and starts TTL at completion", async () => {
  let now = 0; let release!: (v: number) => void;
  const cache = createAnalyticsCache<number>({ ttlMs: 15, maxStaleMs: 100, maxEntries: 2, now: () => now });
  const load = vi.fn(() => new Promise<number>(r => { release = r; }));
  const a = cache.get("a", load); const b = cache.get("a", load);
  await Promise.resolve(); expect(load).toHaveBeenCalledTimes(1);
  now = 20; release(7); expect((await a).value).toBe(7); expect((await b).value).toBe(7);
  now = 30; expect((await cache.get("a", load)).value).toBe(7); expect(load).toHaveBeenCalledTimes(1);
  expect((await cache.get("b", async () => 8)).value).toBe(8);
  now = 36; const stale = await cache.get("a", async () => { throw Error("offline"); });
  expect(stale.value).toBe(7); expect(stale.stale).toBe(true); expect(stale.updatedAt).toBe(new Date(20).toISOString());
  now = 121; await expect(cache.get("a", async () => { throw Error("offline"); })).rejects.toThrow("offline");
 });
 it("bounds memory and does not replace in-flight entries when full", async () => {
  const cache = createAnalyticsCache<number>({ ttlMs: 1, maxStaleMs: 10, maxEntries: 1 });
  let release!: (v:number) => void; const a = cache.get("a", () => new Promise(r => {release=r;}));
  await Promise.resolve(); await expect(cache.get("b", async () => 2)).rejects.toThrow("busy");
  release(1); await a; expect((await cache.get("b", async () => 2)).value).toBe(2);
 });
});
