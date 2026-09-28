import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { resolveRegionNameAsync, resolveCityNameAsync } from "@/lib/geo-names";

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
type UmamiSession = { id?: string; country?: string | null; region?: string | null; city?: string | null };
type UmamiEvent = { sessionId?: string; createdAt?: string; urlPath?: string; eventType?: number; country?: string | null; city?: string | null };

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
  visitorPageViews: Array<{
    id: string;
    ipAddress: string;
    country: string;
    region: string;
    city: string;
    geoStatus: "umami" | "edgeone" | "unavailable";
    path: string;
    locale: string;
    referrer: string;
    createdAt: string;
  }>;
  visitorPageViewMeta: {
    startDate: string;
    endDate: string;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
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
    conversionRate: number;
    recent: Array<{ id: string; referenceId: string; name: string; country: string; status: string; createdAt: string }>;
  };
}

export interface VisitorPageViewOptions {
  startDate?: string;
  endDate?: string;
  page?: number;
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

const DAY_MS = 86_400_000;
const VISITOR_RETENTION_DAYS = 90;
const VISITOR_PAGE_SIZE = 100;

function validDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateInput(value: Date, timezone: string) {
  const parts = zonedParts(value, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function calendarParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function addCalendarDay(value: string) {
  const { year, month, day } = calendarParts(value);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function timezoneOffset(value: Date, timezone: string) {
  const parts = zonedParts(value, timezone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - Math.floor(value.getTime() / 1_000) * 1_000;
}

function startOfCalendarDate(value: string, timezone: string) {
  const { year, month, day } = calendarParts(value);
  const target = Date.UTC(year, month - 1, day);
  let result = new Date(target);
  result = new Date(target - timezoneOffset(result, timezone));
  result = new Date(target - timezoneOffset(result, timezone));
  return result;
}

export function resolveVisitorDateRange(
  input: VisitorPageViewOptions = {},
  now = new Date(),
  timezone = env.UMAMI_TIMEZONE,
) {
  const today = dateInput(now, timezone);
  const defaultStart = dateInput(new Date(now.getTime() - 29 * DAY_MS), timezone);
  const rawStart = validDateInput(input.startDate) ? input.startDate : defaultStart;
  const requestedStart = rawStart > today ? today : rawStart;
  const rawEnd = validDateInput(input.endDate) ? input.endDate : today;
  const cappedEnd = rawEnd > today ? today : rawEnd;
  const endDate = cappedEnd < requestedStart ? requestedStart : cappedEnd;
  const retentionFloor = new Date(now.getTime() - VISITOR_RETENTION_DAYS * DAY_MS);
  let start = startOfCalendarDate(requestedStart, timezone);
  if (start < retentionFloor) start = retentionFloor;
  const requestedEnd = startOfCalendarDate(addCalendarDay(endDate), timezone);
  return {
    start,
    end: requestedEnd > now ? now : requestedEnd,
    startDate: dateInput(start, timezone),
    endDate,
  };
}

function formatVisitorDateTime(value: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return formatter.format(value).replaceAll("/", "-");
}

async function fetchVisitorPageViews(options: VisitorPageViewOptions = {}) {
  const range = resolveVisitorDateRange(options);
  const requestedPage = Math.max(1, Math.floor(options.page ?? 1) || 1);
  try {
    const where = { createdAt: { gte: range.start, lt: range.end } };
    const totalCount = await db.analyticsPageView.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / VISITOR_PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const rows = await db.analyticsPageView.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * VISITOR_PAGE_SIZE,
      take: VISITOR_PAGE_SIZE,
      select: {
        id: true,
        ipAddress: true,
        ipMasked: true,
        country: true,
        region: true,
        city: true,
        umamiSessionId: true,
        path: true,
        locale: true,
        referrer: true,
        createdAt: true,
      },
    });
    const eventMatches = await fetchUmamiPageviewMatches(
      rows.filter((row) => !row.umamiSessionId).map((row) => ({ id: row.id, path: row.path, createdAt: row.createdAt })),
      range,
    );
    const sessionIds = rows
      .map((row) => row.umamiSessionId ?? eventMatches.get(row.id)?.sessionId)
      .filter((value): value is string => Boolean(value));
    const sessionGeography = await fetchUmamiSessionGeography(sessionIds, range);
    return {
      rows: await Promise.all(rows.map(async (row) => {
        const event = eventMatches.get(row.id);
        const sessionId = row.umamiSessionId ?? event?.sessionId;
        const geography = sessionId ? sessionGeography.get(sessionId) : undefined;
        const country = geography?.country ?? event?.country?.trim().toUpperCase() ?? row.country ?? "--";
        const region = geography?.region ?? row.region;
        const city = geography?.city ?? event?.city ?? row.city;
        const geoStatus: "umami" | "edgeone" | "unavailable" = geography || event ? "umami" : row.country || row.region || row.city ? "edgeone" : "unavailable";
        return {
          id: row.id,
          ipAddress: row.ipAddress ?? `历史脱敏记录（${row.ipMasked}）`,
          country,
          region: region ? await resolveRegionNameAsync(region) : "—",
          city: city ? await resolveCityNameAsync(city) : "—",
          geoStatus,
          path: row.path,
          locale: row.locale ?? "—",
          referrer: row.referrer ?? "直接访问",
          createdAt: formatVisitorDateTime(row.createdAt, env.UMAMI_TIMEZONE),
        };
      })),
      meta: {
        startDate: range.startDate,
        endDate: range.endDate,
        page,
        pageSize: VISITOR_PAGE_SIZE,
        totalCount,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Failed to fetch visitor page views:", error);
    return {
      rows: [],
      meta: { startDate: range.startDate, endDate: range.endDate, page: 1, pageSize: VISITOR_PAGE_SIZE, totalCount: 0, totalPages: 1 },
    };
  }
}

async function fetchUmamiPageviewMatches(
  rows: Array<{ id: string; path: string; createdAt: Date }>,
  range: ReturnType<typeof resolveVisitorDateRange>,
): Promise<Map<string, { sessionId: string; country: string | null; city: string | null }>> {
  const result = new Map<string, { sessionId: string; country: string | null; city: string | null }>();
  if (!rows.length || !env.UMAMI_WEBSITE_ID || !env.UMAMI_USERNAME || !env.UMAMI_PASSWORD) return result;

  try {
    const loginResponse = await fetch(`${env.UMAMI_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: env.UMAMI_USERNAME, password: env.UMAMI_PASSWORD }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!loginResponse.ok) return result;
    const login = (await loginResponse.json()) as { token?: string };
    if (!login.token) return result;

    const base = `${env.UMAMI_API_URL}/api/websites/${encodeURIComponent(env.UMAMI_WEBSITE_ID)}/events`;
    const events: UmamiEvent[] = [];
    const pageSize = 1_000;
    for (let page = 1; page <= 20; page += 1) {
      const params = new URLSearchParams({ startAt: String(range.start.getTime()), endAt: String(range.end.getTime()), page: String(page), pageSize: String(pageSize), eventType: "1" });
      const response = await fetch(`${base}?${params.toString()}`, { headers: { Authorization: `Bearer ${login.token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!response.ok) return result;
      const payload = (await response.json()) as { data?: UmamiEvent[]; count?: number };
      events.push(...(payload.data ?? []));
      if (!payload.data?.length || payload.data.length < pageSize || !payload.count || page * pageSize >= payload.count) break;
    }

    const candidates = new Map<string, Array<UmamiEvent & { timestamp: number }>>();
    for (const event of events) {
      if (!event.sessionId || !event.urlPath || !event.createdAt) continue;
      const timestamp = Date.parse(event.createdAt);
      if (!Number.isFinite(timestamp)) continue;
      const list = candidates.get(event.urlPath) ?? [];
      list.push({ ...event, timestamp });
      candidates.set(event.urlPath, list);
    }
    const used = new Set<UmamiEvent>();
    for (const row of rows) {
      let best: (UmamiEvent & { timestamp: number }) | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const event of candidates.get(row.path) ?? []) {
        if (used.has(event)) continue;
        const distance = Math.abs(event.timestamp - row.createdAt.getTime());
        if (distance < bestDistance) { best = event; bestDistance = distance; }
      }
      // The event and local persistence are normally written within milliseconds.
      // Keep the bound finite so unrelated visits are never guessed together.
      if (!best || bestDistance > 120_000) continue;
      used.add(best);
      result.set(row.id, { sessionId: best.sessionId!, country: best.country?.trim().toUpperCase() || null, city: best.city?.trim() || null });
    }
  } catch (error) {
    console.error("Failed to match visitor page views with Umami events:", error instanceof Error ? error.message : "UNKNOWN");
  }
  return result;
}

async function fetchUmamiSessionGeography(
  sessionIds: string[],
  range: ReturnType<typeof resolveVisitorDateRange>,
): Promise<Map<string, { country: string | null; region: string | null; city: string | null }>> {
  const result = new Map<string, { country: string | null; region: string | null; city: string | null }>();
  if (!sessionIds.length || !env.UMAMI_WEBSITE_ID || !env.UMAMI_USERNAME || !env.UMAMI_PASSWORD) return result;

  try {
    const loginResponse = await fetch(`${env.UMAMI_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: env.UMAMI_USERNAME, password: env.UMAMI_PASSWORD }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!loginResponse.ok) return result;
    const login = (await loginResponse.json()) as { token?: string };
    if (!login.token) return result;

    const wanted = new Set(sessionIds);
    const base = `${env.UMAMI_API_URL}/api/websites/${encodeURIComponent(env.UMAMI_WEBSITE_ID)}/sessions`;
    const pageSize = 500;
    for (let page = 1; page <= 10 && wanted.size > 0; page += 1) {
      const params = new URLSearchParams({
        startAt: String(range.start.getTime()),
        endAt: String(range.end.getTime()),
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`${base}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${login.token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return result;
      const payload = (await response.json()) as { data?: UmamiSession[]; count?: number };
      const sessions = payload.data ?? [];
      for (const session of sessions) {
        if (!session.id || !wanted.has(session.id)) continue;
        result.set(session.id, {
          country: session.country?.trim().toUpperCase() || null,
          region: session.region?.trim() || null,
          city: session.city?.trim() || null,
        });
        wanted.delete(session.id);
      }
      if (sessions.length < pageSize || !payload.count || page * pageSize >= payload.count) break;
    }

    for (const sessionId of wanted) {
      const response = await fetch(`${base}/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${login.token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) continue;
      const session = (await response.json()) as UmamiSession;
      result.set(sessionId, {
        country: session.country?.trim().toUpperCase() || null,
        region: session.region?.trim() || null,
        city: session.city?.trim() || null,
      });
    }
  } catch (error) {
    console.error("Failed to resolve visitor geography from Umami sessions:", error instanceof Error ? error.message : "UNKNOWN");
  }
  return result;
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
      topCities: await Promise.all((rawCities ?? []).map(async (item) => ({ city: await resolveCityNameAsync(item.x?.trim() || "未知城市"), country: item.country || "--", count: Number(item.y) || 0 }))),
      topRegions: await Promise.all((rawRegions ?? []).map(async (item) => ({ region: await resolveRegionNameAsync(item.x?.trim() || "未知地区"), country: item.country || "--", count: Number(item.y) || 0 }))),
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

export async function getCompleteAnalyticsData(
  selectedPeriod: AnalyticsPeriod = "30d",
  visitorOptions: VisitorPageViewOptions = {},
): Promise<AnalyticsData> {
  const inquiryStart = selectedPeriod === "all" ? undefined : new Date(analyticsRanges(new Date(), env.UMAMI_TIMEZONE)[selectedPeriod]);
  const inquiryWhere = inquiryStart ? { createdAt: { gte: inquiryStart } } : undefined;
  const [traffic, visitorPageViews, totalProducts, productViewsAgg, topViewedProducts, brandsWithProducts, selectedInquiries, newInquiries, processingInquiries, closedInquiries, recentInquiries] = await Promise.all([
    fetchTrafficAnalytics(selectedPeriod), fetchVisitorPageViews(visitorOptions), db.product.count(), db.product.aggregate({ _sum: { viewCount: true } }),
    db.product.findMany({ take: 8, orderBy: { viewCount: "desc" }, include: { brand: true, category: { include: { translations: { where: { locale: "zh" } } } }, translations: { where: { locale: "zh" } } } }),
    db.brand.findMany({ select: { name: true, _count: { select: { products: true } } }, orderBy: { products: { _count: "desc" } }, take: 8 }),
    db.inquiry.count({ where: inquiryWhere }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "NEW" } : { status: "NEW" } }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "PROCESSING" } : { status: "PROCESSING" } }), db.inquiry.count({ where: inquiryWhere ? { ...inquiryWhere, status: "CLOSED" } : { status: "CLOSED" } }),
    db.inquiry.findMany({ where: inquiryWhere, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, referenceId: true, name: true, country: true, status: true, createdAt: true } }),
  ]);
  const totalProductViews = productViewsAgg._sum.viewCount ?? 0;
  const selectedVisitors = traffic.trafficByPeriod[selectedPeriod].visitors;
  return {
    ...traffic,
    visitorPageViews: visitorPageViews.rows,
    visitorPageViewMeta: visitorPageViews.meta,
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
