import React, { Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const service = vi.hoisted(() => ({
  requireSecureAdmin: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getVisitorAnalyticsData: vi.fn(),
  getCompleteAnalyticsData: vi.fn(),
}));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: service.requireSecureAdmin }));
vi.mock("@/lib/analytics-service", () => ({ ...service, analyticsPeriodKeys: ["today", "7d", "30d", "all"], resolveVisitorDateRange: () => ({ startDate: "2026-10-04", endDate: "2026-11-02" }) }));
import AnalyticsPage from "./page";
import { AnalyticsOverviewHeader, AnalyticsVisitorSection, AnalyticsSummarySection } from "./analytics-sections";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  service.requireSecureAdmin.mockResolvedValue({});
  service.getAnalyticsOverview.mockReturnValue(new Promise(() => {}));
  service.getVisitorAnalyticsData.mockReturnValue(new Promise(() => {}));
  const traffic = { pageviews: 0, visitors: 0, visits: 0, unknownUaPageviews: 2, hiddenCrawlerVisits: 5, avgDurationFormatted: "不可用" };
  service.getCompleteAnalyticsData.mockResolvedValue({
    visitorPageViewMeta: {}, trafficByPeriod: { today: traffic, "7d": traffic, "30d": traffic, all: traffic },
    products: { totalViews: 0, totalCount: 0, topViewed: [], brandDistribution: [] },
    inquiries: { conversionRate: null, recent: [] }, source: { available: true, timezone: "Asia/Shanghai", countingPolicy: "候选访问，未验证真人", durationPolicy: "无可靠时长，未计算" },
    legacySource: { available: true, historicallyFiltered: false, message: "Umami 历史补充统计：未按共享 UA 规则清理历史自动化" },
    visitorPageViews: [], dailyTraffic: [], topPaths: [], topCountries: [], topRegions: [], topCities: [], devices: [], os: [], browsers: [],
  });
});

describe("analytics independent server sections", () => {
  it("returns a Suspense shell without waiting for either data source and forwards query values", async () => {
    const shell = await AnalyticsPage({ searchParams: Promise.resolve({ period: ["7d", "all"], startDate: "2026-10-01", endDate: "2026-10-31", page: "3" }) });
    expect(service.getAnalyticsOverview).toHaveBeenCalledWith("7d");
    expect(service.getVisitorAnalyticsData).toHaveBeenCalledWith({ startDate: "2026-10-01", endDate: "2026-10-31", page: 3 });
    expect(service.getCompleteAnalyticsData).not.toHaveBeenCalled();
    const boundaries = React.Children.toArray(shell.props.children).filter((child) => React.isValidElement(child) && child.type === Suspense);
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
  });

  it("does not start any analytics request until authorization succeeds", async () => {
    const auth = deferred<void>();
    service.requireSecureAdmin.mockReturnValue(auth.promise);
    const page = AnalyticsPage({ searchParams: Promise.resolve({}) });
    await Promise.resolve();
    expect(service.getAnalyticsOverview).not.toHaveBeenCalled();
    expect(service.getVisitorAnalyticsData).not.toHaveBeenCalled();
    auth.resolve();
    await page;
    expect(service.getAnalyticsOverview).toHaveBeenCalledWith("30d");
  });

  it("preserves normalized visitor dates in period links without waiting for visitor data", async () => {
    const overview = await service.getCompleteAnalyticsData();
    const header = await AnalyticsOverviewHeader({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} });
    const html = renderToStaticMarkup(header);
    expect(html).toContain("startDate=2026-10-04");
    expect(html).toContain("endDate=2026-11-02");
  });

  it("renders visitor rows, date form and paging while overview is still pending", async () => {
    const dataPromise = Promise.resolve({ rows: [{ id: "visitor-1", ipAddress: "203.0.113.4", country: "CN", region: "广东", city: "深圳", geoStatus: "edgeone" as const, visitCount: 2, pages: [{ path: "/products/demo", count: 2, lastVisitedAt: "2026-11-02" }], locales: [], referrers: [], firstVisitedAt: "2026-11-01", lastVisitedAt: "2026-11-02" }], meta: { startDate: "2026-10-01", endDate: "2026-10-31", page: 2, pageSize: 50, totalCount: 120, totalPages: 3, totalVisits: 130, hiddenCrawlerVisits: 10 } });
    const section = await AnalyticsVisitorSection({ dataPromise, selectedPeriod: "7d" });
    const html = renderToStaticMarkup(section);
    expect(html).toContain("203.0.113.4");
    expect(html).toContain("/products/demo");
    expect(html).toContain('name="startDate" value="2026-10-01"');
    expect(html).toContain("period=7d&amp;startDate=2026-10-01&amp;endDate=2026-10-31&amp;page=1");
    expect(html).toContain("period=7d&amp;startDate=2026-10-01&amp;endDate=2026-10-31&amp;page=3");
  });

  it("renders every summary business block without visitor results", async () => {
    const overview = await service.getCompleteAnalyticsData();
    const section = await AnalyticsSummarySection({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} });
    const html = renderToStaticMarkup(section);
    for (const title of ["页面浏览量 (PV)", "每日候选访问", "热门访问路径", "产品浏览排行榜", "访客 IP 地区（推断）", "访问终端环境", "询价商机", "品牌产品储备分布"]) expect(html).toContain(title);
    expect(html).not.toContain("访客访问轨迹");
  });

  it("does not query analytics for an unauthorized request", async () => {
    service.requireSecureAdmin.mockRejectedValue(new Error("unauthorized"));
    await expect(AnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("unauthorized");
    expect(service.getAnalyticsOverview).not.toHaveBeenCalled();
    expect(service.getVisitorAnalyticsData).not.toHaveBeenCalled();
  });
});


