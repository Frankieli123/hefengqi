import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: {} }));

let analyticsRanges: typeof import("@/lib/analytics-service").analyticsRanges;
let startOfZonedDay: typeof import("@/lib/analytics-service").startOfZonedDay;

beforeAll(async () => {
  ({ analyticsRanges, startOfZonedDay } = await import("@/lib/analytics-service"));
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
});
