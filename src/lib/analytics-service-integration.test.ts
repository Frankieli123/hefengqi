import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), visitors: vi.fn(), count: vi.fn(async () => 3) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { UMAMI_TIMEZONE: "UTC", UMAMI_WEBSITE_ID: "site", UMAMI_USERNAME: "user", UMAMI_PASSWORD: "pass", UMAMI_API_URL: "http://umami", NODE_ENV: "test" } }));
vi.mock("@/lib/geo-names", () => ({ resolveRegionNameAsync: async (v: string) => v, resolveCityNameAsync: async (v: string) => v }));
vi.mock("./analytics-visitors", () => ({ fetchVisitorPageViews: mocks.visitors, isCrawlerUserAgent: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: mocks.query,
 product: { count: mocks.count, aggregate: async () => ({ _sum: { viewCount: 9 } }), findMany: async () => [] },
 brand: { findMany: async () => [] }, inquiry: { count: async () => 1, findMany: async () => [] },
} }));
function localTraffic() {
 const stats = (pageviews: number, visitors: number, visits: number) => ({ pageviews, visitors, visits, unknownUaPageviews: 1, hiddenCrawlerVisits: 7 });
 return { trafficByPeriod: { today: stats(2, 1, 1), "7d": stats(5, 2, 3), "30d": stats(9, 4, 6), all: stats(12, 5, 8) },
  dailyTraffic: [{ date: "2026-11-02", pageviews: 2, visitors: 1 }], topPaths: [{ path: "/en", count: 4 }] };
}
function online() {
 return vi.fn(async (url: string | URL | Request) => ({ ok: true, json: async () => String(url).includes("login") ? { token: "ok" } : String(url).includes("stats?") ? { visitors: 10, pageviews: 20 } : String(url).includes("pageviews?") ? {} : [] }));
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T10:00:00Z")); vi.stubGlobal("fetch", online()); mocks.query.mockReset().mockResolvedValue([localTraffic()]); mocks.visitors.mockReset(); mocks.count.mockClear(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("independent analytics services", () => {
 it("loads overview without visitors and coalesces equivalent overview requests", async () => {
  const service = await import("./analytics-service");
  const [a, b] = await Promise.all([service.getAnalyticsOverview("7d"), service.getAnalyticsOverview("7d")]);
  expect(a).toEqual(b); expect(a.source.available).toBe(true); expect(mocks.visitors).not.toHaveBeenCalled(); expect(mocks.count).toHaveBeenCalledTimes(1);
  await service.getAnalyticsOverview("30d"); expect(mocks.count).toHaveBeenCalledTimes(2);
 });
 it("uses local filtered counts for every period, daily traffic and top paths, never Umami totals", async () => {
  const service = await import("./analytics-service");
  const result = await service.getAnalyticsOverview("all");
  for (const period of ["today", "7d", "30d", "all"] as const) {
   expect(result.trafficByPeriod[period]).toMatchObject(localTraffic().trafficByPeriod[period]);
   expect(result.trafficByPeriod[period]).toMatchObject({ avgDurationSec: null, avgDurationFormatted: "不可用", bounces: null, bounceRate: null });
  }
  expect(result.dailyTraffic).toHaveLength(91);
  expect(result.dailyTraffic.at(-1)).toEqual(localTraffic().dailyTraffic[0]);
  expect(result.topPaths).toEqual(localTraffic().topPaths);
  expect(result.source).toMatchObject({ historyStart: "2026-08-04T10:00:00.000Z", historyEnd: "2026-11-02T10:00:00.000Z" });
  expect(result.source.countingPolicy).toContain("未验证为真人");
  expect(result.legacySource).toMatchObject({ available: true, historicallyFiltered: false });
  expect(result.legacySource.message).toContain("未按共享 UA 规则清理历史自动化");
  expect(result.inquiries.conversionRate).toBeNull();
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(mocks.query.mock.calls[0][0].sql).toContain('COUNT(DISTINCT NULLIF(v."visitorHash"');
  const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
  expect(urls.some(url => url.includes("/stats?") || url.includes("/pageviews?") || url.includes("type=path"))).toBe(false);
 });
 it.each([["today", 1], ["7d", 7], ["30d", 30], ["all", 91]] as const)("uses the selected %s calendar window for daily and path queries", async (period, days) => {
  const result = await (await import("./analytics-service")).getAnalyticsOverview(period);
  expect(result.dailyTraffic).toHaveLength(days);
  expect(result.dailyTraffic.at(-1)?.date).toBe("2026-11-02");
  const parameters = mocks.query.mock.calls[0][0].values;
  expect(parameters.at(-2)).toEqual(parameters.at(-1));
 });
 it("keeps local traffic available when only legacy supplementary metrics fail", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => { throw Error("legacy offline"); }));
  const result = await (await import("./analytics-service")).getAnalyticsOverview("7d");
  expect(result.source.available).toBe(true);
  expect(result.trafficByPeriod["7d"].pageviews).toBe(5);
  expect(result.legacySource.available).toBe(false);
 });
 it("reports missing visitor/session identifiers as unavailable instead of an IP fallback", async () => {
  const local = localTraffic();
  mocks.query.mockResolvedValue([{ ...local, trafficByPeriod: { ...local.trafficByPeriod, today: { ...local.trafficByPeriod.today, visitors: null, visits: null } } }]);
  const result = await (await import("./analytics-service")).getAnalyticsOverview("today");
  expect(result.trafficByPeriod.today).toMatchObject({ pageviews: 2, visitors: null, visits: null });
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
  mocks.query.mockRejectedValue(new Error("database offline"));
  const stale = await service.getAnalyticsOverview("7d");
  expect(stale.trafficByPeriod).toEqual(first.trafficByPeriod); expect(stale.source.available).toBe(true);
  expect(stale.source.updatedAt).toBe(first.source.updatedAt); expect(stale.source.message).toContain("已过期");
  vi.advanceTimersByTime(300_001);
  const expired = await service.getAnalyticsOverview("7d");
  expect(expired.source.available).toBe(false); expect(expired.source.updatedAt).toBe("");
  expect(expired.products.totalCount).toBe(3);
  expect(expired.trafficByPeriod["7d"].pageviews).toBeNull();
 });
 it("does not cache cold unavailable traffic and recovers immediately", async () => {
  const service = await import("./analytics-service");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.query.mockRejectedValue(Error("database offline"));
  expect((await service.getAnalyticsOverview()).source.available).toBe(false);
  mocks.query.mockResolvedValue([localTraffic()]);
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
