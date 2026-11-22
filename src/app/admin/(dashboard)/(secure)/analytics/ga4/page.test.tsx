vi.mock("server-only",()=>({}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn(), dashboard:vi.fn(), section:vi.fn(), fields:vi.fn(), realtime:vi.fn(), config:vi.fn(), explore:vi.fn(), today:vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("@/lib/ga4-preview-auth",()=>({isGa4Preview:vi.fn(async()=>false)}));
vi.mock("@/lib/ga4-service", () => ({ getGa4Overview: mocks.overview }));
vi.mock("@/lib/ga4-reporting",async importOriginal => ({...await importOriginal<typeof import("@/lib/ga4-reporting")>(),getOverviewDashboard:mocks.dashboard,getDashboard:mocks.dashboard,getSectionReport:async(id:string)=>{mocks.section(id);const values=await mocks.dashboard.getMockImplementation()?.();return values.find((v:{id:string})=>v.id===id)??{id,title:id};},getFieldMetadata:mocks.fields,realtime:mocks.realtime,configuration:mocks.config,explore:mocks.explore,getTodayReport:mocks.today}));
import Page from "./page";
beforeEach(() => { vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.overview.mockResolvedValue({ available: false, reason: "not_configured" }); mocks.dashboard.mockResolvedValue([]);mocks.fields.mockResolvedValue({dimensions:[],metrics:[]});mocks.realtime.mockRejectedValue(new Error("offline"));mocks.config.mockResolvedValue({});mocks.today.mockResolvedValue({date:"2026-11-22",timezone:"Asia/Shanghai",source:"historical_today",report:{headers:["totalUsers","sessions","screenPageViews","keyEvents"],rows:[["125","126","115","0"]],rowCount:1,fetchedAt:"2026-11-22T11:00:00Z"}}); });
afterEach(()=>vi.useRealTimers());
it("waits for authorization before querying GA4", async () => {
 let resolve!: () => void;
 mocks.auth.mockReturnValue(new Promise<void>(r => { resolve = r; }));
 const page = Page({}); await Promise.resolve();
 expect(mocks.overview).not.toHaveBeenCalled(); resolve(); await page;
 expect(mocks.dashboard).toHaveBeenCalled();
});
it("rejects unauthorized users without querying GA4", async () => {
 mocks.auth.mockRejectedValue(new Error("unauthorized"));
 await expect(Page({})).rejects.toThrow("unauthorized"); expect(mocks.overview).not.toHaveBeenCalled();
});
it("renders corresponding aggregate activity and readable localized page summaries",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"activity",title:"访问活动",report:{headers:["dateHourMinute","sessionSourceMedium","country","pagePath","deviceCategory","sessions","screenPageViews"],rows:[["202611221256","direct / none","China","/zh/products","desktop","2","2"]],rowCount:1}},{id:"pages",title:"访问页面",report:{headers:["pagePath","pageTitle","screenPageViews","totalUsers"],rows:[["/zh/products","产品中心 | RICEWIND","26","30"]],rowCount:1}}]);
 const html=renderToStaticMarkup(await Page({}));
 for(const text of ["2026-11-22 12:56","中国","direct / none","/zh/products","desktop","2 会话","2 浏览","产品中心 | RICEWIND","26 浏览","30 用户"])expect(html).toContain(text);
});
it("uses yesterday's aggregate activity and never requests today's realtime",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({start:"2026-11-21",end:"2026-11-21"})}));
 expect(mocks.today).not.toHaveBeenCalled();expect(mocks.realtime).not.toHaveBeenCalled();
 expect(mocks.dashboard).toHaveBeenCalledWith(expect.objectContaining({start:"2026-11-21",end:"2026-11-21"}));
 expect(html).toContain("最近访问活动");expect(html).not.toContain("今天，到目前为止");expect(html).not.toContain("实时信号");
});
it("keeps non-overview tabs to their requested data source",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"trend",start:"2026-11-01",end:"2026-11-22"})}));
 expect(mocks.section).toHaveBeenCalledWith("trend");
 expect(mocks.fields).not.toHaveBeenCalled();expect(mocks.config).not.toHaveBeenCalled();expect(mocks.today).not.toHaveBeenCalled();expect(mocks.realtime).not.toHaveBeenCalled();
 expect(html).toContain("2026-11-01");
});
it("uses the Chinese-first dashboard hierarchy and explicit freshness state",async()=>{
 const html=renderToStaticMarkup(await Page({}));
 for(const text of ["概览","历史趋势","来源与内容","事件与转化","高级探索","系统状态","当前范围","数据口径与延迟说明","Asia/Shanghai"] )expect(html).toContain(text);
});

