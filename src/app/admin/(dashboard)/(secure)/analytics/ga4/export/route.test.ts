import { expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({auth:vi.fn(),explore:vi.fn()}));
vi.mock("@/lib/admin-session",()=>({requireSecureAdmin:mocks.auth}));
vi.mock("@/lib/ga4-reporting",async original=>({...await original<typeof import("@/lib/ga4-reporting")>(),explore:mocks.explore}));
import { GET } from "./route";
it("authorizes export before any GA request",async()=>{mocks.auth.mockRejectedValueOnce(new Error("denied"));await expect(GET(new Request("http://local/admin/analytics/ga4/export"))).rejects.toThrow("denied");expect(mocks.explore).not.toHaveBeenCalled();});
it("exports only bounded escaped page with private no-store headers",async()=>{mocks.auth.mockResolvedValue({});mocks.explore.mockResolvedValue({headers:["pagePath"],rows:[["=cmd(1)"],["/en?secret=one"]],rowCount:400});const response=await GET(new Request("http://local/admin/analytics/ga4/export?start=2026-11-01&end=2026-11-07&dimensions=pagePath&metrics=sessions"));expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("content-disposition")).toContain("ga4-report.csv");const csv=await response.text();expect(csv).toContain("'=cmd(1)");expect(csv).not.toContain("secret");});
it("does not return exception or credential details",async()=>{mocks.explore.mockRejectedValue(new Error("private_key sensitive path"));const response=await GET(new Request("http://local/admin/analytics/ga4/export"));expect(response.status).toBe(400);expect(await response.text()).not.toContain("private_key");});

it("strips hidden countryId column from exported CSV",async()=>{mocks.auth.mockResolvedValue({});mocks.explore.mockResolvedValue({headers:["countryId","country","sessions"],rows:[["CN","China","10"]],rowCount:1});const response=await GET(new Request("http://local/admin/analytics/ga4/export?start=2026-11-01&end=2026-11-07&dimensions=country&metrics=sessions"));const csv=await response.text();expect(csv).not.toContain("countryId");expect(csv).not.toContain("CN");expect(csv).toContain("country");expect(csv).toContain("China");});

it("removes hidden columns in comparison CSV without mutating the reports",async()=>{
 const report={headers:["country","countryId","sessions"],rows:[["China","CN","10"]],rowCount:1,compare:{headers:["country","countryId","sessions"],rows:[["France","FR","7"]],rowCount:1}};
 const before=JSON.stringify(report);mocks.auth.mockResolvedValue({});mocks.explore.mockResolvedValue(report);
 const response=await GET(new Request("http://local/admin/analytics/ga4/export?compare=1"));
 expect(response.status).toBe(200);const csv=await response.text();
 expect(csv).not.toContain("countryId");expect(csv).not.toContain('"CN"');expect(csv).not.toContain('"FR"');
 expect(csv).toContain('"current","China","10"');expect(csv).toContain('"comparison","France","7"');expect(JSON.stringify(report)).toBe(before);
});
