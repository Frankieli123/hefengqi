import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import { classifyAnalyticsUserAgent, CRAWLER_PATTERN, isExplicitAnalyticsBot, UNKNOWN_UA_PATTERN } from "./analytics-bot";
import { localTrafficQuery, type LocalTraffic } from "./analytics-local-traffic";

const enabled = process.env.ANALYTICS_DB_TEST === "1";
describe.skipIf(!enabled)("local traffic SQL in an explicitly approved isolated PostgreSQL fixture", () => {
  it("matches JS UA semantics and counts filtered retained PV, cookie UV, sessions, dates and paths", async () => {
    const db = new PrismaClient();
    const rollback = new Error("ROLLBACK_FIXTURE");
    try {
      await expect(db.$transaction(async transaction => {
        const userAgents = [null, "", " \t\r\n", "Mozilla/5.0 Chrome/103.0", "Mozilla/5.0 Chrome/151.0", "curl/8.0", "unidentified", "GoogleBOT", "HEADLESSChrome", "ChatGPT-User", "anthropic-ai", "LinkPreview", "Perplexity", "CensysInspect", "Yahoo! Slurp", "HubSpot Crawler", "Sogou web spider", "AMZN-Search", "Google-İnspectionTool/1.0", "ſpider/1.0"];
        for (const userAgent of userAgents) {
          const [result] = await transaction.$queryRaw<Array<{ automation: boolean; unknown: boolean }>>
            `SELECT COALESCE(${userAgent}::text, '') COLLATE "C" ~* ${CRAWLER_PATTERN} AS automation,
              COALESCE(${userAgent}::text, '') ~ ${UNKNOWN_UA_PATTERN} AS unknown`;
          expect(result.automation).toBe(isExplicitAnalyticsBot(userAgent));
          expect(result.unknown).toBe(classifyAnalyticsUserAgent(userAgent) === "unknown");
        }
        await transaction.$executeRawUnsafe(`CREATE TEMP TABLE "AnalyticsPageView" (
          "createdAt" timestamp, path text, country text, region text, city text, locale text, "visitorHash" text, "sessionKey" text, "ipMasked" text, "userAgent" text
        ) ON COMMIT DROP`);
        await transaction.$executeRaw`INSERT INTO "AnalyticsPageView" ("createdAt", path, "visitorHash", "sessionKey", "userAgent") VALUES
          ('2026-08-04 11:59:59.999', '/before', 'before', 'before', 'GoogleBot'),
          ('2026-08-04 12:00:00', '/en', 'old', 'old-session', 'Mozilla/5.0'),
          ('2026-10-10 04:00:00', '/fr', 'v1', 's1', 'Mozilla/5.0'),
          ('2026-10-28 04:00:00', '/en', 'v1', 's2', 'Mozilla/5.0'),
          ('2026-10-28 05:00:00', '/en', 'v1', 's2', 'Mozilla/5.0'),
          ('2026-11-02 04:00:00', '/en', 'v1', 's3', 'Mozilla/5.0 Chrome/103.0'),
          ('2026-11-02 05:00:00', '/ru', 'v2', 's4', NULL),
          ('2026-11-02 06:00:00', '/ru', 'v2', 's4', ''),
          ('2026-11-02 07:00:00', '/ar', 'v3', 's5', ' '),
          ('2026-11-02 08:00:00', '/bot', 'v1', 's3', 'GoogleBot'),
          ('2026-11-02 09:00:00', '/bot', 'bot', 'bot-session', 'HeadlessChrome'),
          ('2026-11-02 12:00:00', '/end', 'end', 'end-session', NULL)`;
        const now = new Date("2026-11-02T12:00:00Z");
        const ranges = { today: Date.parse("2026-11-02T00:00:00Z"), "7d": Date.parse("2026-10-27T00:00:00Z"), "30d": Date.parse("2026-10-04T00:00:00Z"), all: 0 };
        const [all] = await transaction.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, "UTC", "all"));
        expect(all.trafficByPeriod).toEqual({
          today: { pageviews: 4, visitors: 3, visits: 3, unknownUaPageviews: 3, hiddenCrawlerVisits: 2 },
          "7d": { pageviews: 6, visitors: 3, visits: 4, unknownUaPageviews: 3, hiddenCrawlerVisits: 2 },
          "30d": { pageviews: 7, visitors: 3, visits: 5, unknownUaPageviews: 3, hiddenCrawlerVisits: 2 },
          all: { pageviews: 8, visitors: 4, visits: 6, unknownUaPageviews: 3, hiddenCrawlerVisits: 2 },
        });
        expect(all.dailyTraffic).toEqual([{ date: "2026-08-04", pageviews: 1, visitors: 1 }, { date: "2026-10-10", pageviews: 1, visitors: 1 }, { date: "2026-10-28", pageviews: 2, visitors: 1 }, { date: "2026-11-02", pageviews: 4, visitors: 3 }]);
        expect(all.topPaths).toEqual([{ path: "/en", count: 4 }, { path: "/ru", count: 2 }, { path: "/ar", count: 1 }, { path: "/fr", count: 1 }]);
        for (const period of ["today", "7d", "30d", "all"] as const) {
          const [result] = await transaction.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, "UTC", period));
          expect(result.topPaths.reduce((sum, row) => sum + row.count, 0)).toBe(result.trafficByPeriod[period].pageviews);
          expect(result.topPaths.some(row => row.path === "/bot")).toBe(false);
          expect(result.dailyTraffic.reduce((sum, row) => sum + row.pageviews, 0)).toBe(result.trafficByPeriod[period].pageviews);
        }
        const [zoned] = await transaction.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, "America/New_York", "today"));
        expect(zoned.dailyTraffic.find(day => day.date === "2026-11-01")).toEqual({ date: "2026-11-01", pageviews: 1, visitors: 1 });
        await transaction.$executeRaw`INSERT INTO "AnalyticsPageView" VALUES ('2026-11-02 10:00:00', '/missing-id', NULL, NULL, NULL)`;
        const [missing] = await transaction.$queryRaw<LocalTraffic[]>(localTrafficQuery(ranges, now, "UTC", "today"));
        expect(missing.trafficByPeriod.today).toMatchObject({ pageviews: 5, visitors: null, visits: null, unknownUaPageviews: 4 });
        expect(missing.dailyTraffic.at(-1)?.visitors).toBeNull();
        throw rollback;
      }, { timeout: 15000 })).rejects.toBe(rollback);
    } finally { await db.$disconnect(); }
  });
});
