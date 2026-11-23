vi.mock("server-only",()=>({}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), overview: vi.fn(), dashboard:vi.fn(), section:vi.fn(), sectionQuery:vi.fn(), fields:vi.fn(), realtime:vi.fn(), config:vi.fn(), explore:vi.fn(), today:vi.fn(), bq:vi.fn() }));
vi.mock("@/lib/admin-session", () => ({ requireSecureAdmin: mocks.auth }));
vi.mock("@/lib/ga4-preview-auth",()=>({isGa4Preview:vi.fn(async()=>false)}));
vi.mock("@/lib/ga4-service", () => ({ getGa4Overview: mocks.overview }));
vi.mock("@/lib/bigquery-activity",()=>({getBigQueryActivity:mocks.bq}));
vi.mock("@/lib/ga4-reporting",async importOriginal => ({...await importOriginal<typeof import("@/lib/ga4-reporting")>(),getOverviewDashboard:mocks.dashboard,getDashboard:mocks.dashboard,getSectionReport:async(id:string,q:unknown)=>{mocks.section(id);mocks.sectionQuery(id,q);const values=await mocks.dashboard.getMockImplementation()?.();return values.find((v:{id:string})=>v.id===id)??{id,title:id};},getFieldMetadata:mocks.fields,realtime:mocks.realtime,configuration:mocks.config,explore:mocks.explore,getTodayReport:mocks.today}));
import Page from "./page";
beforeEach(() => { vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));vi.resetAllMocks(); mocks.auth.mockResolvedValue({}); mocks.overview.mockResolvedValue({ available: false, reason: "not_configured" }); mocks.dashboard.mockResolvedValue([]);mocks.fields.mockResolvedValue({dimensions:[],metrics:[]});mocks.realtime.mockRejectedValue(new Error("offline"));mocks.config.mockResolvedValue({});mocks.today.mockResolvedValue({date:"2026-11-22",timezone:"Asia/Shanghai",source:"historical_today",report:{headers:["totalUsers","sessions","screenPageViews","keyEvents"],rows:[["125","126","115","0"]],rowCount:1,fetchedAt:"2026-11-22T11:00:00Z"}}); });
beforeEach(()=>mocks.bq.mockResolvedValue({status:"waiting",sessions:[],message:"等待首批事件表"}));
afterEach(()=>vi.useRealTimers());
it.each(["overview","acquisition","engagement"])("keeps %s aggregate-only without querying realtime or BigQuery",async(view)=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view})}));
 expect(mocks.bq).not.toHaveBeenCalled();expect(mocks.realtime).not.toHaveBeenCalled();
 expect(html).not.toContain("逐会话访问");expect(html).not.toContain("实时信号");
 if(view==="overview")expect(html).not.toContain("GA4 聚合活动");
 if(view==="acquisition")expect(html).toContain("GA4 聚合活动");
 if(view==="engagement"){expect(mocks.section).toHaveBeenCalledWith("pages");expect(mocks.section).toHaveBeenCalledWith("events");}
});
it("loads Realtime and BigQuery together only in monitoring",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"realtime",start:"2026-11-21",end:"2026-11-21"})}));
 expect(mocks.bq).toHaveBeenCalled();expect(mocks.realtime).toHaveBeenCalled();
 expect(html).toContain("实时信号");expect(html).toContain("逐会话访问");expect(html).toContain("监控用，不用于趋势分析");
 expect(mocks.dashboard).not.toHaveBeenCalled();expect(mocks.section).not.toHaveBeenCalled();
});
it.each([["breakdowns","geo","acquisition"],["breakdowns","pages","engagement"],["events","events","engagement"]])("maps legacy %s / %s to %s",async(view,section,active)=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view,section})}));
 expect(html).toContain(`name="view" value="${active}"`);expect(mocks.bq).not.toHaveBeenCalled();
 expect(mocks.section).toHaveBeenCalledWith(section);
});
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
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"acquisition"})}))+renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"engagement"})}));
 for(const text of ["2026-11-22 12:56","中国","直接访问","/zh/products","桌面电脑","2 会话","2 浏览","产品中心 | RICEWIND","26 浏览","30 用户"])expect(html).toContain(text);
});
it("shows every returned aggregate activity row without a collapsed duplicate report",async()=>{
 const rows=Array.from({length:100},(_,i)=>["202611221256","direct / none","China",`/activity-${i}`,"desktop","2","2"]);
 mocks.dashboard.mockResolvedValue([{id:"activity",title:"访问活动",report:{headers:["dateHourMinute","sessionSourceMedium","country","pagePath","deviceCategory","sessions","screenPageViews"],rows,rowCount:250,metadata:{subjectToThresholding:true}}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"acquisition",start:"2026-11-21",end:"2026-11-21",compare:"1"})}));
 expect(html.match(/data-label="访问页面"/g)).toHaveLength(100);
 expect(html).toContain('/activity-99');expect(html).not.toContain("数据质量与更多活动");expect(html).not.toContain("最近 30 组活动");
 expect(html).toContain("subjectToThresholding");
 const activity=html.slice(html.indexOf("GA4 聚合活动"),html.indexOf("/activity-99"));
 expect(activity).not.toContain("<details");
 expect(html).toContain('aria-label="GA4 聚合活动分页"');
 expect(html).toContain("第 1 页 · 共 250 行");
 expect(html).toContain('href="/admin/analytics/ga4?view=acquisition&amp;start=2026-11-21&amp;end=2026-11-21&amp;compare=1&amp;offset=100"');
 expect(html).toContain("下一页");expect(html).not.toContain("上一页");
});
it.each([{offset:"100",count:100,previous:true,next:true,page:2},{offset:"200",count:50,previous:true,next:false,page:3},{offset:"300",count:0,previous:true,next:false,page:4}])("paginates aggregate activity at offset $offset without hiding rows or changing the selected range",async({offset,count,previous,next,page})=>{
 mocks.dashboard.mockResolvedValue([{id:"activity",title:"访问活动",report:{headers:["dateHourMinute","pagePath"],rows:Array.from({length:count},(_,i)=>["202611211256",`/page-${offset}-${i}`]),rowCount:250}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"acquisition",start:"2026-11-21",end:"2026-11-21",compare:"1",offset})}));
 expect(mocks.sectionQuery).toHaveBeenCalledWith("activity",expect.objectContaining({offset:Number(offset),start:"2026-11-21",end:"2026-11-21",compare:true}));
 expect(html.match(/data-label="访问页面"/g)??[]).toHaveLength(count);
 expect(html.includes("上一页")).toBe(previous);expect(html.includes("下一页")).toBe(next);
 expect(html).toContain(`第 ${page} 页 · 共 250 行`);
 expect(html).toContain(`compare=1&amp;offset=${Number(offset)-100}`);
 if(next)expect(html).toContain(`compare=1&amp;offset=${Number(offset)+100}`);
});
it("does not show aggregate pagination for a complete single page",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"activity",title:"访问活动",report:{headers:["dateHourMinute","pagePath"],rows:[["202611211256","/complete"]],rowCount:1}}]);
 const html=renderToStaticMarkup(await Page({}));
 expect(html).not.toContain('aria-label="GA4 聚合活动分页"');
});
it("renders BigQuery sessions with an inline lazy timeline control and no full-page session query",async()=>{
 const session={id:"abc123def456",startedAt:"2026-11-22T04:00:00Z",lastAt:"2026-11-22T04:03:00Z",country:"China",region:"Guangdong Province",city:"Shenzhen",source:"",medium:"",device:"desktop",browser:"Chrome",os:"Windows",landingPage:"https://ricewind.com/zh",lastPage:"https://ricewind.com/zh/products",pageViews:2,eventCount:3};
 mocks.bq.mockResolvedValue({status:"ready",sessions:[session]});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"realtime"})}));
 for(const text of ["逐会话访问","来源未知","广东省","深圳","桌面电脑","时间线"])expect(html).toContain(text);
 expect(html).not.toContain("private-user");expect(html).not.toContain("会话 abc123def456 · 3 条事件");expect(html).not.toContain("&amp;session=abc123def456");
});
it("uses yesterday's aggregate activity and never requests today's realtime",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"acquisition",start:"2026-11-21",end:"2026-11-21"})}));
 expect(mocks.today).not.toHaveBeenCalled();expect(mocks.realtime).not.toHaveBeenCalled();
 expect(mocks.sectionQuery).toHaveBeenCalledWith("activity",expect.objectContaining({start:"2026-11-21",end:"2026-11-21"}));
 expect(html).toContain("GA4 聚合活动");expect(html).not.toContain("今天，到目前为止");expect(html).not.toContain("实时信号");
});
it("keeps non-overview tabs to their requested data source",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"trend",start:"2026-11-01",end:"2026-11-22"})}));
 expect(mocks.section).toHaveBeenCalledWith("trend");
 expect(mocks.fields).not.toHaveBeenCalled();expect(mocks.config).not.toHaveBeenCalled();expect(mocks.today).not.toHaveBeenCalled();expect(mocks.realtime).not.toHaveBeenCalled();
 expect(html).toContain("2026-11-01");
});
it("uses seven Chinese topic tabs and explicit freshness state",async()=>{
 const html=renderToStaticMarkup(await Page({}));
 for(const [id] of [["realtime","实时"],["overview","概览"],["acquisition","获客"],["engagement","互动"],["trend","趋势"],["explore","高级探索"],["system","系统"]])expect(html).toContain(`view=${id}&amp;start=`);
 for(const text of ["当前范围","数据口径与延迟说明","Asia/Shanghai"])expect(html).toContain(text);
});

