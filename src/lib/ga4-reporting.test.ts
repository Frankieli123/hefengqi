import { expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import * as reporting from "./ga4-reporting";
beforeEach(() => vi.unstubAllEnvs());
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

it("isolates failed dashboard sections while preserving genuine empty successes",async()=>{
 const api=async(method:string,body?:Record<string,unknown>)=>{
  if(method==="metadata")return {dimensions:reporting.sections.flatMap(s=>s.dimensions).map(apiName=>({apiName})),metrics:reporting.sections.flatMap(s=>s.metrics).map(apiName=>({apiName}))};
  const dims=(body?.dimensions??[]) as {name:string}[],metrics=(body?.metrics??[]) as {name:string}[];
  if(dims.some(d=>d.name==="city"))throw new Error("permission");
  if(method==="checkCompatibility")return {dimensionCompatibilities:dims.map(d=>({dimensionMetadata:{apiName:d.name},compatibility:"COMPATIBLE"})),metricCompatibilities:metrics.map(m=>({metricMetadata:{apiName:m.name},compatibility:"COMPATIBLE"}))};
  return {metricHeaders:metrics,metadata:{timeZone:"Asia/Shanghai"}};
 };
 const result=await reporting.getDashboard(reporting.normalizeQuery(),api);
 expect(result).toHaveLength(13);expect(result.find(s=>s.id==="geo")).toHaveProperty("error");expect(result.find(s=>s.id==="commerce")?.report).toMatchObject({rows:[],rowCount:0});
});
it("uses the realtime subset without historical date ranges or core compatibility",async()=>{
 const calls:Array<[string,Record<string,unknown>|undefined]>=[];
 await reporting.realtime(async(method,body)=>{calls.push([method,body]);return {metricHeaders:[{name:"activeUsers"}],rowCount:0};});
 expect(calls).toHaveLength(1);expect(calls[0][0]).toBe("runRealtimeReport");expect(calls[0][1]).not.toHaveProperty("dateRanges");expect(calls[0][1]).toMatchObject({minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}]});
});
