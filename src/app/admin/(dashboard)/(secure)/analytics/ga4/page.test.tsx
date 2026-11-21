import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("@/lib/ga4-service", () => ({ getGa4Overview: mocks.overview }));
import Page from "./page";
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.overview.mockResolvedValue({ available: false, reason: "not_configured" }); });
it("waits for authorization before querying GA4", async () => {
 let resolve!: () => void;
 mocks.auth.mockReturnValue(new Promise<void>(r => { resolve = r; }));
 const page = Page(); await Promise.resolve();
 expect(mocks.overview).not.toHaveBeenCalled(); resolve(); await page;
 expect(mocks.overview).toHaveBeenCalledTimes(1);
});
it("rejects unauthorized users without querying GA4", async () => {
 mocks.auth.mockRejectedValue(new Error("unauthorized"));
 await expect(Page()).rejects.toThrow("unauthorized"); expect(mocks.overview).not.toHaveBeenCalled();
});
it.each(["not_configured", "invalid_config", "permission_denied", "unavailable"])("shows honest %s without zero KPI or fixture data", async (reason) => {
 mocks.overview.mockResolvedValue({ available: false, reason });
 const html = renderToStaticMarkup(await Page());
 expect(html).toContain("GA4"); expect(html).toContain("不可用"); expect(html).toContain("Umami");
 expect(html).not.toContain('data-ga4-kpi'); expect(html).not.toContain("API 未启用");
});
it("reuses cards and tables for actual metrics with optional unavailable sections", async () => {
 mocks.overview.mockResolvedValue({ available: true, metrics: { users: 0, sessions: 2, pageviews: 5 }, pages: [{ label: "/en/products", value: 5 }], sources: [], countries: null, timezone: "Asia/Shanghai" });
 const html = renderToStaticMarkup(await Page());
 for (const text of ["总用户数", "会话数", "浏览量", "主要页面", "来源 / 媒介", "国家 / 地区", "/en/products", "Asia/Shanghai", "暂无数据", "此维度暂不可用", "28 天", "G-1GLJE63BSE"]) expect(html).toContain(text);
 expect(html).toContain('data-slot="card"'); expect(html).toContain('data-slot="table"');
});