it("renders comprehensive reporting shell, metadata explorer and separate realtime failure",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"overview",title:"核心概览",report:{headers:["totalUsers"],rows:[["0"]],rowCount:1,metadata:{subjectToThresholding:true},quota:{tokensPerHour:{remaining:42}}}},{id:"geo",title:"国家 / 地区与城市",error:"此分区读取失败，未显示为零"}]);
 mocks.fields.mockResolvedValue({dimensions:[{apiName:"customEvent:project",description:"已注册自定义维度"}],metrics:[{apiName:"sessions",description:"会话"}]});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({start:"2026-11-22",end:"2026-11-22"})}));
 for(const text of ["所选范围独立汇总","subjectToThresholding","remaining"] )expect(html).toContain(text);
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

it("renders a single returned day as honest summary cards instead of a misleading chart",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers","sessions"],rows:[["20261122","187","190"]],rowCount:1}}]);
 const html=renderToStaticMarkup(await Page({}));
 expect(html).toContain("仅返回 1 天数据，不绘制趋势折线");expect(html).not.toContain('aria-label="每日用户、会话与浏览量趋势图"');
});
it("renders an accessible daily trend without inventing absent days",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"trend",title:"每日趋势",report:{headers:["date","totalUsers","sessions"],rows:[["20261120","3","4"],["20261121","5","6"]],rowCount:2}}]);
 const html=renderToStaticMarkup(await Page({}));expect(html).toContain('aria-label="每日用户、会话与浏览量趋势图"');expect(html).toContain("2026-11-20");
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
 expect(html).toContain('aria-label="每日用户、会话与浏览量趋势图"');expect(html).toContain("悬浮图表可查看当日数值");expect(html).toContain("查看完整报表");expect(html).toContain('aria-current="page"');
});
it("retains every report choice without loading other report data",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"events"})}));
 expect(html).not.toContain('value="sources"');expect(html).toContain('value="commerce"');expect(html).toContain('value="events" selected');expect(mocks.section).toHaveBeenCalledTimes(2);expect(mocks.section).toHaveBeenCalledWith("events");
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


