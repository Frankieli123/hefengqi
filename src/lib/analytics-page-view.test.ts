import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), deleteMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { analyticsPageView: { create: mocks.create, deleteMany: mocks.deleteMany } } }));
vi.mock("@/lib/inquiries", () => ({ hashIp: (value: string) => `hash:${value}` }));

import { recordAnalyticsPageView } from "@/lib/analytics-page-view";

describe("recordAnalyticsPageView", () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({});
    mocks.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it("stores one complete visit with its full IP and EdgeOne geography", async () => {
    await recordAnalyticsPageView({
      visitorId: "visitor-1",
      sessionId: "session-1",
      umamiSessionId: "40b3da99-bfb0-5465-9957-60e9d1212277",
      ip: "198.51.100.24",
      path: "/zh/products/example",
      locale: "zh",
      referrer: "google.com",
      country: "CN",
      region: "Zhejiang",
      city: "Hangzhou",
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "198.51.100.24",
        umamiSessionId: "40b3da99-bfb0-5465-9957-60e9d1212277",
        ipMasked: "198.51.100.xxx",
        country: "CN",
        region: "Zhejiang",
        city: "Hangzhou",
        path: "/zh/products/example",
      }),
    });
  });
});
