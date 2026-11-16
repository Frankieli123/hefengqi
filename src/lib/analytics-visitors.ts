import "server-only";
import { lookupSessionGeography } from "./analytics-umami-geo";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { resolveRegionNameAsync, resolveCityNameAsync } from "@/lib/geo-names";
import { resolveVisitorDateRange } from "./analytics-visitor-range";
import type { AnalyticsData, VisitorPageViewOptions } from "./analytics-service";

// Same alternatives and case-insensitive substring semantics as isCrawlerUserAgent.
export const CRAWLER_PATTERN = "bot|crawler|spider|slurp|headless|preview|facebookexternalhit|semrush|ahrefs|bytespider|petalbot|gptbot|chatgpt-user|claudebot|anthropic-ai|applebot|perplexity|yandex|baiduspider|google-inspectiontool|amazonbot|amzn-search|censysinspect";
export function isCrawlerUserAgent(value: string | null | undefined) {
  return Boolean(value && new RegExp(CRAWLER_PATTERN, "i").test(value));
}
export const VISITOR_PAGE_SIZE = 50;
export const VISITOR_COUNTING_POLICY = "仅排除已识别 User-Agent 爬虫；历史缺失 UA/地理记录保留，不再通过 Umami 事件猜测匹配或隐藏。地区本地优先，缺失时按会话 ID 精确补全。";
type Visitor = AnalyticsData["visitorPageViews"][number];
type RawVisitor = Omit<Visitor, "region" | "city"> & { region: string | null; city: string | null; umamiSessionIds?: string[] };
type Aggregate = { totalCount: bigint; totalVisits: bigint; hiddenCrawlerVisits: bigint; page: number; visitors: RawVisitor[] };

export function visitorPageQuery(start: Date, end: Date, requestedPage: number) {
  return Prisma.sql`
    WITH ranged AS MATERIALIZED (
      SELECT *, COALESCE("userAgent", '') ~* ${CRAWLER_PATTERN} AS crawler
      FROM "AnalyticsPageView" WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    ), visible AS (
      SELECT * FROM ranged WHERE NOT crawler
    ), groups AS (
      SELECT "ipHash", MAX("createdAt") AS last_time FROM visible GROUP BY "ipHash"
    ), totals AS (
      SELECT (SELECT COUNT(*) FROM groups) AS "totalCount",
        (SELECT COUNT(*) FROM visible) AS "totalVisits",
        (SELECT COUNT(*) FROM ranged WHERE crawler) AS "hiddenCrawlerVisits"
    ), paging AS (
      SELECT *, LEAST(${requestedPage}::integer, GREATEST(1, CEIL("totalCount" / ${VISITOR_PAGE_SIZE}::numeric)::integer)) AS page
      FROM totals
    ), selected AS (
      SELECT * FROM groups ORDER BY last_time DESC, "ipHash" ASC
      LIMIT ${VISITOR_PAGE_SIZE} OFFSET (SELECT (page - 1) * ${VISITOR_PAGE_SIZE} FROM paging)
    ), details AS (
      SELECT v.* FROM visible v JOIN selected s USING ("ipHash")
    ), visitors AS (
      SELECT d."ipHash", MAX(d."createdAt") AS last_time,
        jsonb_build_object(
          'id', (array_agg(d.id ORDER BY d."createdAt" DESC, d.id DESC))[1],
          'ipAddress', COALESCE((array_agg(d."ipAddress" ORDER BY d."createdAt" DESC, d.id DESC) FILTER (WHERE d."ipAddress" IS NOT NULL))[1],
            '历史脱敏记录（' || (array_agg(d."ipMasked" ORDER BY d."createdAt" DESC, d.id DESC))[1] || '）'),
          'country', COALESCE((array_agg(d.country ORDER BY d."createdAt" DESC, d.id DESC) FILTER (WHERE NULLIF(d.country, '') IS NOT NULL))[1], '--'),
          'region', (array_agg(d.region ORDER BY d."createdAt" DESC, d.id DESC) FILTER (WHERE NULLIF(d.region, '') IS NOT NULL))[1],
          'city', (array_agg(d.city ORDER BY d."createdAt" DESC, d.id DESC) FILTER (WHERE NULLIF(d.city, '') IS NOT NULL))[1],
          'geoStatus', CASE WHEN BOOL_OR(NULLIF(d.country, '') IS NOT NULL OR NULLIF(d.region, '') IS NOT NULL OR NULLIF(d.city, '') IS NOT NULL) THEN 'edgeone' ELSE 'unavailable' END,
          'umamiSessionIds', (SELECT COALESCE(jsonb_agg(x.sid ORDER BY x.latest DESC, x.sid), '[]'::jsonb) FROM (SELECT u."umamiSessionId" sid, MAX(u."createdAt") latest FROM details u WHERE u."ipHash" = d."ipHash" AND u."umamiSessionId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' GROUP BY u."umamiSessionId" ORDER BY latest DESC, sid LIMIT 20) x),
          'visitCount', COUNT(*),
          'firstVisitedAt', to_char(MIN(d."createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'lastVisitedAt', to_char(MAX(d."createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'locales', COALESCE(jsonb_agg(DISTINCT d.locale ORDER BY d.locale) FILTER (WHERE NULLIF(d.locale, '') IS NOT NULL), '[]'::jsonb),
          'referrers', COALESCE(jsonb_agg(DISTINCT d.referrer ORDER BY d.referrer) FILTER (WHERE NULLIF(d.referrer, '') IS NOT NULL), '[]'::jsonb),
          'pages', (SELECT COALESCE(jsonb_agg(jsonb_build_object('path', p.path, 'count', p.n, 'lastVisitedAt', to_char(p.latest, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ORDER BY p.latest DESC, p.path ASC), '[]'::jsonb)
            FROM (SELECT path, COUNT(*) n, MAX("createdAt") latest FROM details WHERE "ipHash" = d."ipHash" GROUP BY path) p)
        ) AS visitor
      FROM details d GROUP BY d."ipHash"
    )
    SELECT paging.*, COALESCE((SELECT jsonb_agg(visitor ORDER BY last_time DESC, "ipHash" ASC) FROM visitors), '[]'::jsonb) AS visitors
    FROM paging
  `;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: env.UMAMI_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value)).replaceAll("/", "-");
}

