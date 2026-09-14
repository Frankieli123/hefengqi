import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const analyticsPeriodKeys = ["today", "7d", "30d", "all"] as const;
export type AnalyticsPeriod = (typeof analyticsPeriodKeys)[number];

type TrafficStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  bounceRate: number;
  avgDurationSec: number;
  avgDurationFormatted: string;
};

type MetricRow = { x?: string; y?: number; country?: string };
type RawStats = { pageviews?: number; visitors?: number; visits?: number; bounces?: number; totaltime?: number };
type RawPageviews = { pageviews?: MetricRow[]; sessions?: MetricRow[] };

export interface AnalyticsData {
  source: { available: boolean; message?: string; timezone: string; updatedAt: string };
  selectedPeriod: AnalyticsPeriod;
  trafficByPeriod: Record<AnalyticsPeriod, TrafficStats>;
  dailyTraffic: Array<{ date: string; pageviews: number; visitors: number }>;
  events: Array<{ name: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  topRegions: Array<{ region: string; country: string; count: number }>;
  topCountries: Array<{ code: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  os: Array<{ os: string; count: number }>;
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
    conversionRate: number;
    recent: Array<{ id: string; referenceId: string; name: string; country: string; status: string; createdAt: string }>;
  };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0秒";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) return `${remainingSeconds}秒`;
  return `${minutes}分${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ""}`;
}

function normalizeStats(raw: RawStats = {}): TrafficStats {
  const visits = raw.visits ?? 0;
  const bounces = raw.bounces ?? 0;
  const avgDurationSec = visits > 0 ? Math.round((raw.totaltime ?? 0) / visits) : 0;
  return {
    pageviews: raw.pageviews ?? 0,
    visitors: raw.visitors ?? 0,
    visits,
    bounces,
    bounceRate: visits > 0 ? Math.round((bounces / visits) * 100) : 0,
    avgDurationSec,
    avgDurationFormatted: formatDuration(avgDurationSec),
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
  const local = zonedParts(date, timezone);
  const utcMidnight = Date.UTC(local.year, local.month - 1, local.day);
  const atGuess = zonedParts(new Date(utcMidnight), timezone);
  const representedGuess = Date.UTC(atGuess.year, atGuess.month - 1, atGuess.day, atGuess.hour, atGuess.minute, atGuess.second);
  return utcMidnight - (representedGuess - utcMidnight);
}

function dayKey(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function analyticsRanges(now: Date, timezone: string) {
  const today = startOfZonedDay(now, timezone);
  return { today, "7d": today - 6 * 86_400_000, "30d": today - 29 * 86_400_000, all: 0 } satisfies Record<AnalyticsPeriod, number>;
}

function emptyTrafficByPeriod(): Record<AnalyticsPeriod, TrafficStats> {
  const empty = () => normalizeStats();
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

async function fetchTrafficAnalytics(selectedPeriod: AnalyticsPeriod) {
  const timezone = env.UMAMI_TIMEZONE;
  const now = new Date();
  const ranges = analyticsRanges(now, timezone);
  const empty = {
    source: { available: false, message: "统计服务尚未配置完整。", timezone, updatedAt: now.toISOString() }, selectedPeriod,
    trafficByPeriod: emptyTrafficByPeriod(), dailyTraffic: [] as Array<{ date: string; pageviews: number; visitors: number }>,
    events: [] as Array<{ name: string; count: number }>, topPaths: [] as Array<{ path: string; count: number }>,
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
    const [todayStats, weekStats, monthStats, allStats, rawDaily, rawPaths, rawCities, rawRegions, rawCountries, rawDevices, rawBrowsers, rawOs, rawEvents] = await Promise.all([
      fetchJson<RawStats>(env.UMAMI_API_URL, `${websitePath}/stats?${query(ranges.today)}`, login.token),
      fetchJson<RawStats>(env.UMAMI_API_URL, `${websitePath}/stats?${query(ranges["7d"])}`, login.token),
      fetchJson<RawStats>(env.UMAMI_API_URL, `${websitePath}/stats?${query(ranges["30d"])}`, login.token),
      fetchJson<RawStats>(env.UMAMI_API_URL, `${websitePath}/stats?${query(ranges.all)}`, login.token),
      fetchJson<RawPageviews>(env.UMAMI_API_URL, `${websitePath}/pageviews?${query(ranges["7d"], { unit: "day" })}`, login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("path"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("city"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("region"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("country"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("device"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("browser"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("os"), login.token),
      fetchJson<MetricRow[]>(env.UMAMI_API_URL, metricPath("event"), login.token),
    ]);

    const pageviewsByDate = new Map((rawDaily.pageviews ?? []).map((item) => [item.x?.slice(0, 10), Number(item.y) || 0]));
    const visitorsByDate = new Map((rawDaily.sessions ?? []).map((item) => [item.x?.slice(0, 10), Number(item.y) || 0]));
    const dailyTraffic = Array.from({ length: 7 }, (_, index) => {
      const date = dayKey(new Date(ranges["7d"] + index * 86_400_000), timezone);
      return { date, pageviews: pageviewsByDate.get(date) ?? 0, visitors: visitorsByDate.get(date) ?? 0 };
    });

    return {
      source: { available: true, timezone, updatedAt: now.toISOString() }, selectedPeriod,
      trafficByPeriod: { today: normalizeStats(todayStats), "7d": normalizeStats(weekStats), "30d": normalizeStats(monthStats), all: normalizeStats(allStats) },
      dailyTraffic,
      events: mapMetric(rawEvents, "未命名事件").map(({ name, count }) => ({ name, count })),
      topPaths: mapMetric(rawPaths, "/").map(({ name, count }) => ({ path: name, count })),
      topCities: (rawCities ?? []).map((item) => ({ city: item.x?.trim() || "未知城市", country: item.country || "--", count: Number(item.y) || 0 })),
      topRegions: (rawRegions ?? []).map((item) => ({ region: item.x?.trim() || "未知地区", country: item.country || "--", count: Number(item.y) || 0 })),
      topCountries: mapMetric(rawCountries, "--").map(({ name, count }) => ({ code: name, count })),
      devices: mapMetric(rawDevices, "未知设备").map(({ name, count }) => ({ device: name, count })),
      browsers: mapMetric(rawBrowsers, "其他浏览器").map(({ name, count }) => ({ browser: name, count })),
      os: mapMetric(rawOs, "其他系统").map(({ name, count }) => ({ os: name, count })),
    };
  } catch (error) {
    console.error("Failed to fetch Umami stats for dashboard:", error instanceof Error ? error.message : "UNKNOWN");
    return { ...empty, source: { ...empty.source, message: "统计服务暂时无法连接，请检查 Umami 服务与后台凭据。" } };
  }
}

export async function getCompleteAnalyticsData(selectedPeriod: AnalyticsPeriod = "30d"): Promise<AnalyticsData> {
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
  const selectedVisitors = traffic.trafficByPeriod[selectedPeriod].visitors;
  return {
    ...traffic,
    products: {
      totalCount: totalProducts, totalViews: totalProductViews,
      topViewed: topViewedProducts.map((product) => ({ id: product.id, model: product.model, brand: product.brand.name, category: product.category.translations[0]?.name ?? product.category.key, name: product.translations[0]?.name ?? "—", viewCount: product.viewCount, status: product.status, updatedAt: product.updatedAt.toISOString().slice(0, 10) })),
      brandDistribution: brandsWithProducts.map((brand) => ({ name: brand.name, count: brand._count.products })),
    },
    inquiries: {
      totalCount: selectedInquiries, newCount: newInquiries, processingCount: processingInquiries, closedCount: closedInquiries,
      conversionRate: selectedVisitors > 0 ? Number(((selectedInquiries / selectedVisitors) * 100).toFixed(1)) : 0,
      recent: recentInquiries.map((inquiry) => ({ id: inquiry.id, referenceId: inquiry.referenceId, name: inquiry.name, country: inquiry.country, status: inquiry.status, createdAt: inquiry.createdAt.toISOString().slice(0, 10) })),
    },
  };
}
