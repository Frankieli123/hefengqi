import { expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import * as reporting from "./ga4-reporting";
beforeEach(() => vi.unstubAllEnvs());
it("exports independent comparison rows without positional dimension matching or dropping comparison-only rows",()=>{
 const csv=reporting.toCsv({headers:["country","sessions"],rows:[["A","9"]],rowCount:1,compare:{headers:["country","sessions"],rows:[["B","8"],["C","7"]],rowCount:2}});
 expect(csv).toContain('"period","country","sessions"');
 expect(csv).toContain('"current","A","9"');
 expect(csv).toContain('"comparison","B","8"');
 expect(csv).toContain('"comparison","C","7"');
 expect(csv).not.toContain('"A","9","B","8"');
});
it("normalizes bounded dates, pagination and comparison without accepting impossible dates", () => {
 expect(() => reporting.normalizeQuery({start:"2026-02-30", end:"2026-03-02"})).toThrow();
 const q = reporting.normalizeQuery({start:"2026-11-01",end:"2026-11-07",offset:"100",compare:"1"});
 expect(q).toMatchObject({start:"2026-11-01",end:"2026-11-07",offset:100,compare:true});
 expect(() => reporting.normalizeQuery({start:"2020-01-01",end:"2026-11-07"})).toThrow();
});
it("escapes CSV formula injection, embedded quotes and strips query PII", () => {
 expect(reporting.toCsv({headers:["pagePath","sessions"], rows:[["/en?email=x@y.com#private", "2"],["=cmd(1)","0"],["a,\"b","3"]],rowCount:3})).toContain('"/en","2"');
 expect(reporting.toCsv({headers:["pagePath"],rows:[["=cmd(1)"]],rowCount:1})).toContain("'=cmd(1)");
});
it("discovers property metadata, rejects unknown fields and checks compatibility before reporting", async () => {
 const calls: string[]=[];
 const api=async (method:string) => {calls.push(method); if(method==="metadata") return {dimensions:[{apiName:"country",uiName:"Country",description:"geo"}], metrics:[{apiName:"sessions",type:"TYPE_INTEGER"}]}; if(method==="checkCompatibility") return {dimensionCompatibilities:[{compatibility:"COMPATIBLE",dimensionMetadata:{apiName:"country"}}],metricCompatibilities:[{compatibility:"COMPATIBLE",metricMetadata:{apiName:"sessions"}}]};return {dimensionHeaders:[{name:"country"}],metricHeaders:[{name:"sessions"}],rows:[{dimensionValues:[{value:"CN"}],metricValues:[{value:"0"}]}],rowCount:1,metadata:{timeZone:"Asia/Shanghai",subjectToThresholding:true},propertyQuota:{tokensPerHour:{remaining:42}}};};
 const q=reporting.normalizeQuery({start:"2026-11-01",end:"2026-11-07"});
 await expect(reporting.explore(q,["not-real"],["sessions"],api)).rejects.toThrow();
 calls.length=0;
 const result=await reporting.explore(q,["country"],["sessions"],api);
 expect(calls).toEqual(["metadata","checkCompatibility","runReport"]);
 expect(result).toMatchObject({rows:[["CN","0"]],rowCount:1,metadata:{subjectToThresholding:true}});
});
it("checks only selected fields in Google's full compatibility response",async()=>{
 const api=async(method:string)=>method==="metadata"?{dimensions:[{apiName:"country"}],metrics:[{apiName:"sessions"}]}:method==="checkCompatibility"?{dimensionCompatibilities:[{dimensionMetadata:{apiName:"country"},compatibility:"COMPATIBLE"},{dimensionMetadata:{apiName:"unselected"},compatibility:"INCOMPATIBLE"}],metricCompatibilities:[{metricMetadata:{apiName:"sessions"},compatibility:"COMPATIBLE"}]}:{metricHeaders:[{name:"sessions"}],metadata:{timeZone:"Asia/Shanghai"}};
 await expect(reporting.explore(reporting.normalizeQuery(),["country"],["sessions"],api)).resolves.toMatchObject({rows:[]});
});
it("queries one section only and preserves its selected comparison window",async()=>{
 const calls:Array<[string,Record<string,unknown>|undefined]>=[];
 const api=async(method:string,body?:Record<string,unknown>)=>{calls.push([method,body]);if(method==="metadata")return {dimensions:[{apiName:"sessionDefaultChannelGroup"}],metrics:[{apiName:"sessions"},{apiName:"totalUsers"},{apiName:"engagementRate"},{apiName:"keyEvents"}]};if(method==="checkCompatibility")return {dimensionCompatibilities:(body?.dimensions as Array<{name:string}>).map(m=>({dimensionMetadata:{apiName:m.name},compatibility:"COMPATIBLE"})),metricCompatibilities:(body?.metrics as Array<{name:string}>).map(m=>({metricMetadata:{apiName:m.name},compatibility:"COMPATIBLE"}))};return {metricHeaders:[{name:"sessions"}],rows:[],metadata:{timeZone:"Asia/Shanghai"}};};
 const q=reporting.normalizeQuery({start:"2026-11-01",end:"2026-11-07",compare:"1"});
 const result=await reporting.getSectionReport("channels",q,api);
 expect(result.id).toBe("channels");expect(calls.filter(([method])=>method==="runReport")).toHaveLength(2);
 expect(calls.filter(([method])=>method==="runReport").map(([,body])=>body?.dateRanges)).toEqual([[{startDate:"2026-11-01",endDate:"2026-11-07"}],[{startDate:"2026-10-25",endDate:"2026-10-31"}]]);
});
it("isolates failed dashboard sections while preserving genuine empty successes",async()=>{
 const api=async(method:string,body?:Record<string,unknown>)=>{
  if(method==="metadata")return {dimensions:reporting.sections.flatMap(s=>s.dimensions).map(apiName=>({apiName})),metrics:reporting.sections.flatMap(s=>s.metrics).map(apiName=>({apiName}))};
  const dims=(body?.dimensions??[]) as {name:string}[],metrics=(body?.metrics??[]) as {name:string}[];
  if(dims.some(d=>d.name==="city"))throw new Error("permission");
  if(method==="checkCompatibility")return {dimensionCompatibilities:dims.map(d=>({dimensionMetadata:{apiName:d.name},compatibility:"COMPATIBLE"})),metricCompatibilities:metrics.map(m=>({metricMetadata:{apiName:m.name},compatibility:"COMPATIBLE"}))};
  return {metricHeaders:metrics,metadata:{timeZone:"Asia/Shanghai"}};
 };
 const result=await reporting.getDashboard(reporting.normalizeQuery(),api);
 expect(result).toHaveLength(14);expect(result.find(s=>s.id==="geo")).toHaveProperty("error");expect(result.find(s=>s.id==="commerce")?.report).toMatchObject({rows:[],rowCount:0});
});
it("uses the realtime subset without historical date ranges or core compatibility",async()=>{
 const calls:Array<[string,Record<string,unknown>|undefined]>=[];
 await reporting.realtime(async(method,body)=>{calls.push([method,body]);return {metricHeaders:[{name:"activeUsers"}],rowCount:0};});
 expect(calls).toHaveLength(1);expect(calls[0][0]).toBe("runRealtimeReport");expect(calls[0][1]).not.toHaveProperty("dateRanges");expect(calls[0][1]).toMatchObject({minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}]});
});

