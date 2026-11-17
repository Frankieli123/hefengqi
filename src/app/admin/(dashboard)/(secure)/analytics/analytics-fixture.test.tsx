import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";
import type { AnalyticsData, AnalyticsPeriod } from "@/lib/analytics-service";
import { AdminShell } from "@/components/admin/admin-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

const fixture = vi.hoisted(() => ({ overview: vi.fn(), visitors: vi.fn() }));
vi.mock("@/components/brand-mark", () => ({ AdminBrandMark: () => <span>RICEWIND</span> }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: async () => ({}) }));
vi.mock("@/lib/analytics-service", () => ({
  analyticsPeriodKeys: ["today", "7d", "30d", "all"],
  resolveVisitorDateRange: (options: { startDate?: string; endDate?: string }) => ({ startDate: options.startDate ?? "2026-11-11", endDate: options.endDate ?? "2026-11-17" }),
  getAnalyticsOverview: fixture.overview,
  getVisitorAnalyticsData: fixture.visitors,
}));
import AnalyticsPage from "./page";

it.skipIf(!process.env.ANALYTICS_FIXTURE_ARTIFACT_DIR)("exports synthetic SSR fixtures, never an application route or real data", async () => {
  const directory = process.env.ANALYTICS_FIXTURE_ARTIFACT_DIR!;
  fs.mkdirSync(directory, { recursive: true });
  const traffic = { pageviews: 286, visitors: 92, visits: 116, unknownUaPageviews: 14, hiddenCrawlerVisits: 22, bounces: null, bounceRate: null, avgDurationSec: null, avgDurationFormatted: "不可用" };
  const data: AnalyticsData = {
    selectedPeriod: "30d", trafficByPeriod: { today: { ...traffic, pageviews: 42, visitors: 19, visits: 23 }, "7d": traffic, "30d": { ...traffic, pageviews: 1248, visitors: 401, visits: 536 }, all: { ...traffic, pageviews: 3682, visitors: 940, visits: 1204 } },
    source: { available: true, timezone: "Asia/Shanghai", updatedAt: "2026-11-17T02:00:00Z", historyStart: "2026-08-20", historyEnd: "2026-11-17", countingPolicy: "合成演示：共享 UA 过滤后的候选访问，未验证真人。", durationPolicy: "无离站或活跃时长证据，不计算。" },
    legacySource: { available: true, historicallyFiltered: false, message: "Umami 历史补充统计：未按共享 UA 规则清理历史自动化；不能与候选流量混算。" },
    dailyTraffic: [18, 37, 28, 64, 43, 54, 42].map((pageviews, index) => ({ date: `2026-11-${11 + index}`, pageviews, visitors: index === 2 ? null : Math.round(pageviews / 2.4) })),
    topPaths: [{ path: "/zh/products", count: 116 }, { path: "/en/products/synthetic-modular-power-system/long-path-for-wrapping-verification", count: 74 }, { path: "/zh/contact", count: 36 }],
    products: { totalCount: 48, totalViews: 2840, topViewed: [{ id: "fixture-product", model: "DEMO-48V", brand: "合成品牌", category: "电源系统", name: "合成演示模块化电源系统", viewCount: 328, status: "PUBLISHED", updatedAt: "2026-11-17" }], brandDistribution: [{ name: "合成品牌", count: 32 }, { name: "演示品牌", count: 16 }] },
    inquiries: { totalCount: 12, newCount: 4, processingCount: 5, closedCount: 3, conversionRate: null, recent: [{ id: "fixture-inquiry", referenceId: "TEST-SYNTHETIC-001", name: "合成测试客户（非真实）", country: "演示地区", status: "NEW", createdAt: "2026-11-17" }] },
    topCountries: [{ code: "CN", count: 94 }, { code: "US", count: 43 }, { code: "UNKNOWN", count: 9 }], topRegions: [{ country: "CN", region: "Guangdong", count: 38 }], topCities: [{ country: "CN", city: "Shenzhen", count: 27 }],
    devices: [{ device: "desktop", count: 142 }, { device: "mobile", count: 86 }], os: [{ os: "Windows", count: 116 }], browsers: [{ browser: "Chrome", count: 132 }], events: [],
    visitorPageViews: [{ id: "fixture-visitor", ipAddress: "203.0.113.24", country: "CN", region: "广东", city: "深圳", geoStatus: "edgeone", visitCount: 6, unknownUaVisits: 2, pages: Array.from({ length: 10 }, (_, index) => ({ path: `/zh/products/synthetic-only-demo-${index}/long-product-path-for-responsive-verification`, count: index + 1, lastVisitedAt: "2026-11-17 09:00:00" })), locales: ["zh"], referrers: [], firstVisitedAt: "2026-11-16 08:00:00", lastVisitedAt: "2026-11-17 09:00:00" }],
    visitorPageViewMeta: { startDate: "2026-11-11", endDate: "2026-11-17", page: 2, pageSize: 50, totalCount: 124, totalPages: 3, totalVisits: 286, hiddenCrawlerVisits: 22, unknownUaVisits: 14 },
    trafficBreakdown: { ruleVersion: "shared-ua-v2", recordedRawPageviews: 308, explicitAutomationPageviews: 22, remainingCandidatePageviews: 286, missingUaPageviews: 14, crawlers: [{ brand: "Other", pageviews: 22, distinctPaths: 2, firstVisitedAt: "2026-11-11T00:00:00Z", lastVisitedAt: "2026-11-17T00:00:00Z", maskedIpSamples: ["203.0.113.xxx"], countries: [{ value: "CN", count: 22 }], regions: [{ value: "CN / GD", count: 22 }], cities: [{ value: "CN / GD / SZ", count: 22 }], languages: [{ value: "zh", count: 22 }], paths: [{ value: "/zh/products/synthetic-only", count: 22 }] }] },
  };
  for (const period of ["today", "7d", "30d", "all"] as AnalyticsPeriod[]) {
    for (const page of [1, 2, 3]) {
      for (const range of ["default", "changed"]) {
        const startDate = range === "default" ? "2026-11-11" : "2026-11-10";
        const endDate = range === "default" ? "2026-11-17" : "2026-11-16";
        fixture.overview.mockResolvedValue({ ...data, dailyTraffic: period === "today" ? data.dailyTraffic.slice(-1) : data.dailyTraffic });
        fixture.visitors.mockResolvedValue({ rows: data.visitorPageViews, meta: { ...data.visitorPageViewMeta, page, startDate, endDate } });
        const shell = await AnalyticsPage({ searchParams: Promise.resolve({ period, page: String(page), startDate, endDate }) });
        const sections = await Promise.all(React.Children.toArray(shell.props.children).map(async (boundary) => {
          const section = (boundary as React.ReactElement<{ children: React.ReactElement }>).props.children;
          return await (section.type as (props: unknown) => Promise<React.ReactNode>)(section.props);
        }));
        const html = renderToStaticMarkup(<TooltipProvider><AdminShell user={{ name: "合成演示管理员", email: "fixture@example.invalid", role: "ADMIN" }}><aside className="border-b bg-muted px-4 py-2 text-sm">本地合成数据 · 非生产证据 · 无数据库、登录态或通知</aside><main className={shell.props.className}>{sections.map((section, index) => <React.Fragment key={index}>{section}</React.Fragment>)}</main></AdminShell></TooltipProvider>);
        fs.writeFileSync(path.join(directory, `${period}-${page}-${range}.html`), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>合成统计 UI 验收</title><link rel="stylesheet" href="/fixture.css"></head><body style="--font-site:Arial,'Noto Sans CJK SC',sans-serif">${html}</body></html>`);
      }
    }
  }
});
