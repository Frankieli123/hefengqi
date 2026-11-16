// Explicit opt-in. Temporary table shadows the real table only inside one rolled-back transaction.
import { describe, it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: { UMAMI_TIMEZONE: "Asia/Shanghai" } }));
import { visitorPageQuery } from "./analytics-visitors";

const enabled = process.env.ANALYTICS_DB_TEST === "1";
describe.skipIf(!enabled)("visitor aggregate SQL (temporary PostgreSQL fixtures)", () => {
  it("paginates complete groups with stable ties, filtered counts, clamping and half-open dates", async () => {
    const db = new PrismaClient();
    const rollback = new Error("ROLLBACK_FIXTURE");
    try {
      await expect(db.$transaction(async tx => {
        await tx.$executeRawUnsafe(`CREATE TEMP TABLE "AnalyticsPageView" (
          id text, "ipHash" text, "ipAddress" text, "ipMasked" text, "userAgent" text,
          country text, region text, city text, "umamiSessionId" text, path text, locale text, referrer text, "createdAt" timestamp
        ) ON COMMIT DROP`);
        await tx.$executeRaw`INSERT INTO "AnalyticsPageView" (id, "ipHash", "ipMasked", path, "createdAt")
          SELECT 'id-' || n, 'hash-' || lpad(n::text, 3, '0'), 'masked', '/first', '2026-10-30 04:00:00'::timestamp FROM generate_series(1, 53) n`;
        await tx.$executeRaw`INSERT INTO "AnalyticsPageView" (id, "ipHash", "ipMasked", path, "createdAt", "userAgent", country, region, city)
          VALUES ('repeat', 'hash-001', 'masked', '/second', '2026-10-30 03:00:00', 'Mozilla/5.0', 'CN', 'Shanghai', 'Shanghai'),
            ('bot', 'bot-only', 'masked', '/bot', '2026-10-30 05:00:00', 'GoogleBot', NULL, NULL, NULL),
            ('bot-same', 'hash-001', 'masked', '/bot', '2026-10-30 05:00:00', 'HEADLESS', NULL, NULL, NULL),
            ('before', 'before', 'masked', '/before', '2026-10-29 23:59:59.999', NULL, NULL, NULL, NULL),
            ('at-end', 'at-end', 'masked', '/end', '2026-10-31 00:00:00', NULL, NULL, NULL, NULL)`;
        const start = new Date('2026-10-30T00:00:00Z'), end = new Date('2026-10-31T00:00:00Z');
        type Result = { totalCount: bigint; totalVisits: bigint; hiddenCrawlerVisits: bigint; unknownUaVisits: bigint; page: number; visitors: Array<{ id: string; visitCount: number; geoStatus: string; firstVisitedAt: string; pages: Array<{path: string; count: number}> }> };
        const [first] = await tx.$queryRaw<Result[]>(visitorPageQuery(start, end, 1));
        expect(first).toMatchObject({totalCount: 53n, totalVisits: 54n, hiddenCrawlerVisits: 2n, unknownUaVisits: 53n, page: 1});
        expect(first.visitors).toHaveLength(50);
        expect(first.visitors[0]).toMatchObject({id: 'id-1', visitCount: 2, geoStatus: 'edgeone', pages: [{path:'/first',count:1},{path:'/second',count:1}]});
        expect(first.visitors[1].geoStatus).toBe('unavailable');
        expect(first.visitors[0].firstVisitedAt).toMatch(/(?:Z|\+00:00)$/);
        const [last] = await tx.$queryRaw<Result[]>(visitorPageQuery(start, end, 999));
        expect(last.page).toBe(2);
        expect(last.visitors.map(v=>v.id)).toEqual(['id-51','id-52','id-53']);
        const [empty] = await tx.$queryRaw<Result[]>(visitorPageQuery(end, end, 9));
        expect(empty).toMatchObject({totalCount:0n,totalVisits:0n,hiddenCrawlerVisits:0n,unknownUaVisits:0n,page:1,visitors:[]});
        throw rollback;
      }, {timeout: 15000})).rejects.toBe(rollback);
    } finally { await db.$disconnect(); }
  });
});
