import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: query } }));
import { CRAWLER_PATTERN, UNKNOWN_UA_PATTERN } from "./analytics-bot";
import { fetchLocalTraffic, localTrafficQuery } from "./analytics-local-traffic";

const now = new Date("2026-11-02T10:00:00Z");
const ranges = { today: Date.parse("2026-11-02T00:00:00Z"), "7d": Date.parse("2026-10-27T00:00:00Z"), "30d": Date.parse("2026-10-04T00:00:00Z"), all: 0 };
beforeEach(() => { query.mockReset(); });

describe("local filtered traffic SQL", () => {
  it.each(["today", "7d", "30d", "all"] as const)("uses one read-only filtered snapshot for %s", period => {
    const sql = localTrafficQuery(ranges, now, "UTC", period);
    expect(sql.values.slice(0, 4)).toEqual([CRAWLER_PATTERN, UNKNOWN_UA_PATTERN, new Date("2026-08-04T10:00:00Z"), now]);
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
    expect(sql.values.at(-1)).toEqual(new Date(period === "all" ? "2026-08-04T10:00:00Z" : ranges[period]));
    expect(sql.values.at(-2)).toEqual(sql.values.at(-1));
    expect(sql.values).toContain("UTC");
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