export async function fetchVisitorPageViews(options: VisitorPageViewOptions = {}) {
  const range = resolveVisitorDateRange(options);
  const requestedPage = Number.isFinite(options.page) ? Math.min(2147483647, Math.max(1, Math.floor(options.page!))) : 1;
  // One statement/snapshot: counts, clamped group page and all paths for that page.
  // Failures propagate instead of turning a database outage into a plausible empty report.
  const [result] = await db.$queryRaw<Aggregate[]>(visitorPageQuery(range.start, range.end, requestedPage));
  if (!result) throw new Error("VISITOR_AGGREGATE_MISSING");
  const ids = [...new Set(result.visitors.flatMap(v=>v.umamiSessionIds ?? []))];
  if (ids.length) {
    try {
      const sessions = new Map((await lookupSessionGeography(ids)).map(s=>[s.session_id,s]));
      result.visitors = result.visitors.map(v=>{
        const session = (v.umamiSessionIds ?? []).map(id=>sessions.get(id)).find(s=>s && (s.country || s.region || s.city));
        if (!session) return v;
        const hasLocal = Boolean((v.country && v.country !== "--") || v.region || v.city);
        return {...v, country:v.country && v.country !== "--" ? v.country : session.country || "--",region:v.region || session.region,city:v.city || session.city,geoStatus:hasLocal ? v.geoStatus : "umami"};
      });
    } catch { console.warn("[analytics] Session geography unavailable; retaining saved geography"); }
  }
  const regions = [...new Set(result.visitors.map(v => v.region).filter((v): v is string => Boolean(v)))];
  const cities = [...new Set(result.visitors.map(v => v.city).filter((v): v is string => Boolean(v)))];
  const [regionNames, cityNames] = await Promise.all([
    Promise.all(regions.map(async name => [name, await resolveRegionNameAsync(name)] as const)),
    Promise.all(cities.map(async name => [name, await resolveCityNameAsync(name)] as const)),
  ]);
  const regionMap = new Map(regionNames), cityMap = new Map(cityNames);
  const rows: Visitor[] = result.visitors.map(({ umamiSessionIds: _sessionIds, ...v }) => ({ ...v, region: v.region ? regionMap.get(v.region)! : "—", city: v.city ? cityMap.get(v.city)! : "—", firstVisitedAt: formatDate(v.firstVisitedAt), lastVisitedAt: formatDate(v.lastVisitedAt), pages: v.pages.map(p => ({ ...p, lastVisitedAt: formatDate(p.lastVisitedAt) })) }));
  const totalCount = Number(result.totalCount);
  return { rows, meta: { startDate: range.startDate, endDate: range.endDate, page: result.page, pageSize: VISITOR_PAGE_SIZE, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / VISITOR_PAGE_SIZE)), totalVisits: Number(result.totalVisits), hiddenCrawlerVisits: Number(result.hiddenCrawlerVisits), countingPolicy: VISITOR_COUNTING_POLICY } };
}
