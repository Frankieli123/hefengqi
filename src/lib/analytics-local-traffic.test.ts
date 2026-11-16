import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: query } }));
import { ANALYTICS_BOT_RULE_VERSION, CRAWLER_BRAND_DEFINITIONS, CRAWLER_PATTERN, UNKNOWN_UA_PATTERN } from "./analytics-bot";
import { fetchLocalTraffic, localTrafficQuery } from "./analytics-local-traffic";

const now = new Date("2026-11-02T10:00:00Z");
const ranges = { today: Date.parse("2026-11-02T00:00:00Z"), "7d": Date.parse("2026-10-27T00:00:00Z"), "30d": Date.parse("2026-10-04T00:00:00Z"), all: 0 };
beforeEach(() => { query.mockReset(); });

describe("local filtered traffic SQL", () => {
  it.each(["today", "7d", "30d", "all"] as const)("uses one read-only filtered snapshot for %s", period => {
    const sql = localTrafficQuery(ranges, now, "UTC", period);
    expect(sql.values.slice(0, CRAWLER_BRAND_DEFINITIONS.length * 2)).toEqual(
      CRAWLER_BRAND_DEFINITIONS.flatMap(({ pattern, brand }) => [pattern, brand]));
    expect(sql.values).toContain(CRAWLER_PATTERN);
    expect(sql.values).toContain(UNKNOWN_UA_PATTERN);
    expect(sql.sql).toContain('COLLATE "C" ~* ?');
    expect(sql.sql).toContain('WHERE NOT crawler');
    expect(sql.sql).toContain('COUNT(DISTINCT NULLIF(v."visitorHash",');
    expect(sql.sql).toContain('COUNT(DISTINCT NULLIF(v."sessionKey",');
    expect(sql.sql).not.toContain('"ipHash"');
    expect(sql.sql).toContain('THEN NULL ELSE COUNT(DISTINCT');
    expect(sql.sql).toContain('FROM visible WHERE "createdAt" >=');
    expect(sql.sql).toContain('GROUP BY path ORDER BY count DESC, path ASC LIMIT 20');
    expect(sql.sql).not.toMatch(/INSERT|UPDATE|DELETE|TRUNCATE|DROP/);
    expect(sql.sql).not.toContain(CRAWLER_PATTERN);
    expect(sql.values.at(-1)).toBe(ANALYTICS_BOT_RULE_VERSION);
    expect(sql.values.at(-2)).toEqual(new Date(period === "all" ? "2026-08-04T10:00:00Z" : ranges[period]));
    expect(sql.values.at(-3)).toEqual(sql.values.at(-2));
    expect(sql.values).toContain("UTC");
  });
  it("binds ordered shared brand definitions and caps dimensions without raw IP or extra reads", () => {
    const sql = localTrafficQuery(ranges, now, "UTC", "all");
    expect(sql.values.slice(0, CRAWLER_BRAND_DEFINITIONS.length * 2)).toEqual(
      CRAWLER_BRAND_DEFINITIONS.flatMap(({ brand, pattern }) => [pattern, brand]));
    expect(sql.sql.match(/FROM "AnalyticsPageView"/g)).toHaveLength(1);
    expect(sql.sql.match(/COLLATE "C" ~\* \?/g)).toHaveLength(CRAWLER_BRAND_DEFINITIONS.length + 1);
    expect(sql.sql).toContain("ROW_NUMBER() OVER (PARTITION BY brand, dimension");
    expect(sql.sql).toContain("WHEN dimension = 'ips' THEN 3 WHEN dimension = 'paths' THEN 10 ELSE 8 END");
    expect(sql.sql).not.toContain('"ipAddress"');
    for (const field of ["recordedRawPageviews", "explicitAutomationPageviews", "remainingCandidatePageviews", "missingUaPageviews", "distinctPaths", "firstVisitedAt", "lastVisitedAt", "maskedIpSamples"]) expect(sql.sql).toContain(field);
    expect(sql.sql).toContain("COUNT(*) FILTER (WHERE NOT crawler)");
    expect(sql.sql).toContain("COUNT(*) FILTER (WHERE unknown_ua)");
  });
  it("returns the database aggregate without replacing unavailable identifiers with zero", async () => {
    const aggregate = { trafficByPeriod: { today: { pageviews: 2, visitors: null, visits: null } }, dailyTraffic: [], topPaths: [] };
    query.mockResolvedValue([aggregate]);
    expect(await fetchLocalTraffic(ranges, now, "UTC", "today")).toBe(aggregate);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("propagates missing results and database failure instead of plausible zero traffic", async () => {
    query.mockResolvedValue([]);
    await expect(fetchLocalTraffic(ranges, now, "UTC", "all")).rejects.toThrow("LOCAL_TRAFFIC_AGGREGATE_MISSING");
    query.mockRejectedValue(Error("database offline"));
    await expect(fetchLocalTraffic(ranges, now, "UTC", "7d")).rejects.toThrow("database offline");
  });
});