it("shows honest local geography and historical-record counting policy", async () => {
 const dataPromise = Promise.resolve({rows: [], meta: {startDate: "2026-10-01", endDate: "2026-10-31", page: 1, pageSize: 50, totalCount: 0, totalPages: 1, totalVisits: 0, hiddenCrawlerVisits: 0}});
 const section = await AnalyticsVisitorSection({dataPromise, selectedPeriod: "30d"});
 const html=renderToStaticMarkup(section);
 expect(html).toContain("未验证真人");
 expect(html).toContain("缺失 UA 保留");
 expect(html).toContain("不是人数");
 expect(html).toContain("会话 ID 精确补全");
});


it("shows snapshot update time and stale-data explanation", async () => {
 const overview=await service.getCompleteAnalyticsData();
 overview.source={available:true,timezone:"Asia/Shanghai",updatedAt:"2026-11-02T09:00:00Z",message:"更新延迟，展示最近成功数据"};
 const section=await AnalyticsOverviewHeader({dataPromise:Promise.resolve(overview),selectedPeriod:"30d",visitorOptions:{}});
 const html=renderToStaticMarkup(section);
 expect(html).toContain("2026-11-02T09:00:00Z");
 expect(html).toContain("更新延迟，展示最近成功数据");
});


it("labels filtered candidates, unknown UA, unavailable durations and legacy supplements", async () => {
 const overview = await service.getCompleteAnalyticsData();
 const html = renderToStaticMarkup(await AnalyticsSummarySection({dataPromise: Promise.resolve(overview), selectedPeriod: "all", visitorOptions: {}}));
 expect(html).toContain("保留记录（最多 90 天）");
 expect(html).toContain("保留缺失 UA 2 次");
 expect(html).toContain("未验证真人");
 expect(html).toContain("不可用");
 expect(html).not.toContain("0秒");
 expect(html).not.toContain("null%");
 expect(html).toContain("未按共享 UA 规则清理历史自动化");
});

it("shows stale visitor snapshot warning", async () => {
 const dataPromise=Promise.resolve({rows:[],meta:{startDate:"2026-10-01",endDate:"2026-10-31",page:1,pageSize:50,totalCount:0,totalPages:1,totalVisits:0,hiddenCrawlerVisits:0},source:{available:true,timezone:"Asia/Shanghai",updatedAt:"2026-11-02T09:00:00Z",message:"访客查询失败，显示最近成功数据"}});
 const html=renderToStaticMarkup(await AnalyticsVisitorSection({dataPromise,selectedPeriod:"30d"}));
 expect(html).toContain("访客查询失败，显示最近成功数据");
});


it("isolates failed visitor query to its own module without fabricated zero counts", async () => {
 const section=await AnalyticsVisitorSection({dataPromise:Promise.reject(Error("database unavailable")),selectedPeriod:"30d"});
 const html=renderToStaticMarkup(section);
 expect(html).toContain("访客数据暂时无法加载");
 expect(html).not.toContain("所选日期没有访问记录");
});

it("renders stored traffic tiers and conspicuous crawler coverage limits", async () => {
  const overview = await service.getCompleteAnalyticsData();
  overview.trafficBreakdown = {
    ruleVersion: "shared-ua-v2", recordedRawPageviews: 12, explicitAutomationPageviews: 5,
    remainingCandidatePageviews: 7, missingUaPageviews: 2,
    crawlers: [{ brand: "Baidu", pageviews: 5, distinctPaths: 2,
      firstVisitedAt: "2026-11-01T01:00:00.000Z", lastVisitedAt: "2026-11-02T01:00:00.000Z",
      maskedIpSamples: ["203.0.113.xxx"], countries: [{ value: "CN", count: 5 }],
      regions: [{ value: "CN / GD", count: 5 }], cities: [{ value: "CN / GD / SZ", count: 5 }],
      languages: [{ value: "en", count: 5 }], paths: [{ value: "/en/products", count: 5 }],
    }],
  };
  const html = renderToStaticMarkup(await AnalyticsSummarySection({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} }));
  for (const note of ["已记录原始 PV", "明确自动化 PV", "剩余候选 PV", "其中缺失 UA PV（子集）", "不另行相加", "已停止持久化", "不是完整爬虫请求记录", "当前未做 DNS 验证", "不是已验证位置", "不做推断映射", "页面语言", "203.0.113.xxx", "Baidu", "CN / GD / SZ", "/en/products"]) expect(html).toContain(note);
  expect(html).not.toContain("高置信");
  expect(html).not.toContain("已验证真人");
});

it("distinguishes missing breakdown and empty stored crawler snapshots from no crawler requests", async () => {
  const overview = await service.getCompleteAnalyticsData();
  const render = () => AnalyticsSummarySection({ dataPromise: Promise.resolve(overview), selectedPeriod: "all", visitorOptions: {} });
  expect(renderToStaticMarkup(await render())).toContain("流量分层数据不可用");
  overview.trafficBreakdown = { ruleVersion: "shared-ua-v2", recordedRawPageviews: 0, explicitAutomationPageviews: 0, remainingCandidatePageviews: 0, missingUaPageviews: 0, crawlers: [] };
  expect(renderToStaticMarkup(await render())).toContain("不代表没有爬虫请求");
});
