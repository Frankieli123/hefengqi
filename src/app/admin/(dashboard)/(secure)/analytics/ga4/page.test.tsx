vi.mock("server-only",()=>({}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn(), dashboard:vi.fn(), fields:vi.fn(), realtime:vi.fn(), config:vi.fn(), explore:vi.fn(), today:vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("@/lib/ga4-service", () => ({ getGa4Overview: mocks.overview }));
vi.mock("@/lib/ga4-reporting",async importOriginal => ({...await importOriginal<typeof import("@/lib/ga4-reporting")>(),getDashboard:mocks.dashboard,getFieldMetadata:mocks.fields,realtime:mocks.realtime,configuration:mocks.config,explore:mocks.explore,getTodayReport:mocks.today}));
import Page from "./page";
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.overview.mockResolvedValue({ available: false, reason: "not_configured" }); mocks.dashboard.mockResolvedValue([]);mocks.fields.mockResolvedValue({dimensions:[],metrics:[]});mocks.realtime.mockRejectedValue(new Error("offline"));mocks.config.mockResolvedValue({});mocks.today.mockResolvedValue({date:"2026-11-22",timezone:"Asia/Shanghai",source:"historical_today",report:{headers:["totalUsers","sessions","screenPageViews","keyEvents"],rows:[["125","126","115","0"]],rowCount:1,fetchedAt:"2026-11-22T11:00:00Z"}}); });
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
it("uses the Chinese-first dashboard hierarchy and explicit freshness state",async()=>{
 const html=renderToStaticMarkup(await Page({}));
 for(const text of ["今日概览","历史趋势","来源与内容","事件与转化","高级探索","系统状态","数据新鲜度","Asia/Shanghai"] )expect(html).toContain(text);
});

it("renders comprehensive reporting shell, metadata explorer and separate realtime failure",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers"],rows:[["0"]],rowCount:1,metadata:{subjectToThresholding:true},quota:{tokensPerHour:{remaining:42}}}},{id:"geo",title:"国家 / 地区与城市",error:"此分区读取失败，未显示为零"}]);
 mocks.fields.mockResolvedValue({dimensions:[{apiName:"customEvent:project",description:"已注册自定义维度"}],metrics:[{apiName:"sessions",description:"会话"}]});
 const html=renderToStaticMarkup(await Page({}));
 for(const text of ["今天，到目前为止","实时信号","subjectToThresholding","remaining"] )expect(html).toContain(text);
 const explorer=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"explore"})}));
 for(const text of ["完整元数据探索器","customEvent:project","检查兼容性并查询"])expect(explorer).toContain(text);
 expect(html).not.toContain("private_key");
});
it("denies all expanded requests before authorization completes",async()=>{
 mocks.auth.mockRejectedValue(new Error("unauthorized"));await expect(Page({})).rejects.toThrow();
 for(const fn of [mocks.dashboard,mocks.fields,mocks.realtime,mocks.config])expect(fn).not.toHaveBeenCalled();
});

it("keeps today visible without selection and gives correct date preset links",async()=>{
 const html=renderToStaticMarkup(await Page({}));
 expect(html).toContain("125");expect(html).toContain("历史 Data API");
 expect(html).toContain("start=2026-11-22&amp;end=2026-11-22");
 expect(html).toContain("start=2026-11-21&amp;end=2026-11-21");
 expect(html).toContain("start=2026-11-16&amp;end=2026-11-22");
 expect(html).not.toContain("customEvent:project");
});
it("executes explorer and keeps pagination and CSV tied to the chosen fields",async()=>{
 mocks.explore.mockResolvedValue({headers:["country","sessions"],rows:[["Synthetic test country","9"]],rowCount:250});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({explore:"1",dimensions:"country",metrics:"sessions",offset:"100"})}));
 expect(mocks.explore).toHaveBeenCalledWith(expect.objectContaining({offset:100}),["country"],["sessions"]);
 expect(html).toContain("Synthetic test country");expect(html).toContain("上一页");expect(html).toContain("下一页");expect(html).toContain("CSV 导出当前页");
});

it("renders an accessible daily trend without inventing absent days",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers","sessions"],rows:[["20261120","3","4"],["20261121","5","6"]],rowCount:2}}]);
 const html=renderToStaticMarkup(await Page({}));expect(html).toContain('aria-label="每日用户趋势"');expect(html).toContain("20261120");
});

it("discloses truncated trend coverage and links to the exact paginated daily explorer",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers"],rows:[["20260101","3"]],rowCount:250}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"trend",start:"2026-01-01",end:"2026-11-01"})}));
 expect(html).toContain("非完整区间趋势");expect(html).toContain("总计 250");
 expect(html).toContain("dimensions=date");expect(html).toContain("offset=100");expect(html).toContain("start=2026-01-01");
});
it("can render an explicitly synthetic visual fixture",async()=>{
 if(!process.env.GA4_PREVIEW_PATH)return;
 const fs=await import("node:fs/promises");const styles=await import("./page.module.css");
 const css=await fs.readFile("src/app/admin/(dashboard)/(secure)/analytics/ga4/page.module.css","utf8");
 const scoped=css.replace(/\.([a-zA-Z][a-zA-Z0-9]*)/g,(match,name)=>styles.default[name]?`.${styles.default[name]}`:match);
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers","sessions","screenPageViews","keyEvents"],rows:[["628","740","1290","8"]],rowCount:1,fetchedAt:"SYNTHETIC FIXTURE"}},{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers"],rows:[["20261116","12"],["20261117","20"],["20261118","18"],["20261119","34"],["20261120","28"],["20261121","46"]],rowCount:6}}]);
 const html=renderToStaticMarkup(await Page({}));
 await fs.writeFile(process.env.GA4_PREVIEW_PATH,`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}a{color:#087f73}*{box-sizing:border-box}${scoped}</style><p style="padding:12px;background:#fff2cb">SYNTHETIC FIXTURE · DESIGN PREVIEW ONLY · 非真实业务页面</p>${html}</html>`);
});
