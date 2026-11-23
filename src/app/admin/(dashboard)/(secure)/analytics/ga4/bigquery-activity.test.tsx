import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/ga4-display",()=>({countryCode:()=>"CN",formatCity:(v:string)=>v,formatCountry:(v:string)=>v,formatDevice:(v:string)=>v,formatEventName:(v:string)=>v,formatRegion:(v:string)=>v,formatSource:(v:string)=>v}));
vi.mock("./page.module.css",()=>({default:new Proxy({}, {get:(_,key)=>String(key)})}));
import { BigQueryActivity } from "./bigquery-activity";
const session={id:"abc123def456",startedAt:"2026-11-23T02:00:00Z",lastAt:"2026-11-23T02:03:00Z",country:"China",region:"Guangdong",city:"Shenzhen",source:"",medium:"",device:"desktop",browser:"Chrome",os:"Windows",landingPage:"https://ricewind.com/zh",lastPage:"https://ricewind.com/zh/products",pageViews:2,eventCount:3};
const events=[{timestamp:"2026-11-23T02:00:00Z",name:"page_view",pageLocation:"https://ricewind.com/zh",pageTitle:"Home",country:"China",region:"Guangdong",city:"Shenzhen",device:"desktop"}];
beforeEach(()=>vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({events}),{status:200,headers:{"content-type":"application/json"}}))));
afterEach(()=>{while(document.body.lastChild)document.body.removeChild(document.body.lastChild);vi.unstubAllGlobals();});
it("fetches a session timeline only on click and inserts it directly beneath that session",async()=>{
 const fetchMock=globalThis.fetch as ReturnType<typeof vi.fn>;
 const {container}=render(<BigQueryActivity result={{status:"ready",sessions:[session]}} start="2026-11-23" end="2026-11-23"/>);
 expect(fetchMock).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"时间线"}));
 expect(screen.getByText("正在读取该会话事件…")).toBeTruthy();
 await waitFor(()=>expect(screen.getByText("Home")).toBeTruthy());
 const row=container.querySelector(".bqRow:not(.activityHead)");expect(row?.textContent).toContain("Home");
 expect(fetchMock).toHaveBeenCalledTimes(1);expect(String(fetchMock.mock.calls[0][0])).toContain("session=abc123def456");
});
it("shows inline timeline fetch failure and allows retry",async()=>{
 const fetchMock=globalThis.fetch as ReturnType<typeof vi.fn>;
 fetchMock.mockResolvedValueOnce(new Response("",{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({events}),{status:200,headers:{"content-type":"application/json"}}));
 render(<BigQueryActivity result={{status:"ready",sessions:[session]}} start="2026-11-23" end="2026-11-23"/>);
 fireEvent.click(screen.getByRole("button",{name:"时间线"}));await waitFor(()=>expect(screen.getByText("时间线读取失败，请检查权限或 BigQuery 服务状态。")).toBeTruthy());
 fireEvent.click(screen.getByRole("button",{name:"收起"}));fireEvent.click(screen.getByRole("button",{name:"时间线"}));await waitFor(()=>expect(screen.getByText("Home")).toBeTruthy());expect(fetchMock).toHaveBeenCalledTimes(2);
});
