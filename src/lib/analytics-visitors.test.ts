import { afterEach, beforeEach, describe,it,expect,vi } from "vitest";
vi.mock("server-only",()=>({}));
const {query,region,city,geo}=vi.hoisted(()=>({geo:vi.fn(),query:vi.fn(),region:vi.fn(async(name:string)=>`region:${name}`),city:vi.fn(async(name:string)=>`city:${name}`)}));
vi.mock("./analytics-umami-geo",()=>({lookupSessionGeography:geo}));
vi.mock("@/lib/db",()=>({db:{$queryRaw:query}}));
vi.mock("@/lib/env",()=>({env:{UMAMI_TIMEZONE:"Asia/Shanghai"}}));
vi.mock("@/lib/geo-names",()=>({resolveRegionNameAsync:region,resolveCityNameAsync:city}));
import { fetchVisitorPageViews, visitorPageQuery, CRAWLER_PATTERN } from "./analytics-visitors";
const visitor=()=>({id:"example",ipAddress:"历史脱敏记录",country:"--",region:null as string|null,city:null as string|null,geoStatus:"unavailable",visitCount:3,pages:[{path:"/en",count:3,lastVisitedAt:"2026-10-31T04:00:00Z"}],locales:["en"],referrers:[],firstVisitedAt:"2026-10-30T04:00:00Z",lastVisitedAt:"2026-10-31T04:00:00Z"});
beforeEach(()=>{vi.clearAllMocks();geo.mockResolvedValue([]);});
afterEach(()=>{vi.unstubAllGlobals();});
describe("database visitor group pages",()=>{
 it("uses grouped database pagination and retains unknown historical visitors without Umami requests",async()=>{
  const network=vi.fn();vi.stubGlobal("fetch",network);
  query.mockResolvedValue([{totalCount:51n,totalVisits:103n,hiddenCrawlerVisits:2n,page:2,visitors:[visitor()]}]);
  const result=await fetchVisitorPageViews({page:2});
  expect(result.meta).toMatchObject({page:2,totalCount:51,totalPages:2,totalVisits:103,hiddenCrawlerVisits:2,countingPolicy:expect.stringContaining("历史缺失")});
  expect(result.rows[0]).toMatchObject({visitCount:3,geoStatus:"unavailable",region:"—",city:"—",pages:[{path:"/en",count:3,lastVisitedAt:"2026-10-31 12:00:00"}]});
  expect(network).not.toHaveBeenCalled();
  const sql=query.mock.calls[0][0];expect(sql.sql).toContain('GROUP BY "ipHash"');expect(sql.sql).toContain('LIMIT');
 });
 it("resolves each unique page-local geographical name once",async()=>{
  query.mockResolvedValue([{totalCount:2n,totalVisits:6n,hiddenCrawlerVisits:0n,page:1,visitors:[{...visitor(),region:"Shanghai",city:"Shanghai"},{...visitor(),id:"second",region:"Shanghai",city:"Shanghai"}]}]);
  const result=await fetchVisitorPageViews();
  expect(region).toHaveBeenCalledTimes(1);expect(city).toHaveBeenCalledTimes(1);
  expect(result.rows.map(v=>v.region)).toEqual(["region:Shanghai","region:Shanghai"]);
 });
 it("binds date range, crawler expression and page sizes as SQL parameters",()=>{
  const start=new Date("2026-10-30T00:00:00Z"),end=new Date("2026-10-31T00:00:00Z");
  const sql=visitorPageQuery(start,end,3);
  expect(sql.values).toEqual([CRAWLER_PATTERN,start,end,3,50,50,50]);
  expect(sql.sql).not.toContain(CRAWLER_PATTERN);
  expect(sql.sql).toContain('"createdAt" >= ? AND "createdAt" < ?');
  expect(sql.sql).toContain('ORDER BY last_time DESC, "ipHash" ASC');
 });
 it.each([NaN,Infinity,-Infinity,0,-2,1.9,Number.MAX_VALUE])("normalizes unsafe page %s",async(page)=>{
  query.mockResolvedValue([{totalCount:0n,totalVisits:0n,hiddenCrawlerVisits:0n,page:1,visitors:[]}]);
  await fetchVisitorPageViews({page});
  const actual=query.mock.calls[0][0].values[3];expect(actual).toBe(Number.isFinite(page)?Math.min(2147483647,Math.max(1,Math.floor(page))):1);
 });
 it("propagates database errors rather than reporting false zero traffic",async()=>{
  query.mockRejectedValue(new Error("database unavailable"));
  await expect(fetchVisitorPageViews()).rejects.toThrow("database unavailable");
 });
});

it("fills geography only from the exact saved session IDs in one page batch",async()=>{
 const id="00000000-0000-4000-8000-000000000001";
 query.mockResolvedValue([{totalCount:1n,totalVisits:3n,hiddenCrawlerVisits:0n,page:1,visitors:[{...visitor(),umamiSessionIds:[id]}]}]);
 geo.mockResolvedValue([{session_id:"other",country:"US",region:"CA",city:"Wrong"},{session_id:id,country:"CN",region:"GD",city:"Shenzhen"}]);
 const result=await fetchVisitorPageViews();
 expect(result.rows[0]).toMatchObject({country:"CN",region:"region:GD",city:"city:Shenzhen",geoStatus:"umami",visitCount:3});
 expect(geo).toHaveBeenCalledExactlyOnceWith([id]);
});

it("retains unknown geography for unmatched IDs and does not query without IDs",async()=>{
 query.mockResolvedValue([{totalCount:1n,totalVisits:3n,hiddenCrawlerVisits:0n,page:1,visitors:[visitor()]}]);
 await fetchVisitorPageViews(); expect(geo).not.toHaveBeenCalled();
 query.mockResolvedValue([{totalCount:1n,totalVisits:3n,hiddenCrawlerVisits:0n,page:1,visitors:[{...visitor(),umamiSessionIds:["00000000-0000-4000-8000-000000000001"]}]}]);
 expect((await fetchVisitorPageViews()).rows[0].geoStatus).toBe("unavailable");
});
it("retains local geography when the read-only lookup fails",async()=>{
 query.mockResolvedValue([{totalCount:1n,totalVisits:3n,hiddenCrawlerVisits:0n,page:1,visitors:[{...visitor(),country:"CN",region:"GD",geoStatus:"edgeone",umamiSessionIds:["00000000-0000-4000-8000-000000000001"]}]}]);
 geo.mockRejectedValue(Error("timeout"));
 expect((await fetchVisitorPageViews()).rows[0]).toMatchObject({country:"CN",region:"region:GD",geoStatus:"edgeone"});
});
it("does not expose database session IDs in visitor response",async()=>{
 query.mockResolvedValue([{totalCount:1n,totalVisits:3n,hiddenCrawlerVisits:0n,page:1,visitors:[{...visitor(),umamiSessionIds:["00000000-0000-4000-8000-000000000001"]}]}]);
 expect((await fetchVisitorPageViews()).rows[0]).not.toHaveProperty("umamiSessionIds");
});
