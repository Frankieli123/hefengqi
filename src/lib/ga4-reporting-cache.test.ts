import {expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({api:vi.fn()}));
vi.mock("./ga4-service",()=>({ga4ReadApi:mocks.api}));
import {boundedApi} from "./ga4-reporting";
it("deduplicates inflight work, caps concurrency at two, caches successes and retries failures",async()=>{
 let active=0,max=0;const release:Array<()=>void>=[];
 mocks.api.mockImplementation(async()=>{active++;max=Math.max(max,active);await new Promise<void>(r=>release.push(r));active--;return {ok:true};});
 const first=boundedApi("metadata",{test:1}),same=boundedApi("metadata",{test:1}),second=boundedApi("metadata",{test:2}),third=boundedApi("metadata",{test:3});
 await Promise.resolve();expect(mocks.api).toHaveBeenCalledTimes(2);release.shift()!();await first;await same;await Promise.resolve();expect(mocks.api).toHaveBeenCalledTimes(3);
 while(release.length)release.shift()!();await Promise.all([second,third]);expect(max).toBe(2);
 await boundedApi("metadata",{test:1});expect(mocks.api).toHaveBeenCalledTimes(3);
 mocks.api.mockRejectedValueOnce(new Error("offline"));await expect(boundedApi("metadata",{test:4})).rejects.toThrow("offline");
 mocks.api.mockResolvedValue({ok:true});await expect(boundedApi("metadata",{test:4})).resolves.toEqual({ok:true});
});