it("executes a valid comparison as two independent date ranges",async()=>{
 const calls:Array<[string,Record<string,unknown>|undefined]>=[];
 const api=async(method:string,body?:Record<string,unknown>)=>{calls.push([method,body]);if(method==="metadata")return {dimensions:[{apiName:"country"}],metrics:[{apiName:"sessions"}]};if(method==="checkCompatibility")return {dimensionCompatibilities:[],metricCompatibilities:[{metricMetadata:{apiName:"sessions"},compatibility:"COMPATIBLE"}]};return {metricHeaders:[{name:"sessions"}],rows:[],rowCount:0,metadata:{timeZone:"Asia/Shanghai"}};};
 const out=await reporting.explore(reporting.normalizeQuery({start:"2026-11-01",end:"2026-11-07",compare:"1"}),[],["sessions"],api);
 expect(calls.filter(c=>c[0]==="runReport")).toHaveLength(2);expect(calls[2][1]?.dateRanges).toEqual([{startDate:"2026-11-01",endDate:"2026-11-07"}]);expect(calls[3][1]?.dateRanges).toEqual([{startDate:"2026-10-25",endDate:"2026-10-31"}]);expect(out.compare?.rowCount).toBe(0);
});
it("retains requested metric headers when Google omits headers from an empty report",()=>{
 expect(reporting.parseReport({metadata:{timeZone:"Asia/Shanghai"}},["sessions"])).toMatchObject({headers:["sessions"],rows:[],rowCount:0});
});
it("sanitizes only dimensions and preserves counts, dates and rate decimals",()=>{
 const out=reporting.parseReport({dimensionHeaders:[{name:"dateHourMinute"},{name:"pagePath"}],metricHeaders:[{name:"eventCount"},{name:"engagementRate"}],rows:[{dimensionValues:[{value:"202611221234"},{value:"/en?email=private@example.com"}],metricValues:[{value:"12345678"},{value:"0.5623"}]}]});
 expect(out.rows).toEqual([["202611221234","/en","12345678","0.5623"]]);
});
it("batches seven fixed overview reports in two Google calls while retaining selected range and activity order",async()=>{
 const batches:Array<{requests:Array<{dimensions:Array<{name:string}>;metrics:Array<{name:string}>;dateRanges:unknown;orderBys:unknown}>}>=[];
 const api=async(method:string,body?:Record<string,unknown>)=>{
  if(method==="metadata")return {dimensions:reporting.sections.flatMap(s=>s.dimensions).map(apiName=>({apiName})),metrics:reporting.sections.flatMap(s=>s.metrics).map(apiName=>({apiName}))};
  const selected=body as {dimensions:Array<{name:string}>;metrics:Array<{name:string}>};
  if(method==="checkCompatibility")return {dimensionCompatibilities:selected.dimensions.map(d=>({dimensionMetadata:{apiName:d.name},compatibility:"COMPATIBLE"})),metricCompatibilities:selected.metrics.map(m=>({metricMetadata:{apiName:m.name},compatibility:"COMPATIBLE"}))};
  if(method!=="batchRunReports")throw new Error("unexpected single report");
  const batch=body as unknown as typeof batches[number];batches.push(batch);
  return {reports:batch.requests.map(r=>({dimensionHeaders:r.dimensions,metricHeaders:r.metrics,rows:[],rowCount:0,metadata:{timeZone:"Asia/Shanghai"}}))};
 };
 const out=await reporting.getOverviewDashboard(reporting.normalizeQuery({start:"2026-11-01",end:"2026-11-07"}),api);
 expect(batches.map(b=>b.requests.length)).toEqual([5,2]);expect(out).toHaveLength(7);
 expect(batches.flatMap(b=>b.requests).every(r=>r.dateRanges)).toBe(true);
 expect(batches[0].requests[2].orderBys).toEqual([{dimension:{dimensionName:"dateHourMinute"},desc:true}]);
});
it("orders aggregate activity newest first rather than by traffic",async()=>{
 const calls:Array<Record<string,unknown>|undefined>=[];
 const api=async(method:string,body?:Record<string,unknown>)=>{calls.push(body);if(method==="metadata")return {dimensions:[{apiName:"dateHourMinute"}],metrics:[{apiName:"screenPageViews"},{apiName:"eventCount"},{apiName:"totalUsers"}]};if(method==="checkCompatibility")return {dimensionCompatibilities:[{dimensionMetadata:{apiName:"dateHourMinute"},compatibility:"COMPATIBLE"}],metricCompatibilities:(body?.metrics as {name:string}[]).map(m=>({metricMetadata:{apiName:m.name},compatibility:"COMPATIBLE"}))};return {metricHeaders:[{name:"screenPageViews"}],metadata:{timeZone:"Asia/Shanghai"}}};
 await reporting.getSectionReport("activity",reporting.normalizeQuery(),api);
 expect(calls.find(b=>b?.dateRanges)?.orderBys).toEqual([{dimension:{dimensionName:"dateHourMinute"},desc:true}]);
});