it("renders comprehensive reporting shell, metadata explorer and separate realtime failure",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers"],rows:[["0"]],rowCount:1,metadata:{subjectToThresholding:true},quota:{tokensPerHour:{remaining:42}}}},{id:"geo",title:"国家 / 地区与城市",error:"此分区读取失败，未显示为零"}]);
 mocks.fields.mockResolvedValue({dimensions:[{apiName:"customEvent:project",description:"已注册自定义维度"}],metrics:[{apiName:"sessions",description:"会话"}]});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({start:"2026-11-22",end:"2026-11-22"})}));
 for(const text of ["所选范围独立汇总","实时信号","subjectToThresholding","remaining"] )expect(html).toContain(text);
 const explorer=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"explore"})}));
 for(const text of ["完整元数据探索器","customEvent:project","检查兼容性并查询"])expect(explorer).toContain(text);
 expect(html).not.toContain("private_key");
});
it("denies all expanded requests before authorization completes",async()=>{
 mocks.auth.mockRejectedValue(new Error("unauthorized"));await expect(Page({})).rejects.toThrow();
 for(const fn of [mocks.dashboard,mocks.fields,mocks.realtime,mocks.config])expect(fn).not.toHaveBeenCalled();
});

it("keeps selected-range totals and gives correct date preset links",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers","engagementRate"],rows:[["125","0.5623"]],rowCount:1}}]);
 const html=renderToStaticMarkup(await Page({}));
 expect(html).toContain("125");expect(html).toContain("56.2%");expect(html).not.toContain("已隐藏编号");
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
it("exposes a multi-metric chart and an accessible full report",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers","sessions","screenPageViews"],rows:[["20261120","3","4","8"],["20261121","5","6","9"]],rowCount:2}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"trend"})}));
 expect(html).toContain('aria-label="每日用户趋势"');expect(html).toContain('data-series="sessions"');expect(html).toContain('data-series="screenPageViews"');expect(html).toContain("查看完整报表");expect(html).toContain('aria-current="page"');
});
it("retains every report choice without loading other report data",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"events"})}));
 expect(html).toContain('value="sources"');expect(html).toContain('value="commerce"');expect(html).toContain('value="events" selected');expect(mocks.section).toHaveBeenCalledTimes(1);expect(mocks.section).toHaveBeenCalledWith("events");
});
it("prioritizes two metrics rather than extra dimensions in mobile summaries",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"geo",title:"地区",report:{headers:["country","region","city","totalUsers","sessions"],rows:[["Synthetic","Region","City","9","12"]],rowCount:1}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"breakdowns",section:"geo"})}));
 expect(html).toContain('data-mobile="secondary" title="region"');expect(html).toContain('data-mobile="primary" title="sessions"');
});
it("can render an explicitly synthetic visual fixture",async()=>{
 if(!process.env.GA4_PREVIEW_PATH)return;
 const fs=await import("node:fs/promises");const styles=await import("./page.module.css");
 const css=await fs.readFile("src/app/admin/(dashboard)/(secure)/analytics/ga4/page.module.css","utf8");
 const scoped=css.replace(/\.([a-zA-Z][a-zA-Z0-9]*)/g,(match,name)=>styles.default[name]?`.${styles.default[name]}`:match);
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers","sessions","screenPageViews","keyEvents"],rows:[["628","740","1290","8"]],rowCount:1,fetchedAt:"SYNTHETIC FIXTURE"}},{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers","sessions","screenPageViews"],rows:[["20261116","12","18","30"],["20261117","20","27","43"],["20261118","18","24","39"],["20261119","34","40","66"],["20261120","28","35","58"],["20261121","46","53","82"]],rowCount:6}}]);
 const html=renderToStaticMarkup(await Page({}));
 await fs.writeFile(process.env.GA4_PREVIEW_PATH,`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}a{color:#087f73}*{box-sizing:border-box}${scoped}</style><p style="padding:12px;background:#fff2cb">SYNTHETIC FIXTURE · DESIGN PREVIEW ONLY · 非真实业务页面</p>${html}</html>`);
});
