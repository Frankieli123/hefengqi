import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/gsc-reporting", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/gsc-reporting")>(), searchAnalyticsQuery: mocks.query }));
import Page from "./page";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-23T02:00:00Z")); vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.query.mockImplementation(async ({ dimensions }: { dimensions: string[] }) => [{ keys: dimensions.length ? [dimensions[0] === "date" ? "2026-11-01" : dimensions[0] === "page" ? "https://ricewind.com/en" : "telecom power" ] : [], clicks: 12, impressions: 100, ctr: 0.12, position: 3.5 }]); });
afterEach(() => vi.useRealTimers());
it("renders independent Chinese reports with California default range and lag disclosures", async () => {
 const html = renderToStaticMarkup(await Page({}));
 for (const text of ["搜索表现", "点击", "曝光", "12.0%", "3.5", "按日趋势", "Top pages", "Top queries", "telecom power", "2026-10-23", "2026-11-19", "2-3 天", "加州时区", "不可直接相加"]) expect(html).toContain(text);
 expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({ startDate: "2026-10-23", endDate: "2026-11-19", dimensions: [] }));
});
it("shows empty data rather than fabricated zero metrics", async () => { mocks.query.mockResolvedValue([]); const html = renderToStaticMarkup(await Page({})); expect(html).toContain("暂无搜索数据"); expect(html).toContain("—"); expect(html).not.toContain("0.0%"); });
it("isolates failed sections and hides provider errors", async () => { mocks.query.mockImplementation(async ({ dimensions }: { dimensions: string[] }) => { if (dimensions[0] === "query") throw new Error("private_key sensitive"); return []; }); const html = renderToStaticMarkup(await Page({})); expect(html).toContain("读取失败"); expect(html).not.toContain("sensitive"); expect(html).toContain("暂无搜索数据"); });
it("denies unauthorized access before every Google request", async () => { mocks.auth.mockRejectedValue(new Error("unauthorized")); await expect(Page({})).rejects.toThrow("unauthorized"); expect(mocks.query).not.toHaveBeenCalled(); });
it("rejects invalid dates without issuing Google requests", async () => { const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ start: "2026-02-30", end: "2026-11-01" }) })); expect(html).toContain("日期范围无效"); expect(mocks.query).not.toHaveBeenCalled(); });
it("paginates each table independently while preserving dates and other offsets", async () => {
 mocks.query.mockImplementation(async ({ dimensions }: { dimensions: string[] }) => Array.from({ length: dimensions.length ? 51 : 1 }, (_, i) => ({ keys: dimensions.length ? [String(i)] : [], clicks: 1, impressions: 10, ctr: 0.1, position: 2 })));
 const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ start: "2026-11-01", end: "2026-11-19", pages: "50", queries: "100" }) }));
 expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({ dimensions: ["page"], startRow: 50, rowLimit: 51 }));
 expect(html).toContain("上一页"); expect(html).toContain("下一页"); expect(html).toContain("pages=100&amp;queries=100"); expect(html).toContain("start=2026-11-01&amp;end=2026-11-19");
 expect(html.match(/<tbody>/g)).toHaveLength(3); expect(html.match(/<tr>/g)).toHaveLength(154);
});

it("shows successful real zeros with a no-impressions explanation, not an error", async () => {
 mocks.query.mockResolvedValue([{ keys: [], clicks: 0, impressions: 0, ctr: 0, position: 0 }]);
 const html = renderToStaticMarkup(await Page({}));
 expect(html).toContain("该时间段暂无搜索曝光/点击"); expect(html).toContain("0.0%"); expect(html).not.toContain("读取失败");
});
