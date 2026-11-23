import "server-only";
export type Query = { start: string; end: string; offset: number; compare: boolean };
export function normalizeQuery(input: Record<string, string | undefined> = {}): Query {
 const today = new Date(new Date().toLocaleString("en-US", {timeZone:"Asia/Shanghai"}));
 const end = new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()-1));
 const start = new Date(end.getTime()-27*86400000);
 const s=input.start || start.toISOString().slice(0,10), e=input.end || end.toISOString().slice(0,10);
 for(const value of [s,e]) if(!/^\d{4}-\d{2}-\d{2}$/.test(value)|| !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw new Error("日期无效");
 const days=(Date.parse(e)-Date.parse(s))/86400000;
 if(days<0||days>365||e>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Shanghai"})) throw new Error("日期范围须为过去或今天的 1–366 天");
 const offset=Number(input.offset||0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000) throw new Error("分页范围无效");
 return {start:s,end:e,offset,compare:input.compare==="1"};
}

import { ga4ReadApi } from "./ga4-service";
import { z } from "zod";
type Api=(method:string,body?:Record<string,unknown>)=>Promise<unknown>;
const fieldSchema=z.object({apiName:z.string(),uiName:z.string().optional(),description:z.string().optional(),customDefinition:z.boolean().optional(),type:z.string().optional(),deprecatedApiNames:z.array(z.string()).optional(),category:z.string().optional()});
export const metadataSchema=z.object({dimensions:z.array(fieldSchema),metrics:z.array(fieldSchema)});
export type FieldMetadata=z.infer<typeof metadataSchema>;
export type Report={headers:string[];rows:string[][];rowCount:number;metadata?:Record<string,unknown>;quota?:unknown;compare?:Report;fetchedAt?:string};
const reportSchema=z.object({dimensionHeaders:z.array(z.object({name:z.string()})).optional(),metricHeaders:z.array(z.object({name:z.string()})).optional(),rows:z.array(z.object({dimensionValues:z.array(z.object({value:z.string().optional()})).optional(),metricValues:z.array(z.object({value:z.string().optional()})).optional()})).optional(),rowCount:z.number().int().nonnegative().optional(),metadata:z.record(z.string(),z.unknown()).optional(),propertyQuota:z.unknown().optional()}).refine(v=>!!v.metricHeaders?.length||!!v.metadata?.timeZone);
export function safeValue(value:string):string {
 return value.replace(/[?#].*$/s,"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[已隐藏邮箱]").replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,"[已隐藏IP]").replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,"[已隐藏标识]").replace(/\b\d{7,}\b/g,"[已隐藏编号]").slice(0,500);
}
export function toCsv(report:Report) {
 const escape=(value:string)=>{let text=safeValue(value);if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)) text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const comparison=report.compare;
 if(comparison&&JSON.stringify(comparison.headers)!==JSON.stringify(report.headers))throw new Error("比较报告字段不一致");
 // Period-labelled independent rows: API ranking/pagination does not establish a dimension join.
 const headers=comparison?["period",...report.headers]:report.headers;
 const rows=comparison?[...report.rows.map(row=>["current",...row]),...comparison.rows.map(row=>["comparison",...row])]:report.rows;
 return "\uFEFF"+[headers,...rows].map(row=>row.map(escape).join(",")).join("\r\n");
}
let active=0;
const waiters:Array<()=>void>=[];
const cache=new Map<string,{expires:number;value:unknown}>();
const pending=new Map<string,Promise<unknown>>();
export async function boundedApi(method:string,body?:Record<string,unknown>):Promise<unknown> {
 const key=JSON.stringify([process.env.GA4_PROPERTY_ID,process.env.GOOGLE_APPLICATION_CREDENTIALS,method,body]);
 const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.value;
 const existing=pending.get(key);if(existing)return existing;
 if(pending.size>=24)throw new Error("查询繁忙，请稍后再试");
 const task=(async()=>{
  if(active>=2)await new Promise<void>(resolve=>waiters.push(resolve));else active++;
  try{const value=await ga4ReadApi(method,body);if(cache.size>=64)cache.delete(cache.keys().next().value!);cache.set(key,{value,expires:Date.now()+(method==="metadata"?600000:method==="runRealtimeReport"?15000:60000)});return value;}
  finally{const next=waiters.shift();if(next)next();else active--;}
 })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
export async function getFieldMetadata(api:Api=boundedApi) {return metadataSchema.parse(await api("metadata"));}
function validateFields(meta:FieldMetadata,dimensions:string[],metrics:string[]) {
 if(dimensions.length>6||metrics.length<1||metrics.length>8||new Set(dimensions).size!==dimensions.length||new Set(metrics).size!==metrics.length)throw new Error("最多 6 个维度与 8 个指标");
 for(const [fields,available] of [[dimensions,meta.dimensions],[metrics,meta.metrics]] as const) for(const name of fields) if(!available.some(f=>f.apiName===name)||/userId|clientId|sessionId/i.test(name)) throw new Error("字段不在属性元数据中或涉及身份标识");
}
export async function explore(q:Query,dimensions:string[],metrics:string[],api:Api=boundedApi,options:{order:"newest"|"metric"}={order:"metric"}):Promise<Report> {
 const meta=await getFieldMetadata(api);validateFields(meta,dimensions,metrics);
 const selected={dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name}))};
 const compatibility=z.object({dimensionCompatibilities:z.array(z.object({compatibility:z.string(),dimensionMetadata:z.object({apiName:z.string()})})).optional(),metricCompatibilities:z.array(z.object({compatibility:z.string(),metricMetadata:z.object({apiName:z.string()})})).optional()}).parse(await api("checkCompatibility",selected));
 if(dimensions.some(name=>!compatibility.dimensionCompatibilities?.some(f=>f.dimensionMetadata.apiName===name&&f.compatibility==="COMPATIBLE"))||metrics.some(name=>!compatibility.metricCompatibilities?.some(f=>f.metricMetadata.apiName===name&&f.compatibility==="COMPATIBLE"))) throw new Error("此字段组合不兼容，未执行报表");
 const dateRanges=[{startDate:q.start,endDate:q.end}];
 if(q.compare){const days=Date.parse(q.end)-Date.parse(q.start)+86400000;dateRanges.push({startDate:new Date(Date.parse(q.start)-days).toISOString().slice(0,10),endDate:new Date(Date.parse(q.start)-86400000).toISOString().slice(0,10)});}
const run=async(ranges:typeof dateRanges)=>parseReport(await api("runReport",{...selected,dateRanges:ranges,limit:"100",offset:String(q.offset),returnPropertyQuota:true,keepEmptyRows:false,orderBys:options.order==="newest"?[{dimension:{dimensionName:dimensions[0]},desc:true}]:dimensions.includes("date")?[{dimension:{dimensionName:"date"}}]:[{metric:{metricName:metrics[0]},desc:true}]}),metrics);
 const current=await run([dateRanges[0]!]);if(!q.compare)return current;
 return {...current,compare:await run([dateRanges[1]!])};
}
export function parseReport(raw:unknown,requestedMetrics:string[]=[]):Report {
 const report=reportSchema.parse(raw);
 const headers=[...(report.dimensionHeaders??[]),...(report.metricHeaders??[])].map(f=>f.name);if(headers.length===0&&requestedMetrics.length)headers.push(...requestedMetrics);
 const rows=(report.rows??[]).map(row=>{
  const dimensionNames=(report.dimensionHeaders??[]).map(f=>f.name);
  const dimensions=(row.dimensionValues??[]).map((v,i)=>/^(?:date|dateHour|dateHourMinute|hour|minute)$/.test(dimensionNames[i]??"")?(v.value??""):safeValue(v.value??""));
  const metrics=(row.metricValues??[]).map(v=>v.value??"");
  return [...dimensions,...metrics];
 });
 if(rows.some(row=>row.length!==headers.length)) throw new Error("报告结构无效");
 return {headers,rows,rowCount:report.rowCount??rows.length,metadata:report.metadata,quota:report.propertyQuota,fetchedAt:new Date().toISOString()};
}
export const sections=[
 {id:"overview",title:"核心概览",dimensions:[],metrics:["totalUsers","newUsers","sessions","screenPageViews","engagedSessions","engagementRate","averageSessionDuration","keyEvents"]},
 {id:"trend",title:"每日趋势",dimensions:["date"],metrics:["totalUsers","sessions","screenPageViews","keyEvents"]},
 {id:"channels",title:"会话渠道",dimensions:["sessionDefaultChannelGroup"],metrics:["sessions","totalUsers","engagementRate","keyEvents"]},
 {id:"sources",title:"来源 / 媒介",dimensions:["sessionSourceMedium"],metrics:["sessions","engagedSessions","keyEvents"]},
 {id:"campaigns",title:"会话广告系列",dimensions:["sessionCampaignName"],metrics:["sessions","totalUsers","keyEvents"]},
 {id:"referrers",title:"引荐来源",dimensions:["pageReferrer"],metrics:["screenPageViews","totalUsers"]},
 {id:"landing",title:"着陆页",dimensions:["landingPage"],metrics:["sessions","engagementRate","keyEvents"]},
 {id:"pages",title:"访问页面",dimensions:["pagePath","pageTitle"],metrics:["screenPageViews","totalUsers"]},
 {id:"geo",title:"国家 / 地区与城市",dimensions:["countryId","country","region","city"],metrics:["totalUsers","sessions"]},
 {id:"devices",title:"设备 / 浏览器 / 操作系统",dimensions:["deviceCategory","browser","operatingSystem"],metrics:["totalUsers","sessions"]},
 {id:"activity",title:"访问活动（同一行对应，匿名聚合）",dimensions:["dateHourMinute","sessionSourceMedium","countryId","country","pagePath","deviceCategory"],metrics:["sessions","screenPageViews"]},
 {id:"screen",title:"屏幕与语言",dimensions:["screenResolution","language"],metrics:["totalUsers","sessions"]},
 {id:"events",title:"事件与关键事件",dimensions:["eventName"],metrics:["eventCount","totalUsers","keyEvents"]},
 {id:"commerce",title:"电子商务（未采集时为空或零）",dimensions:["itemName"],metrics:["itemsViewed","itemsPurchased","itemRevenue"]},
] as const;
export type SectionResult={id:string;title:string;report?:Report;error?:string};
export async function getSectionReport(id:string,q:Query,api:Api=boundedApi):Promise<SectionResult> {
 const section=sections.find(item=>item.id===id);
 if(!section)throw new Error("invalid_section");
 try {
  const report=await explore({...q,compare:false,offset:id==="activity"?q.offset:0},[...section.dimensions],[...section.metrics],api,id==="activity"?{order:"newest"}:undefined);
  if(q.compare){
   const days=Date.parse(q.end)-Date.parse(q.start)+86400000;
   try{report.compare=await explore({...q,compare:false,start:new Date(Date.parse(q.start)-days).toISOString().slice(0,10),end:new Date(Date.parse(q.start)-86400000).toISOString().slice(0,10),offset:0},[...section.dimensions],[...section.metrics],api);}catch{}
  }
  return {id:section.id,title:section.title,report};
 } catch(error){
  const message=error instanceof Error?error.message:"";
  const safe=message.includes("GA4 API 读取权限不足")||message.includes("GA4 API 拒绝了请求字段")||message.includes("GA4 API 配额已耗尽")||message.includes("Google Analytics API 暂时不可用")?message:"GA4 报表读取失败，未显示为零";
  return {id:section.id,title:section.title,error:safe};
 }
}
export async function getDashboard(q:Query,api:Api=boundedApi):Promise<SectionResult[]> {
 return Promise.all(sections.map(section=>getSectionReport(section.id,q,api)));
}
export async function getOverviewDashboard(q:Query,api:Api=boundedApi,options:{batch?:boolean}={batch:true}):Promise<SectionResult[]> {
 const ids=["overview","trend","activity","sources","geo","pages","devices"] as const;
 const fallback=()=>Promise.all(ids.map(id=>getSectionReport(id,q,api)));
 if(!options.batch)return fallback();
 try {
  const meta=await getFieldMetadata(api);
  const selections=ids.map(id=>{const section=sections.find(s=>s.id===id)!;return {id,section,dimensions:[...section.dimensions],metrics:[...section.metrics]}});
  for(const item of selections)validateFields(meta,item.dimensions,item.metrics);
  await Promise.all(selections.map(async item=>{
   const selected={dimensions:item.dimensions.map(name=>({name})),metrics:item.metrics.map(name=>({name}))};
   const compatibility=z.object({dimensionCompatibilities:z.array(z.object({compatibility:z.string(),dimensionMetadata:z.object({apiName:z.string()})})).optional(),metricCompatibilities:z.array(z.object({compatibility:z.string(),metricMetadata:z.object({apiName:z.string()})})).optional()}).parse(await api("checkCompatibility",selected));
   if(item.dimensions.some(name=>!compatibility.dimensionCompatibilities?.some(f=>f.dimensionMetadata.apiName===name&&f.compatibility==="COMPATIBLE"))||item.metrics.some(name=>!compatibility.metricCompatibilities?.some(f=>f.metricMetadata.apiName===name&&f.compatibility==="COMPATIBLE")))throw new Error("此字段组合不兼容");
  }));
  const requests=selections.map(item=>({dimensions:item.dimensions.map(name=>({name})),metrics:item.metrics.map(name=>({name})),dateRanges:[{startDate:q.start,endDate:q.end}],limit:"100",offset:String(item.id==="activity"?q.offset:0),returnPropertyQuota:true,keepEmptyRows:false,orderBys:item.id==="activity"?[{dimension:{dimensionName:"dateHourMinute"},desc:true}]:item.dimensions.includes("date")?[{dimension:{dimensionName:"date"}}]:[{metric:{metricName:item.metrics[0]},desc:true}]}));
  const outputs:unknown[]=[];
  for(let offset=0;offset<requests.length;offset+=5){
   const raw=z.object({reports:z.array(z.unknown()).max(5)}).parse(await api("batchRunReports",{requests:requests.slice(offset,offset+5)}));
   if(raw.reports.length!==Math.min(5,requests.length-offset))throw new Error("批量报表响应不完整");
   outputs.push(...raw.reports);
  }
  return selections.map((item,index)=>({id:item.id,title:item.section.title,report:parseReport(outputs[index],item.metrics)}));
 } catch {
  // Read-only compatibility fallback keeps older GA4 proxies usable and never invents empty reports.
  return fallback();
 }
}
// Realtime uses Google's separately documented subset, NOT core metadata.
export const realtimeDimensions=["country","countryId","city","deviceCategory","eventName","minutesAgo","platform","unifiedScreenName"];
export const realtimeMetrics=["activeUsers","eventCount","screenPageViews","keyEvents"];
export async function realtime(api:Api=boundedApi) {return parseReport(await api("runRealtimeReport",{dimensions:[{name:"minutesAgo"},{name:"countryId"},{name:"country"},{name:"city"},{name:"deviceCategory"},{name:"unifiedScreenName"},{name:"eventName"}],metrics:[{name:"activeUsers"},{name:"eventCount"},{name:"screenPageViews"}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],orderBys:[{dimension:{dimensionName:"minutesAgo"}}],limit:"100",returnPropertyQuota:true}),["activeUsers","eventCount","screenPageViews"]);}
export async function configuration(api:Api=boundedApi) {
 const result:Record<string,unknown>={};
 for(const method of ["property","dataStreams","customDimensions","customMetrics","keyEvents","dataRetentionSettings"]){try{result[method]=await api(method);}catch{result[method]={status:"无权限或此配置不可用"};}}
 return result;
}

export type TodayReport = { report: Report; timezone: string; source: "historical_today"; date: string };
function propertyDate(timeZone = "Asia/Shanghai") {
 return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export async function getTodayReport(api: Api = boundedApi): Promise<TodayReport> {
 const property = await api("property").catch(()=>({timeZone:"Asia/Shanghai"})) as { timeZone?: string; timezone?: string };
 const timezone = property.timeZone ?? property.timezone ?? "Asia/Shanghai";
 const date = propertyDate(timezone);
 const raw = await api("runReport", { dateRanges: [{ startDate: date, endDate: date }], metrics: ["totalUsers", "sessions", "screenPageViews", "keyEvents"].map(name => ({ name })), returnPropertyQuota: true, keepEmptyRows: false });
 const report = parseReport(raw, ["totalUsers", "sessions", "screenPageViews", "keyEvents"]);
 return { report, timezone: typeof report.metadata?.timeZone === "string" ? report.metadata.timeZone : timezone, source: "historical_today", date };
}

export async function realtimeTotals(api:Api=boundedApi):Promise<Report>{
 return parseReport(await api("runRealtimeReport",{metrics:[{name:"activeUsers"},{name:"eventCount"}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],returnPropertyQuota:true}),["activeUsers","eventCount"]);
}
