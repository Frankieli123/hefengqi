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
 const headers=report.compare?[...report.headers.map(h=>`${h}（当前）`),...report.compare.headers.map(h=>`${h}（对比）`)]:report.headers;
 const rows=report.rows.map((row,index)=>report.compare?[...row,...(report.compare.rows[index]??[])]:row);
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
export async function explore(q:Query,dimensions:string[],metrics:string[],api:Api=boundedApi):Promise<Report> {
 const meta=await getFieldMetadata(api);validateFields(meta,dimensions,metrics);
 const selected={dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name}))};
 const compatibility=z.object({dimensionCompatibilities:z.array(z.object({compatibility:z.string(),dimensionMetadata:z.object({apiName:z.string()})})).optional(),metricCompatibilities:z.array(z.object({compatibility:z.string(),metricMetadata:z.object({apiName:z.string()})})).optional()}).parse(await api("checkCompatibility",selected));
 if(dimensions.some(name=>!compatibility.dimensionCompatibilities?.some(f=>f.dimensionMetadata.apiName===name&&f.compatibility==="COMPATIBLE"))||metrics.some(name=>!compatibility.metricCompatibilities?.some(f=>f.metricMetadata.apiName===name&&f.compatibility==="COMPATIBLE"))) throw new Error("此字段组合不兼容，未执行报表");
 const dateRanges=[{startDate:q.start,endDate:q.end}];
 if(q.compare){const days=Date.parse(q.end)-Date.parse(q.start)+86400000;dateRanges.push({startDate:new Date(Date.parse(q.start)-days).toISOString().slice(0,10),endDate:new Date(Date.parse(q.start)-86400000).toISOString().slice(0,10)});}
 const run=async(ranges:typeof dateRanges)=>parseReport(await api("runReport",{...selected,dateRanges:ranges,limit:"100",offset:String(q.offset),returnPropertyQuota:true,keepEmptyRows:false,orderBys:dimensions.includes("date")?[{dimension:{dimensionName:"date"}}]:[{metric:{metricName:metrics[0]},desc:true}]}));
 const current=await run([dateRanges[0]!]);if(!q.compare)return current;
 return {...current,compare:await run([dateRanges[1]!])};
}
export function parseReport(raw:unknown):Report {
 const report=reportSchema.parse(raw);
 const headers=[...(report.dimensionHeaders??[]),...(report.metricHeaders??[])].map(f=>f.name);
 const rows=(report.rows??[]).map(row=>[...(row.dimensionValues??[]),...(row.metricValues??[])].map(v=>safeValue(v.value??"")));
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
 {id:"pages",title:"页面与标题",dimensions:["pagePath","pageTitle"],metrics:["screenPageViews","totalUsers","userEngagementDuration"]},
 {id:"geo",title:"国家 / 地区与城市",dimensions:["country","region","city"],metrics:["totalUsers","sessions"]},
 {id:"devices",title:"设备 / 浏览器 / 操作系统",dimensions:["deviceCategory","browser","operatingSystem"],metrics:["totalUsers","sessions"]},
 {id:"screen",title:"屏幕与语言",dimensions:["screenResolution","language"],metrics:["totalUsers","sessions"]},
 {id:"events",title:"事件与关键事件",dimensions:["eventName"],metrics:["eventCount","totalUsers","keyEvents"]},
 {id:"commerce",title:"电子商务（未采集时为空或零）",dimensions:["itemName"],metrics:["itemsViewed","itemsPurchased","itemRevenue"]},
] as const;
export type SectionResult={id:string;title:string;report?:Report;error?:string};
export async function getDashboard(q:Query,api:Api=boundedApi):Promise<SectionResult[]> {
 const reports=await Promise.all(sections.map(async section=>{try{const report=await explore({...q,compare:false,offset:0},[...section.dimensions],[...section.metrics],api);if(q.compare){try{report.compare=await explore({...q,compare:false,start:new Date(Date.parse(q.start)-(Date.parse(q.end)-Date.parse(q.start)+86400000)).toISOString().slice(0,10),end:new Date(Date.parse(q.start)-86400000).toISOString().slice(0,10),offset:0},[...section.dimensions],[...section.metrics],api);}catch{}}return {id:section.id,title:section.title,report};}catch{return {id:section.id,title:section.title,error:"此分区读取失败、权限不足或字段组合不支持；未显示为零"};}}));
 return reports;
}
// Realtime uses Google's separately documented subset, NOT core metadata.
export const realtimeDimensions=["country","city","deviceCategory","eventName","minutesAgo","platform","unifiedScreenName"];
export const realtimeMetrics=["activeUsers","eventCount","screenPageViews","keyEvents"];
export async function realtime(api:Api=boundedApi) {return parseReport(await api("runRealtimeReport",{dimensions:[{name:"minutesAgo"},{name:"country"}],metrics:[{name:"activeUsers"},{name:"eventCount"}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}],limit:"100",returnPropertyQuota:true}));}
export async function configuration(api:Api=boundedApi) {
 const result:Record<string,unknown>={};
 for(const method of ["property","dataStreams","customDimensions","customMetrics","keyEvents","dataRetentionSettings"]){try{result[method]=await api(method);}catch{result[method]={status:"无权限或此配置不可用"};}}
 return result;
}
