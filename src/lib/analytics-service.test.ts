import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: {} }));

let analyticsRanges: typeof import("@/lib/analytics-service").analyticsRanges;
let resolveVisitorDateRange: typeof import("@/lib/analytics-service").resolveVisitorDateRange;
let startOfZonedDay: typeof import("@/lib/analytics-service").startOfZonedDay;

beforeAll(async () => {
  ({ analyticsRanges, resolveVisitorDateRange, startOfZonedDay } = await import("@/lib/analytics-service"));
});

describe("analytics date ranges", () => {
  it("uses the configured site timezone for today's boundary", () => {
    expect(new Date(startOfZonedDay(new Date("2026-09-14T07:30:00.000Z"), "Asia/Shanghai")).toISOString()).toBe("2026-09-13T16:00:00.000Z");
  });

  it("builds inclusive 7-day and 30-day ranges from today's boundary", () => {
    const ranges = analyticsRanges(new Date("2026-09-14T07:30:00.000Z"), "Asia/Shanghai");
    expect(ranges["7d"]).toBe(ranges.today - 6 * 86_400_000);
    expect(ranges["30d"]).toBe(ranges.today - 29 * 86_400_000);
    expect(ranges.all).toBe(0);
  });

  it("uses inclusive selectable calendar dates in the site timezone", () => {
    const range = resolveVisitorDateRange(
      { startDate: "2026-09-20", endDate: "2026-09-22" },
      new Date("2026-09-28T12:00:00.000Z"),
      "Asia/Shanghai",
    );
    expect(range.start.toISOString()).toBe("2026-09-19T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-22T16:00:00.000Z");
  });
});
