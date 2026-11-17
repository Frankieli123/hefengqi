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
import { resolveVisitorDateRange } from "@/lib/analytics-visitor-range";
import { AnalyticsTrend } from "./analytics-trend";
import { AnalyticsOverviewHeader, AnalyticsVisitorSection, AnalyticsSummarySection, AnalyticsAuditSection } from "./analytics-sections";
vi.mock("@/lib/env", () => ({ env: { UMAMI_TIMEZONE: "Asia/Shanghai" } }));

async function summaryWithAudit(props: Parameters<typeof AnalyticsSummarySection>[0]) {
  return <>{await AnalyticsSummarySection(props)}{await AnalyticsAuditSection(props)}</>;
}

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
  it("keeps zero, single-point and unavailable daily data honest and readable", () => {
    const html = renderToStaticMarkup(<AnalyticsTrend dailyTraffic={[{ date: "2026-11-01", pageviews: 0, visitors: null }]} timezone="Asia/Shanghai" available periodLabel="今日" />);
    expect(html).toContain("峰值 0 PV");
    expect(html).toContain("不可用");
    expect(html).toContain('cx="400"');
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).not.toContain("<details open");
    const empty = renderToStaticMarkup(<AnalyticsTrend dailyTraffic={[]} timezone="Asia/Shanghai" available={false} periodLabel="今日" />);
    expect(empty).toContain("不显示为零访问");
    expect(empty).not.toContain("<svg");
  });

  it("organizes the dashboard around KPI, trend, destinations, and quiet audit details", async () => {
    const overview = await service.getCompleteAnalyticsData();
    overview.dailyTraffic = [
      { date: "2026-10-31", pageviews: 4, visitors: 2 },
      { date: "2026-11-01", pageviews: 8, visitors: 3 },
    ];
    const html = renderToStaticMarkup(await summaryWithAudit({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} }));
    expect(html.indexOf("核心指标")).toBeLessThan(html.indexOf("每日访问趋势"));
    expect(html).toContain('role="img"');
    expect(html).toContain("趋势数据表");
    expect(html).toContain("热门访问路径");
    expect(html).toContain("热门地区");
    expect(html).toContain("询价商机");
    expect(html).toContain("<details");
    expect(html).not.toContain("min-w-[1060px]");
  });

  it("returns a Suspense shell without waiting for either data source and forwards query values", async () => {
    const shell = await AnalyticsPage({ searchParams: Promise.resolve({ period: ["7d", "all"], startDate: "2026-10-01", endDate: "2026-10-31", page: "3" }) });
    expect(service.getAnalyticsOverview).toHaveBeenCalledWith("7d");
    expect(service.getVisitorAnalyticsData).toHaveBeenCalledWith({ startDate: "2026-10-01", endDate: "2026-10-31", page: 3 });
    expect(service.getCompleteAnalyticsData).not.toHaveBeenCalled();
    const boundaries = React.Children.toArray(shell.props.children).filter((child) => React.isValidElement(child) && child.type === Suspense);
    expect(boundaries.length).toBeGreaterThanOrEqual(2);
    const sectionTypes = boundaries.map((boundary) => React.isValidElement<{ children: React.ReactElement }>(boundary) ? boundary.props.children.type : null);
    expect(sectionTypes).toEqual([AnalyticsOverviewHeader, AnalyticsSummarySection, AnalyticsVisitorSection, AnalyticsAuditSection]);
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
    expect(html).toContain("中国");
    expect(html).toContain("广东 · 深圳");
    expect(html).toContain("展开轨迹");
    expect(html).toContain('aria-label="访客轨迹表，可横向滚动"');
    expect(html).not.toContain('<details open');
    expect(html).toContain('name="startDate" value="2026-10-01"');
    expect(html).toContain("period=7d&amp;startDate=2026-10-01&amp;endDate=2026-10-31&amp;page=1");
    expect(html).toContain("period=7d&amp;startDate=2026-10-01&amp;endDate=2026-10-31&amp;page=3");
  });

  it("renders every summary business block without visitor results", async () => {
    const overview = await service.getCompleteAnalyticsData();
    const section = await summaryWithAudit({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} });
    const html = renderToStaticMarkup(section);
    for (const title of ["页面浏览量 (PV)", "每日访问趋势", "热门访问路径", "产品浏览排行榜", "热门地区 · IP 推断", "访问终端环境", "询价商机", "品牌产品储备分布"]) expect(html).toContain(title);
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
 const html = renderToStaticMarkup(await summaryWithAudit({dataPromise: Promise.resolve(overview), selectedPeriod: "all", visitorOptions: {}}));
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
  const html = renderToStaticMarkup(await summaryWithAudit({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} }));
  for (const note of ["已记录原始 PV", "明确自动化 PV", "剩余候选 PV", "其中缺失 UA PV（子集）", "不另行相加", "已停止持久化", "不是完整爬虫请求记录", "当前未做 DNS 验证", "不是已验证位置", "不做推断映射", "页面语言", "203.0.113.xxx", "Baidu", "CN / GD / SZ", "/en/products"]) expect(html).toContain(note);
  expect(html).not.toContain("高置信");
  expect(html).not.toContain("已验证真人");
});