it("places aggregate activity before acquisition breakdowns",async()=>{
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"acquisition"})}));
 expect(html.indexOf("GA4 聚合活动")).toBeLessThan(html.indexOf("来源 / 媒介"));
});
it("omits the confusing realtime empty-activity sentence",async()=>{
 mocks.bq.mockResolvedValue({status:"waiting",sessions:[]});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"realtime"})}));
 expect(html).not.toContain("最近 30 分钟暂无返回活动");
});
it("distinguishes successful empty events from an API/report failure",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"events",title:"事件与关键事件",report:{headers:["eventName","eventCount","totalUsers","keyEvents"],rows:[],rowCount:0}},{id:"pages",title:"访问页面",report:{headers:["pagePath"],rows:[],rowCount:0}}]);
 const empty=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"engagement"})}));
 expect(empty).toContain("GA4 查询成功，但所选日期范围没有返回事件行");
 expect(empty).not.toContain("此分区读取失败");
 mocks.dashboard.mockResolvedValue([{id:"events",title:"事件与关键事件",error:"此分区读取失败，权限不足"},{id:"pages",title:"访问页面",report:{headers:["pagePath"],rows:[],rowCount:0}}]);
 const failed=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"engagement"})}));
 expect(failed).toContain("权限不足");
 expect(failed).not.toContain("GA4 查询成功，但所选日期范围没有返回事件行");
});

