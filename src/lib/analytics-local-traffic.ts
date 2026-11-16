import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CRAWLER_PATTERN, UNKNOWN_UA_PATTERN } from "./analytics-bot";
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

export type LocalTraffic = {
  trafficByPeriod: Record<AnalyticsPeriod, LocalTrafficStats>;
  dailyTraffic: Array<{ date: string; pageviews: number; visitors: number | null }>;
  topPaths: Array<{ path: string; count: number }>;
};

export function localTrafficQuery(ranges: Record<AnalyticsPeriod, number>, now: Date, timezone: string, selectedPeriod: AnalyticsPeriod) {
  const historyStart = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86_400_000);
  const selectedStart = new Date(Math.max(ranges[selectedPeriod], historyStart.getTime()));
  return Prisma.sql`
    WITH retained AS MATERIALIZED (
      SELECT "createdAt", path, "visitorHash", "sessionKey",
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
    )
    SELECT (SELECT jsonb_object_agg(period, stats) FROM summaries) AS "trafficByPeriod",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'pageviews', pageviews, 'visitors', visitors) ORDER BY date) FROM daily), '[]'::jsonb) AS "dailyTraffic",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('path', path, 'count', count) ORDER BY count DESC, path ASC) FROM paths), '[]'::jsonb) AS "topPaths"
  `;
}

export async function fetchLocalTraffic(ranges: Record<AnalyticsPeriod, number>, now: Date, timezone: string, selectedPeriod: AnalyticsPeriod): Promise<LocalTraffic> {
  const [result] = await db.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, timezone, selectedPeriod));
  if (!result) throw new Error("LOCAL_TRAFFIC_AGGREGATE_MISSING");
  return result;
}
