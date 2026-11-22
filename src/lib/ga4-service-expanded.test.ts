import {expect,it,vi,beforeEach,afterEach} from "vitest";
import {readFile} from "node:fs/promises";
vi.mock("server-only",()=>({}));
vi.mock("node:fs/promises",()=>{const readFile=vi.fn();return {readFile,default:{readFile}};});
import {generateKeyPairSync} from "node:crypto";
import {ga4ReadApi} from "./ga4-service";
const fetchMock=vi.fn();const {privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
beforeEach(()=>{vi.stubGlobal("fetch",fetchMock);vi.stubEnv("GA4_PROPERTY_ID","565392520");vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS","/private/ga4.json");vi.mocked(readFile).mockResolvedValue(JSON.stringify({type:"service_account",client_email:"reader@example.com",private_key:privateKey.export({type:"pkcs8",format:"pem"}).toString()}));fetchMock.mockReset();});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it("shares one token refresh per credential identity and maps Admin API collection paths",async()=>{
 let resolveToken!:(r:Response)=>void;fetchMock.mockImplementation((url:string)=>url.includes("oauth2")?new Promise<Response>(r=>{resolveToken=r}):Promise.resolve(Response.json({ok:true})));
 const a=ga4ReadApi("property"),b=ga4ReadApi("dataStreams");await Promise.resolve();await Promise.resolve();expect(fetchMock.mock.calls.filter(([url])=>String(url).includes("oauth2")).length).toBe(1);
 resolveToken(Response.json({access_token:"test",expires_in:3600}));await Promise.all([a,b]);
 expect(fetchMock.mock.calls.map(([url])=>url)).toEqual(["https://oauth2.googleapis.com/token","https://analyticsadmin.googleapis.com/v1beta/properties/565392520","https://analyticsadmin.googleapis.com/v1beta/properties/565392520/dataStreams"]);
});
