import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ visitors: vi.fn(), count: vi.fn(async () => 3) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { UMAMI_TIMEZONE: "UTC", UMAMI_WEBSITE_ID: "site", UMAMI_USERNAME: "user", UMAMI_PASSWORD: "pass", UMAMI_API_URL: "http://umami", NODE_ENV: "test" } }));
vi.mock("@/lib/geo-names", () => ({ resolveRegionNameAsync: async (v: string) => v, resolveCityNameAsync: async (v: string) => v }));
vi.mock("./analytics-visitors", () => ({ fetchVisitorPageViews: mocks.visitors, isCrawlerUserAgent: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
 product: { count: mocks.count, aggregate: async () => ({ _sum: { viewCount: 9 } }), findMany: async () => [] },
 brand: { findMany: async () => [] }, inquiry: { count: async () => 1, findMany: async () => [] },
} }));
function online() {
 return vi.fn(async (url: string | URL | Request) => ({ ok: true, json: async () => String(url).includes("login") ? { token: "ok" } : String(url).includes("stats?") ? { visitors: 10, pageviews: 20 } : String(url).includes("pageviews?") ? {} : [] }));
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T10:00:00Z")); vi.stubGlobal("fetch", online()); mocks.visitors.mockReset(); mocks.count.mockClear(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("independent analytics services", () => {
 it("loads overview without visitors and coalesces equivalent overview requests", async () => {
  const service = await import("./analytics-service");
  const [a, b] = await Promise.all([service.getAnalyticsOverview("7d"), service.getAnalyticsOverview("7d")]);
  expect(a).toEqual(b); expect(a.source.available).toBe(true); expect(mocks.visitors).not.toHaveBeenCalled(); expect(mocks.count).toHaveBeenCalledTimes(1);
  await service.getAnalyticsOverview("30d"); expect(mocks.count).toHaveBeenCalledTimes(2);
 });
 it("isolates visitor dates/pages and never loads overview for pagination", async () => {
  mocks.visitors.mockImplementation(async options => ({ rows: [], meta: options }));
  const service = await import("./analytics-service");
  const options = { startDate: "2026-11-01", endDate: "2026-11-02", page: 1 };
  await Promise.all([service.getVisitorAnalyticsData(options), service.getVisitorAnalyticsData({ ...options, page: -2 })]);
  expect(mocks.visitors).toHaveBeenCalledTimes(1);
  await service.getVisitorAnalyticsData({ ...options, page: 2 });
  await service.getVisitorAnalyticsData({ ...options, startDate: "2026-10-31" });
  expect(mocks.visitors).toHaveBeenCalledTimes(3); expect(mocks.count).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
 });
 it("retains the last successful overview on failure with its original timestamp, then expires it", async () => {
  const service = await import("./analytics-service");
  const first = await service.getAnalyticsOverview("7d");
  vi.advanceTimersByTime(60_001);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
  const stale = await service.getAnalyticsOverview("7d");
  expect(stale.trafficByPeriod).toEqual(first.trafficByPeriod); expect(stale.source.available).toBe(true);
  expect(stale.source.updatedAt).toBe(first.source.updatedAt); expect(stale.source.message).toContain("已过期");
  vi.advanceTimersByTime(300_001);
  const expired = await service.getAnalyticsOverview("7d");
  expect(expired.source.available).toBe(false); expect(expired.source.updatedAt).toBe("");
  expect(expired.products.totalCount).toBe(3);
 });
 it("does not cache cold unavailable traffic and recovers immediately", async () => {
  const service = await import("./analytics-service");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => { throw Error("offline"); }));
  expect((await service.getAnalyticsOverview()).source.available).toBe(false);
  vi.stubGlobal("fetch", online());
  expect((await service.getAnalyticsOverview()).source.available).toBe(true);
 });
 it("visitor failures preserve success within stale bound and propagate cold/expired failures", async () => {
  mocks.visitors.mockResolvedValue({ rows: [{ id: "saved" }], meta: { page: 1 } });
  const service = await import("./analytics-service");
  const first = await service.getVisitorAnalyticsData({ page: 1 });
  vi.advanceTimersByTime(15_001); mocks.visitors.mockRejectedValue(Error("database offline"));
  const stale = await service.getVisitorAnalyticsData({ page: 1 });
  expect(stale.rows).toEqual(first.rows); expect(stale.source.updatedAt).toBe(first.source.updatedAt); expect(stale.source.message).toContain("已过期");
  await expect(service.getVisitorAnalyticsData({ page: 2 })).rejects.toThrow("database offline");
  vi.advanceTimersByTime(60_001);
  await expect(service.getVisitorAnalyticsData({ page: 1 })).rejects.toThrow("database offline");
 });
 it("compatibility wrapper composes the two independent interfaces", async () => {
  mocks.visitors.mockResolvedValue({ rows: [], meta: { page: 1 } });
  const service = await import("./analytics-service");
  const result = await service.getCompleteAnalyticsData("today");
  expect(result.selectedPeriod).toBe("today"); expect(result.visitorPageViews).toEqual([]); expect(result.visitorPageViewMeta.page).toBe(1);
 });
 it("starts successful service TTL and updatedAt when all loading completes", async () => {
  let release!: () => void;
  mocks.visitors.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve({ rows: [], meta: { page: 1 } }); }));
  const service = await import("./analytics-service");
  const pending = service.getVisitorAnalyticsData(); await Promise.resolve();
  vi.advanceTimersByTime(20_000); release();
  const first = await pending; expect(first.source.updatedAt).toBe(new Date().toISOString());
  vi.advanceTimersByTime(14_000); await service.getVisitorAnalyticsData(); expect(mocks.visitors).toHaveBeenCalledTimes(1);
 });

});
