vi.mock("server-only",()=>({}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn(), dashboard:vi.fn(), fields:vi.fn(), realtime:vi.fn(), config:vi.fn(), explore:vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("@/lib/ga4-service", () => ({ getGa4Overview: mocks.overview }));
vi.mock("@/lib/ga4-reporting",async importOriginal => ({...await importOriginal<typeof import("@/lib/ga4-reporting")>(),getDashboard:mocks.dashboard,getFieldMetadata:mocks.fields,realtime:mocks.realtime,configuration:mocks.config,explore:mocks.explore}));
import Page from "./page";
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.overview.mockResolvedValue({ available: false, reason: "not_configured" }); mocks.dashboard.mockResolvedValue([]);mocks.fields.mockResolvedValue({dimensions:[],metrics:[]});mocks.realtime.mockRejectedValue(new Error("offline"));mocks.config.mockResolvedValue({}); });
it("waits for authorization before querying GA4", async () => {
 let resolve!: () => void;
 mocks.auth.mockReturnValue(new Promise<void>(r => { resolve = r; }));
 const page = Page({}); await Promise.resolve();
 expect(mocks.overview).not.toHaveBeenCalled(); resolve(); await page;
 expect(mocks.dashboard).toHaveBeenCalledTimes(1);
});
it("rejects unauthorized users without querying GA4", async () => {
 mocks.auth.mockRejectedValue(new Error("unauthorized"));
 await expect(Page({})).rejects.toThrow("unauthorized"); expect(mocks.overview).not.toHaveBeenCalled();
});
it("renders comprehensive reporting shell, metadata explorer and separate realtime failure",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers"],rows:[["0"]],rowCount:1,metadata:{subjectToThresholding:true},quota:{tokensPerHour:{remaining:42}}}},{id:"geo",title:"国家 / 地区与城市",error:"此分区读取失败，未显示为零"}]);
 mocks.fields.mockResolvedValue({dimensions:[{apiName:"customEvent:project",description:"已注册自定义维度"}],metrics:[{apiName:"sessions",description:"会话"}]});
 const html=renderToStaticMarkup(await Page({}));
 for(const text of ["核心概览","元数据探索器","customEvent:project","国家 / 地区与城市","实时","Umami","subjectToThresholding","remaining","CSV"])expect(html).toContain(text);
 expect(html).not.toContain("private_key");
});
it("denies all expanded requests before authorization completes",async()=>{
 mocks.auth.mockRejectedValue(new Error("unauthorized"));await expect(Page({})).rejects.toThrow();
 for(const fn of [mocks.dashboard,mocks.fields,mocks.realtime,mocks.config])expect(fn).not.toHaveBeenCalled();
});