it("distinguishes missing breakdown and empty stored crawler snapshots from no crawler requests", async () => {
  const overview = await service.getCompleteAnalyticsData();
  const render = () => summaryWithAudit({ dataPromise: Promise.resolve(overview), selectedPeriod: "all", visitorOptions: {} });
  expect(renderToStaticMarkup(await render())).toContain("流量分层数据不可用");
  overview.trafficBreakdown = { ruleVersion: "shared-ua-v2", recordedRawPageviews: 0, explicitAutomationPageviews: 0, remainingCandidatePageviews: 0, missingUaPageviews: 0, crawlers: [] };
  expect(renderToStaticMarkup(await render())).toContain("不代表没有爬虫请求");
});

it("retains the product inventory count outside the primary KPI cards", async () => {
  const overview = await service.getCompleteAnalyticsData();
  overview.products.totalCount = 1234;
  const html = renderToStaticMarkup(await AnalyticsAuditSection({ dataPromise: Promise.resolve(overview), selectedPeriod: "30d", visitorOptions: {} }));
  expect(html).toContain("1,234 款已建档产品");
});

it.each([
  [{ startDate: "2026-02-30", endDate: "invalid" }, "2026-10-19", "2026-11-17"],
  [{ startDate: "2026-11-15", endDate: "2026-11-01" }, "2026-11-15", "2026-11-15"],
  [{ startDate: "2026-12-01", endDate: "2026-12-05" }, "2026-11-17", "2026-11-17"],
  [{ startDate: "2026-01-01", endDate: "2026-11-17" }, "2026-08-19", "2026-11-17"],
])("keeps the existing visitor date normalization for %j", (options, startDate, endDate) => {
  const now = new Date("2026-11-17T12:00:00Z");
  const result = resolveVisitorDateRange(options, now, "Asia/Shanghai");
  expect(result).toMatchObject({ startDate, endDate });
  expect(result.start.getTime()).toBeGreaterThanOrEqual(now.getTime() - 90 * 86_400_000);
  expect(result.end.getTime()).toBeLessThanOrEqual(now.getTime());
});

it.each([1, 3])("preserves normalized dates and period at visitor page boundary %s", async (page) => {
  const html = renderToStaticMarkup(await AnalyticsVisitorSection({
    selectedPeriod: "all",
    dataPromise: Promise.resolve({ rows: [], meta: { startDate: "2026-08-19", endDate: "2026-11-17", page, pageSize: 50, totalCount: 124, totalPages: 3, totalVisits: 286, hiddenCrawlerVisits: 22 } }),
  }));
  expect(html.includes("上一页")).toBe(page > 1);
  expect(html.includes("下一页")).toBe(page < 3);
  expect(html).toContain("period=all&amp;startDate=2026-08-19&amp;endDate=2026-11-17&amp;page=2");
});