it("builds today and yesterday with property timezone and bounded realtime freshness", async () => {
 const calls: Array<[string, Record<string, unknown> | undefined]> = [];
 const api = async (method: string, body?: Record<string, unknown>) => { calls.push([method, body]); if (method === "property") return { timeZone: "Asia/Shanghai" }; if (method === "metadata") return { dimensions: [], metrics: [{ apiName: "totalUsers" }] }; if (method === "checkCompatibility") return { metricCompatibilities: [{ metricMetadata: { apiName: "totalUsers" }, compatibility: "COMPATIBLE" }] }; return { metricHeaders: [{ name: "totalUsers" }], rows: [{ metricValues: [{ value: "7" }] }], metadata: { timeZone: "Asia/Shanghai" } }; };
 const result = await reporting.getTodayReport(api);
 expect(result.timezone).toBe("Asia/Shanghai"); expect(result.source).toBe("historical_today"); expect(result.report.rows).toEqual([["7"]]);
 expect(calls.filter(([m]) => m === "runRealtimeReport")).toHaveLength(0);
});

it("separates Shanghai today at UTC midnight boundary and rejects tomorrow",()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-22T17:00:00Z"));
 try{expect(reporting.normalizeQuery({start:"2026-11-23",end:"2026-11-23"})).toMatchObject({start:"2026-11-23"});expect(()=>reporting.normalizeQuery({start:"2026-11-24",end:"2026-11-24"})).toThrow();}finally{vi.useRealTimers();}
});
it("fetches deduplicated realtime totals without adding minute or country rows",async()=>{
 const api=vi.fn().mockResolvedValue({metricHeaders:[{name:"activeUsers"},{name:"eventCount"}],rows:[{metricValues:[{value:"4"},{value:"16"}]}]});
 const out=await reporting.realtimeTotals(api);expect(out.rows).toEqual([["4","16"]]);expect(api).toHaveBeenCalledWith("runRealtimeReport",expect.not.objectContaining({dimensions:expect.anything()}));
});
it("today uses explicit property calendar date and permits Data API despite Admin permission failure",async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-22T17:00:00Z"));
 const api=vi.fn(async(method:string)=>{if(method==="property")throw new Error("permission");return {metricHeaders:[{name:"totalUsers"}],metadata:{timeZone:"Asia/Shanghai"},rows:[]};});
 try{const out=await reporting.getTodayReport(api);expect(out.date).toBe("2026-11-23");expect(out.report.rows).toEqual([]);expect(api).toHaveBeenCalledWith("runReport",expect.objectContaining({dateRanges:[{startDate:"2026-11-23",endDate:"2026-11-23"}]}));}finally{vi.useRealTimers();}
});
