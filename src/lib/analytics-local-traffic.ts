import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ANALYTICS_BOT_RULE_VERSION, CRAWLER_BRAND_DEFINITIONS, CRAWLER_PATTERN, UNKNOWN_UA_PATTERN, type CrawlerBrand } from "./analytics-bot";
import type { AnalyticsPeriod } from "./analytics-service";

export const ANALYTICS_RETENTION_DAYS = 90;
export const ANALYTICS_COUNTING_POLICY = "本地候选访问：仅按共享 User-Agent 规则排除已识别自动化，不按国家、语言、浏览器版本或 IP 排除。未匹配 UA 和缺失 UA 均未验证为真人；缺失 UA 保留并单列。UV 按匿名访客 cookie 标识去重，会话按本地 sessionKey 去重，均非人数；缺失标识时相应指标不可用。仅覆盖实际已保存的最近最多 90 天记录，不是全站历史累计。";
export const ANALYTICS_DURATION_POLICY = "不可用：本地仅记录页面加载，无可靠离站或活跃时长；未计算平均时长、跳出数或跳出率，不混用 Umami 分母。";

export type LocalTrafficStats = {
  pageviews: number;
  visitors: number | null;
  visits: number | null;
  unknownUaPageviews: number;
  hiddenCrawlerVisits: number;
};

export type TrafficBreakdownCount = { value: string; count: number };
export type TrafficBreakdown = {
  ruleVersion: string;
  recordedRawPageviews: number;
  explicitAutomationPageviews: number;
  remainingCandidatePageviews: number;
  missingUaPageviews: number;
  crawlers: Array<{
    brand: CrawlerBrand; pageviews: number; distinctPaths: number;
    firstVisitedAt: string; lastVisitedAt: string;
    maskedIpSamples: string[];
    countries: TrafficBreakdownCount[]; regions: TrafficBreakdownCount[]; cities: TrafficBreakdownCount[];
    languages: TrafficBreakdownCount[]; paths: TrafficBreakdownCount[];
  }>;
};

export type LocalTraffic = {
  trafficBreakdown?: TrafficBreakdown;
  trafficByPeriod: Record<AnalyticsPeriod, LocalTrafficStats>;
  dailyTraffic: Array<{ date: string; pageviews: number; visitors: number | null }>;
  topPaths: Array<{ path: string; count: number }>;
};