it("queries BigQuery realtime with Shanghai today, regardless of the historical date filter",async()=>{
 vi.setSystemTime(new Date("2026-11-22T16:30:00Z"));
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"realtime",start:"2026-11-20",end:"2026-11-20"})}));
 expect(mocks.bq).toHaveBeenCalledWith(expect.objectContaining({start:"2026-11-23",end:"2026-11-23",realtime:true}));
 expect(html).not.toContain("2026-11-20 — 2026-11-20");expect(html).not.toContain('type="date"');
});

it("starts realtime calls before a deferred BigQuery query completes",async()=>{
 let done!:(v:unknown)=>void;mocks.bq.mockReturnValue(new Promise(r=>{done=r;}));
 const pending=Page({searchParams:Promise.resolve({view:"realtime"})});
 for(let i=0;i<12;i++)await Promise.resolve();
 const started=mocks.realtime.mock.calls.length;done({status:"ready",sessions:[]});await pending;expect(started).toBe(1);
});

it("renders every returned Pages row and discloses remaining rows",async()=>{
 mocks.dashboard.mockResolvedValue([{id:"pages",title:"访问页面",report:{headers:["pagePath","pageTitle","screenPageViews","totalUsers"],rows:Array.from({length:15},(_,i)=>[`/p-${i}`,`Page ${i}`,"1","1"]),rowCount:20}}]);
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"engagement",start:"2026-11-20",end:"2026-11-21",compare:"1"})}));
 expect(html.match(/href="\/p-/g)).toHaveLength(15);expect(html).toContain("当前返回 15 行 / 总计 20 行");expect(html).toContain("进入探索器分页查看其余页面");expect(html).toContain("offset=15");
});

it("uses current Pages offset for remaining rows",async()=>{mocks.dashboard.mockResolvedValue([{id:"pages",title:"访问页面",report:{headers:["pagePath","pageTitle","screenPageViews","totalUsers"],rows:Array.from({length:15},(_,i)=>[`/p-${i}`,`Page ${i}`,"1","1"]),rowCount:40}}]);const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"engagement",section:"pages",start:"2026-11-20",end:"2026-11-21",offset:"100"})}));expect(html).toContain("offset=115");expect(html).not.toContain("offset=15");});
it("labels realtime timeline as full Shanghai-date session detail",async()=>{mocks.bq.mockResolvedValue({status:"ready",sessions:[{id:"abc123def456",startedAt:"2026-11-23T02:00:00Z",lastAt:"2026-11-23T02:03:00Z",country:"CN",region:"",city:"",source:"direct",medium:"",device:"desktop",browser:"",os:"",landingPage:"/",lastPage:"/",pageViews:1,eventCount:1}]});const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({view:"realtime",start:"2026-11-01",end:"2026-11-02"})}));expect(mocks.bq).toHaveBeenCalledWith(expect.objectContaining({start:"2026-11-22",end:"2026-11-22",realtime:true}));expect(html).toContain("当前上海日期内完整会话事件，不限近 30 分钟");expect(html).not.toContain("2026-11-01 — 2026-11-02");});