it("retains country, province and city without inventing unavailable geography", async () => {
  const base = { visitCount: 2, unknownUaVisits: 1, pages: [], locales: [], referrers: [], firstVisitedAt: "2026-11-16", lastVisitedAt: "2026-11-17" };
  const html = renderToStaticMarkup(await AnalyticsVisitorSection({
    selectedPeriod: "7d",
    dataPromise: Promise.resolve({
      rows: [
        { ...base, id: "known", ipAddress: "203.0.113.1", country: "CN", region: "广东", city: "深圳", geoStatus: "edgeone" as const },
        { ...base, id: "unknown", ipAddress: "203.0.113.2", country: "UNKNOWN", region: "—", city: "—", geoStatus: "unavailable" as const },
      ],
      meta: { startDate: "2026-11-11", endDate: "2026-11-17", page: 1, pageSize: 50, totalCount: 2, totalPages: 1, totalVisits: 4, hiddenCrawlerVisits: 0 },
    }),
  }));
  expect(html).toContain("中国");
  expect(html).toContain("广东 · 深圳");
  expect(html).toContain("未获得地区");
  expect(html).toContain("未找到可关联的地区信息");
  expect(html).toContain("其中缺失 UA 1 次（未知）");
  expect(html).not.toContain("已验证真人");
});

it("describes the service's zero-filled calendar window and retains every daily value", () => {
  const html = renderToStaticMarkup(<AnalyticsTrend dailyTraffic={[
    { date: "2026-11-01", pageviews: 4, visitors: 2 },
    { date: "2026-11-02", pageviews: 8, visitors: null },
    { date: "2026-11-03", pageviews: 0, visitors: 0 },
    { date: "2026-11-04", pageviews: 6, visitors: 3 },
  ]} timezone="Asia/Shanghai" available periodLabel="近 7 天" />);
  const container = document.createElement("div");
  container.innerHTML = html;
  const positions = [...container.querySelectorAll("circle")].map((circle) => Number(circle.getAttribute("cx")));
  expect(positions[1] - positions[0]).toBeCloseTo((positions[3] - positions[0]) / 3);
  const rows = [...container.querySelectorAll("tbody tr")];
  expect(rows).toHaveLength(4);
  expect([...rows[2].querySelectorAll("td")].map((cell) => cell.textContent)).toEqual(["2026-11-03", "0", "0"]);
  expect(container.querySelector("desc")?.textContent).toContain("按周期补齐日期");
  expect(container.querySelector("desc")?.textContent).toContain("暂无记录日期显示 0");
  expect(container.querySelector("desc")?.textContent).toContain("首日可能不完整");
  expect(container.querySelector("desc")?.textContent).toContain("表格可查看每日值（日期、PV 与 UV）");
  expect(container.querySelector("[data-slot=card-description]")?.textContent).toContain("按周期补齐日期，暂无记录日期显示 0；首日可能不完整；表格可查看每日值");
  expect(html).not.toMatch(/缺失日期不补零|只绘制真实返回值|不证明区间完整/);
  expect(html).toContain("不可用");
});

it("puts each wide table directly inside its single focusable scroll region", async () => {
  const overview = await service.getCompleteAnalyticsData();
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<>
    {await AnalyticsVisitorSection({ dataPromise: Promise.resolve({ rows: [], meta: { startDate: "2026-11-11", endDate: "2026-11-17", page: 1, pageSize: 50, totalCount: 0, totalPages: 1, totalVisits: 0, hiddenCrawlerVisits: 0 } }), selectedPeriod: "7d" })}
    {await AnalyticsSummarySection({ dataPromise: Promise.resolve(overview), selectedPeriod: "7d", visitorOptions: {} })}
  </>);
  for (const label of ["访客轨迹表，可横向滚动", "询价明细表，可横向滚动"]) {
    const region = container.querySelector<HTMLElement>(`[role="region"][aria-label="${label}"]`)!;
    expect(region).not.toBeNull();
    expect(region.tabIndex).toBe(0);
    expect(region.classList).toContain("overflow-x-auto");
    expect(region.querySelector(":scope > table")).not.toBeNull();
    expect(region.querySelector("[data-slot=table-container]")).toBeNull();
    expect(region.querySelectorAll("table")).toHaveLength(1);
  }
});