export function localTrafficQuery(ranges: Record<AnalyticsPeriod, number>, now: Date, timezone: string, selectedPeriod: AnalyticsPeriod) {
  const historyStart = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86_400_000);
  const selectedStart = new Date(Math.max(ranges[selectedPeriod], historyStart.getTime()));
  // Only shared, parameter-bound definitions; PostgreSQL C collation matches ASCII JS /i rules.
  const brandCase = Prisma.sql`CASE ${Prisma.join(CRAWLER_BRAND_DEFINITIONS.map(({ brand, pattern }) =>
    Prisma.sql`WHEN COALESCE("userAgent", '') COLLATE "C" ~* ${pattern} THEN ${brand}`), " ")} ELSE NULL END`;
  return Prisma.sql`
    WITH retained AS MATERIALIZED (
      SELECT "createdAt", path, "visitorHash", "sessionKey", "ipMasked", country, region, city, locale,
        ${brandCase} AS brand,
        COALESCE("userAgent", '') COLLATE "C" ~* ${CRAWLER_PATTERN} AS crawler,
        COALESCE("userAgent", '') ~ ${UNKNOWN_UA_PATTERN} AS unknown_ua
      FROM "AnalyticsPageView" WHERE "createdAt" >= ${historyStart} AND "createdAt" < ${now}
    ), visible AS MATERIALIZED (
      SELECT * FROM retained WHERE NOT crawler
    ), periods(period, start_at) AS (
      VALUES ('today', ${new Date(ranges.today)}::timestamp), ('7d', ${new Date(ranges["7d"])}::timestamp),
        ('30d', ${new Date(ranges["30d"])}::timestamp), ('all', ${historyStart}::timestamp)
    ), summaries AS (
      SELECT period, jsonb_build_object(
        'pageviews', COUNT(v."createdAt"),
        'visitors', CASE WHEN COUNT(*) FILTER (WHERE v."createdAt" IS NOT NULL AND NULLIF(v."visitorHash", '') IS NULL) > 0
          THEN NULL ELSE COUNT(DISTINCT NULLIF(v."visitorHash", '')) END,
        'visits', CASE WHEN COUNT(*) FILTER (WHERE v."createdAt" IS NOT NULL AND NULLIF(v."sessionKey", '') IS NULL) > 0
          THEN NULL ELSE COUNT(DISTINCT NULLIF(v."sessionKey", '')) END,
        'unknownUaPageviews', COUNT(*) FILTER (WHERE v.unknown_ua),
        'hiddenCrawlerVisits', (SELECT COUNT(*) FROM retained r WHERE r.crawler AND r."createdAt" >= p.start_at)
      ) AS stats
      FROM periods p LEFT JOIN visible v ON v."createdAt" >= p.start_at GROUP BY p.period, p.start_at
    ), daily AS (
      SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS date,
        COUNT(*) AS pageviews,
        CASE WHEN COUNT(*) FILTER (WHERE NULLIF("visitorHash", '') IS NULL) > 0
          THEN NULL ELSE COUNT(DISTINCT NULLIF("visitorHash", '')) END AS visitors
      FROM visible WHERE "createdAt" >= ${selectedStart} GROUP BY date
    ), paths AS (
      SELECT path, COUNT(*) AS count FROM visible
      WHERE "createdAt" >= ${selectedStart}
      GROUP BY path ORDER BY count DESC, path ASC LIMIT 20
    ), selected AS MATERIALIZED (
      SELECT * FROM retained WHERE "createdAt" >= ${selectedStart}
    ), crawler_rows AS MATERIALIZED (
      SELECT * FROM selected WHERE crawler
    ), crawler_totals AS (
      SELECT brand, COUNT(*) AS pageviews, COUNT(DISTINCT path) AS distinct_paths,
        MIN("createdAt") AS first_at, MAX("createdAt") AS last_at
      FROM crawler_rows GROUP BY brand
    ), dimension_counts AS (
      SELECT brand, dimension, value, COUNT(*) AS count
      FROM crawler_rows CROSS JOIN LATERAL (VALUES
        ('countries', COALESCE(NULLIF(country, ''), 'UNKNOWN')),
        ('regions', COALESCE(NULLIF(country, ''), 'UNKNOWN') || ' / ' || COALESCE(NULLIF(region, ''), 'UNKNOWN')),
        ('cities', COALESCE(NULLIF(country, ''), 'UNKNOWN') || ' / ' || COALESCE(NULLIF(region, ''), 'UNKNOWN') || ' / ' || COALESCE(NULLIF(city, ''), 'UNKNOWN')),
        ('languages', COALESCE(NULLIF(locale, ''), 'UNKNOWN')),
        ('paths', path),
        -- Accept only the stored mask format; never select or return ipAddress.
        ('ips', CASE WHEN "ipMasked" COLLATE "C" ~ '^[0-9]{1,3}([.][0-9]{1,3}){2}[.]xxx$'
          OR "ipMasked" COLLATE "C" ~ '^[0-9a-fA-F:]*::[*]{4}$' THEN "ipMasked" ELSE 'UNKNOWN' END)
      ) AS dimensions(dimension, value)
      GROUP BY brand, dimension, value
    ), ranked_dimensions AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY brand, dimension ORDER BY count DESC, value COLLATE "C") AS rank
      FROM dimension_counts
    ), dimension_lists AS (
      SELECT brand, dimension,
        jsonb_agg(jsonb_build_object('value', value, 'count', count) ORDER BY count DESC, value COLLATE "C") AS items,
        jsonb_agg(value ORDER BY count DESC, value COLLATE "C") AS samples
      FROM ranked_dimensions WHERE rank <= CASE WHEN dimension = 'ips' THEN 3 WHEN dimension = 'paths' THEN 10 ELSE 8 END
      GROUP BY brand, dimension
    ), crawler_details AS (
      SELECT t.brand, jsonb_build_object(
        'brand', t.brand, 'pageviews', t.pageviews, 'distinctPaths', t.distinct_paths,
        'firstVisitedAt', to_char(t.first_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'lastVisitedAt', to_char(t.last_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'maskedIpSamples', (SELECT samples FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'ips'),
        'countries', (SELECT items FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'countries'),
        'regions', (SELECT items FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'regions'),
        'cities', (SELECT items FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'cities'),
        'languages', (SELECT items FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'languages'),
        'paths', (SELECT items FROM dimension_lists d WHERE d.brand = t.brand AND dimension = 'paths')
      ) AS details FROM crawler_totals t
    )
    SELECT (SELECT jsonb_object_agg(period, stats) FROM summaries) AS "trafficByPeriod",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'pageviews', pageviews, 'visitors', visitors) ORDER BY date) FROM daily), '[]'::jsonb) AS "dailyTraffic",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('path', path, 'count', count) ORDER BY count DESC, path ASC) FROM paths), '[]'::jsonb) AS "topPaths",
      (SELECT jsonb_build_object(
        'ruleVersion', ${ANALYTICS_BOT_RULE_VERSION},
        'recordedRawPageviews', COUNT(*),
        'explicitAutomationPageviews', COUNT(*) FILTER (WHERE crawler),
        'remainingCandidatePageviews', COUNT(*) FILTER (WHERE NOT crawler),
        'missingUaPageviews', COUNT(*) FILTER (WHERE unknown_ua),
        'crawlers', COALESCE((SELECT jsonb_agg(details ORDER BY brand COLLATE "C") FROM crawler_details), '[]'::jsonb)
      ) FROM selected) AS "trafficBreakdown"
  `;
}

export async function fetchLocalTraffic(ranges: Record<AnalyticsPeriod, number>, now: Date, timezone: string, selectedPeriod: AnalyticsPeriod): Promise<LocalTraffic> {
  const [result] = await db.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, timezone, selectedPeriod));
  if (!result) throw new Error("LOCAL_TRAFFIC_AGGREGATE_MISSING");
  return result;
}
