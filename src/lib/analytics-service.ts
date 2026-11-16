import { fetchVisitorPageViews } from "./analytics-visitors";
import { createAnalyticsCache } from "./analytics-cache";
import { resolveVisitorDateRange, startOfCalendarDate } from "./analytics-visitor-range";
import { ANALYTICS_COUNTING_POLICY, ANALYTICS_DURATION_POLICY, ANALYTICS_RETENTION_DAYS, fetchLocalTraffic } from "./analytics-local-traffic";
export { isCrawlerUserAgent } from "./analytics-bot";
export { resolveVisitorDateRange } from "./analytics-visitor-range";
import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { resolveRegionNameAsync, resolveCityNameAsync } from "@/lib/geo-names";

export const analyticsPeriodKeys = ["today", "7d", "30d", "all"] as const;
export type AnalyticsPeriod = (typeof analyticsPeriodKeys)[number];

type TrafficStats = {
  pageviews: number | null;
  visitors: number | null;
  visits: number | null;
  unknownUaPageviews: number | null;
  hiddenCrawlerVisits: number | null;
  bounces: null;
  bounceRate: null;
  avgDurationSec: null;
  avgDurationFormatted: string;
};

type MetricRow = { x?: string; y?: number; country?: string };

export interface AnalyticsData {
  trafficBreakdown?: import("./analytics-local-traffic").TrafficBreakdown;
  source: { available: boolean; message?: string; timezone: string; updatedAt: string; historyStart: string; historyEnd: string; countingPolicy: string; durationPolicy: string };
  legacySource: { available: boolean; historicallyFiltered: false; message: string };
  selectedPeriod: AnalyticsPeriod;
  trafficByPeriod: Record<AnalyticsPeriod, TrafficStats>;
  dailyTraffic: Array<{ date: string; pageviews: number; visitors: number | null }>;
  events: Array<{ name: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  topRegions: Array<{ region: string; country: string; count: number }>;
  topCountries: Array<{ code: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  os: Array<{ os: string; count: number }>;
  visitorPageViews: Array<{
    id: string;
    ipAddress: string;
    country: string;
    region: string;
    city: string;
    geoStatus: "umami" | "edgeone" | "unavailable";
    visitCount: number;
    unknownUaVisits?: number;
    pages: Array<{ path: string; count: number; lastVisitedAt: string }>;
    locales: string[];
    referrers: string[];
    firstVisitedAt: string;
    lastVisitedAt: string;
  }>;
  visitorPageViewMeta: {
    startDate: string;
    endDate: string;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    totalVisits: number;
    hiddenCrawlerVisits: number;
    unknownUaVisits?: number;
    countingPolicy?: string;
  };
  products: {
    totalCount: number;
    totalViews: number;
    topViewed: Array<{ id: string; model: string; brand: string; category: string; name: string; viewCount: number; status: string; updatedAt: string }>;
    brandDistribution: Array<{ name: string; count: number }>;
  };
  inquiries: {
    totalCount: number;
    newCount: number;
    processingCount: number;
    closedCount: number;
    conversionRate: number | null;
    recent: Array<{ id: string; referenceId: string; name: string; country: string; status: string; createdAt: string }>;
  };
}

export interface VisitorPageViewOptions {
  startDate?: string;
  endDate?: string;
  page?: number;
}

function unavailableStats(): TrafficStats {
  return {
    pageviews: null, visitors: null, visits: null, unknownUaPageviews: null, hiddenCrawlerVisits: null,
    bounces: null, bounceRate: null, avgDurationSec: null, avgDurationFormatted: "不可用",
  };
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function startOfZonedDay(date: Date, timezone: string): number {
  return startOfCalendarDate(dayKey(date, timezone), timezone).getTime();
}

function dayKey(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function analyticsRanges(now: Date, timezone: string) {
  const today = startOfZonedDay(now, timezone);
  return { today, "7d": startOfCalendarDate(calendarDayKey(now, timezone, -6), timezone).getTime(),
    "30d": startOfCalendarDate(calendarDayKey(now, timezone, -29), timezone).getTime(), all: 0 } satisfies Record<AnalyticsPeriod, number>;
}

function calendarDayKey(now: Date, timezone: string, offset: number) {
  const { year, month, day } = zonedParts(now, timezone);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

function emptyTrafficByPeriod(): Record<AnalyticsPeriod, TrafficStats> {
  const empty = () => unavailableStats();
  return { today: empty(), "7d": empty(), "30d": empty(), all: empty() };
}

function mapMetric(items: MetricRow[] | undefined, fallback: string) {
  return (items ?? []).map((item) => ({ name: item.x?.trim() || fallback, count: Number(item.y) || 0 }));
}

async function fetchJson<T>(baseUrl: string, path: string, token: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`UMAMI_${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchLegacyAnalytics(selectedPeriod: AnalyticsPeriod, now: Date, ranges: Record<AnalyticsPeriod, number>) {
  const timezone = env.UMAMI_TIMEZONE;
  const legacyMessage = "Umami 历史补充统计：未按共享 UA 规则清理历史自动化；不是本地候选访问统计，不能与候选 PV/UV/会话或转化率混算。全部周期为 Umami 历史累计。";
  const empty = {
    legacySource: { available: false, historicallyFiltered: false as const, message: `${legacyMessage} 当前不可用。` },
    events: [] as Array<{ name: string; count: number }>,
    topCities: [] as Array<{ city: string; country: string; count: number }>, topRegions: [] as Array<{ region: string; country: string; count: number }>,
    topCountries: [] as Array<{ code: string; count: number }>, devices: [] as Array<{ device: string; count: number }>,
    browsers: [] as Array<{ browser: string; count: number }>, os: [] as Array<{ os: string; count: number }>,
  };

  const username = env.UMAMI_USERNAME ?? (env.NODE_ENV === "development" ? "admin" : undefined);
  const password = env.UMAMI_PASSWORD ?? (env.NODE_ENV === "development" ? "umami" : undefined);
  if (!env.UMAMI_WEBSITE_ID || !username || !password) return empty;

  try {
    const loginResponse = await fetch(`${env.UMAMI_API_URL}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }), cache: "no-store", signal: AbortSignal.timeout(5_000),
    });
    if (!loginResponse.ok) throw new Error(`UMAMI_LOGIN_${loginResponse.status}`);
    const login = await loginResponse.json() as { token?: string };
    if (!login.token) throw new Error("UMAMI_TOKEN_MISSING");

    const websitePath = `/api/websites/${encodeURIComponent(env.UMAMI_WEBSITE_ID)}`;
    const query = (startAt: number, extra: Record<string, string> = {}) => new URLSearchParams({ startAt: String(startAt), endAt: String(now.getTime()), timezone, ...extra }).toString();
    const metricPath = (type: string) => `${websitePath}/metrics?${query(ranges[selectedPeriod], { type, limit: "20" })}`;
    const [rawCities, rawRegions, rawCountries, rawDevices, rawBrowsers, rawOs, rawEvents] = await Promise.all([
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("city"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("region"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("country"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("device"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("browser"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("os"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("event"), login.token),
    ]);

    return {
      legacySource: { available: true, historicallyFiltered: false as const, message: legacyMessage },
      events: mapMetric(rawEvents, "未命名事件").map(({ name, count }) => ({ name, count })),
      topCities: await Promise.all((rawCities ?? []).map(async (item) => ({ city: await resolveCityNameAsync(item.x?.trim() || "未知城市"), country: item.country || "--", count: Number(item.y) || 0 }))),
      topRegions: await Promise.all((rawRegions ?? []).map(async (item) => ({ region: await resolveRegionNameAsync(item.x?.trim() || "未知地区"), country: item.country || "--", count: Number(item.y) || 0 }))),
      topCountries: mapMetric(rawCountries, "--").map(({ name, count }) => ({ code: name, count })),
      devices: mapMetric(rawDevices, "未知设备").map(({ name, count }) => ({ device: name, count })),
      browsers: mapMetric(rawBrowsers, "其他浏览器").map(({ name, count }) => ({ browser: name, count })),
      os: mapMetric(rawOs, "其他系统").map(({ name, count }) => ({ os: name, count })),
    };
  } catch (error) {
    console.error("Failed to fetch Umami stats for dashboard:", error instanceof Error ? error.message : "UNKNOWN");
    return empty;
  }
}

async function fetchTrafficAnalytics(selectedPeriod: AnalyticsPeriod) {
  const timezone = env.UMAMI_TIMEZONE;
  const now = new Date();
  const ranges = analyticsRanges(now, timezone);
  const source = {
    available: false, timezone, updatedAt: "",
    historyStart: new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86_400_000).toISOString(),
    historyEnd: now.toISOString(), countingPolicy: ANALYTICS_COUNTING_POLICY, durationPolicy: ANALYTICS_DURATION_POLICY,
  };
  try {
    const local = await fetchLocalTraffic(ranges, now, timezone, selectedPeriod);
    const trafficByPeriod = emptyTrafficByPeriod();
    for (const period of analyticsPeriodKeys) trafficByPeriod[period] = { ...unavailableStats(), ...local.trafficByPeriod[period] };
    const days = new Map(local.dailyTraffic.map(day => [day.date, day]));
    const selectedStart = new Date(Math.max(ranges[selectedPeriod], Date.parse(source.historyStart)));
    const firstDay = dayKey(selectedStart, timezone);
    const dayCount = Math.round((Date.parse(dayKey(now, timezone)) - Date.parse(firstDay)) / 86_400_000) + 1;
    const dailyTraffic = Array.from({ length: dayCount }, (_, index) => {
      const date = calendarDayKey(now, timezone, index - dayCount + 1);
      return days.get(date) ?? { date, pageviews: 0, visitors: 0 };
    });
    const legacy = await fetchLegacyAnalytics(selectedPeriod, now, ranges);
    return { ...legacy, source: { ...source, available: true, updatedAt: now.toISOString() }, selectedPeriod,
      trafficByPeriod, dailyTraffic, topPaths: local.topPaths, trafficBreakdown: local.trafficBreakdown };
  } catch (error) {
    console.error("Local traffic analytics unavailable:", error instanceof Error ? error.message : "UNKNOWN");
    return {
      source: { ...source, message: "本地候选访问统计暂时不可用；未将查询失败显示为零访问。" }, selectedPeriod,
      legacySource: { available: false, historicallyFiltered: false as const, message: "Umami 历史补充统计不可用，且未清理历史自动化。" },
      trafficByPeriod: emptyTrafficByPeriod(), dailyTraffic: [], topPaths: [], events: [], topCities: [], topRegions: [],
      topCountries: [], devices: [], browsers: [], os: [],
    };
  }
}

export type AnalyticsOverview = Omit<AnalyticsData, "visitorPageViews" | "visitorPageViewMeta">;
const overviewCache = createAnalyticsCache<AnalyticsOverview>({ ttlMs: 60_000, maxStaleMs: 300_000, maxEntries: 16 });
const visitorCache = createAnalyticsCache<Awaited<ReturnType<typeof fetchVisitorPageViews>>>({ ttlMs: 15_000, maxStaleMs: 60_000, maxEntries: 64 });
class UnavailableOverview extends Error {
  constructor(readonly data: AnalyticsOverview) { super(data.source.message ?? "Analytics unavailable"); }
}

export async function getAnalyticsOverview(selectedPeriod: AnalyticsPeriod = "30d"): Promise<AnalyticsOverview> {
  const key = JSON.stringify([selectedPeriod, env.UMAMI_TIMEZONE, dayKey(new Date(), env.UMAMI_TIMEZONE)]);
  try {
    const snapshot = await overviewCache.get(key, async () => {
      const data = await loadAnalyticsOverview(selectedPeriod);
      if (!data.source.available) throw new UnavailableOverview(data);
      return data;
    });
    return { ...snapshot.value, source: { ...snapshot.value.source, updatedAt: snapshot.updatedAt,
      ...(snapshot.stale ? { message: "统计服务暂时无法连接，当前显示最近一次成功数据（已过期）。" } : {}) } };
  } catch (error) {
    // Cold failures retain business data, but are never stored as successful snapshots.
    if (error instanceof UnavailableOverview) return error.data;
    throw error;
  }
}

export async function getVisitorAnalyticsData(options: VisitorPageViewOptions = {}) {
  const range = resolveVisitorDateRange(options);
  const page = Number.isFinite(options.page) ? Math.min(2147483647, Math.max(1, Math.floor(options.page!))) : 1;
  const normalized = { startDate: range.startDate, endDate: range.endDate, page };
  const key = JSON.stringify([env.UMAMI_TIMEZONE, dayKey(new Date(), env.UMAMI_TIMEZONE), normalized]);
  const snapshot = await visitorCache.get(key, () => fetchVisitorPageViews(normalized));
  return { ...snapshot.value, source: { available: true, timezone: env.UMAMI_TIMEZONE, updatedAt: snapshot.updatedAt,
    ...(snapshot.stale ? { message: "访客查询暂时失败，当前显示最近一次成功数据（已过期）。" } : {}) } };
}

export async function getCompleteAnalyticsData(selectedPeriod: AnalyticsPeriod = "30d", visitorOptions: VisitorPageViewOptions = {}): Promise<AnalyticsData> {
  const [overview, visitors] = await Promise.all([getAnalyticsOverview(selectedPeriod), getVisitorAnalyticsData(visitorOptions)]);
  return { ...overview, visitorPageViews: visitors.rows, visitorPageViewMeta: visitors.meta };
}

async function loadAnalyticsOverview(selectedPeriod: AnalyticsPeriod): Promise<AnalyticsOverview> {
  const inquiryStart = selectedPeriod === "all" ? undefined : new Date(analyticsRanges(new Date(), env.UMAMI_TIMEZONE)[selectedPeriod]);
  const inquiryWhere = inquiryStart ? { createdAt: { gte: inquiryStart } } : undefined;
  const [traffic, totalProducts, productViewsAgg, topViewedProducts, brandsWithProducts, selectedInquiries, newInquiries, processingInquiries, closedInquiries, recentInquiries] = await Promise.all([
    fetchTrafficAnalytics(selectedPeriod), db.product.count(), db.product.aggregate({ _sum: { viewCount: true } }),
    db.product.findMany({ take: 8, orderBy: { viewCount: "desc" }, include: { brand: true, category: { include: { translations: { where: { locale: "zh" } } } }, translations: { where: { locale: "zh" } } } }),
    db.brand.findMany({ select: { name: true, _count: { select: { products: true } } }, orderBy: { products: { _count: "desc" } }, take: 8 }),
    db.inquiry.count({ where: inquiryWhere }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "NEW" } : { status: "NEW" } }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "PROCESSING" } : { status: "PROCESSING" } }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "CLOSED" } : { status: "CLOSED" } }),
    db.inquiry.findMany({ where: inquiryWhere, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, referenceId: true, name: true, country: true, status: true, createdAt: true } }),
  ]);
  const totalProductViews = productViewsAgg._sum.viewCount ?? 0;
  const resultData: AnalyticsOverview = {
    ...traffic,
    products: {
      totalCount: totalProducts, totalViews: totalProductViews,
      topViewed: topViewedProducts.map((product) => ({ id: product.id, model: product.model, brand: product.brand.name, category: product.category.translations[0]?.name ?? product.category.key, name: product.translations[0]?.name ?? "—", viewCount: product.viewCount, status: product.status, updatedAt: product.updatedAt.toISOString().slice(0, 10) })),
      brandDistribution: brandsWithProducts.map((brand) => ({ name: brand.name, count: brand._count.products })),
    },
    inquiries: {
      totalCount: selectedInquiries, newCount: newInquiries, processingCount: processingInquiries, closedCount: closedInquiries,
      conversionRate: null,
      recent: recentInquiries.map((inquiry) => ({ id: inquiry.id, referenceId: inquiry.referenceId, name: inquiry.name, country: inquiry.country, status: inquiry.status, createdAt: inquiry.createdAt.toISOString().slice(0, 10) })),
    },
  };
  return resultData;
}
