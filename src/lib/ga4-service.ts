import "server-only";
import { readFile } from "node:fs/promises";
import { createPrivateKey, sign } from "node:crypto";
import { z } from "zod";

const credentialsSchema = z.object({ type: z.literal("service_account"), client_email: z.string().email(), private_key: z.string().min(1) });
const reportSchema = z.object({
  metricHeaders: z.array(z.object({ name: z.string() })).min(1).optional(),
  rows: z.array(z.object({
    dimensionValues: z.array(z.object({ value: z.string() })).optional(),
    metricValues: z.array(z.object({ value: z.string().regex(/^[0-9]+$/) })),
  })).optional(),
  metadata: z.object({ timeZone: z.string().optional() }).optional(),
}).refine(value => Boolean(value.metricHeaders?.length || value.metadata?.timeZone));
const tokenUrl = "https://oauth2.googleapis.com/token";
const scope = "https://www.googleapis.com/auth/analytics.readonly";
class Ga4RequestError extends Error {
  constructor(readonly reason: "permission_denied" | "invalid_argument" | "resource_exhausted" | "unavailable") { super(reason); }
}
async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Ga4RequestError(response.status === 401 || response.status === 403 ? "permission_denied" : response.status === 400 ? "invalid_argument" : response.status === 429 ? "resource_exhausted" : "unavailable");
  return response.json() as Promise<unknown>;
}
function metric(value: string | undefined) {
  const number = Number(value);
  if (value === undefined || !Number.isSafeInteger(number) || number < 0) throw new Error("invalid_metric");
  return number;
}

export type Ga4Unavailable = { available: false; reason: "not_configured" | "invalid_config" | "permission_denied" | "unavailable" };
export type Ga4Row = { label: string; value: number };
export type Ga4Overview = Ga4Unavailable | {
  available: true;
  metrics: { users: number; sessions: number; pageviews: number };
  pages: Ga4Row[] | null;
  sources: Ga4Row[] | null;
  countries: Ga4Row[] | null;
  timezone: string | null;
};

export async function getGa4Overview(): Promise<Ga4Overview> {
  const property = process.env.GA4_PROPERTY_ID;
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!property || !credentialPath) return { available: false, reason: "not_configured" };
  // A measurement ID or a stream ID is not a confirmed GA4 property ID.
  if (!/^[1-9][0-9]{0,19}$/.test(property) || !credentialPath.startsWith("/")) return { available: false, reason: "invalid_config" };
  let credentials: z.infer<typeof credentialsSchema>;
  let key: ReturnType<typeof createPrivateKey>;
  try {
    credentials = credentialsSchema.parse(JSON.parse(await readFile(credentialPath, "utf8")));
    key = createPrivateKey(credentials.private_key);
    if (key.asymmetricKeyType !== "rsa") return { available: false, reason: "invalid_config" };
  } catch { return { available: false, reason: "invalid_config" }; }
  try {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: credentials.client_email, scope, aud: tokenUrl, iat: now, exp: now + 300 })}`;
    const assertion = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url")}`;
    const token = z.object({ access_token: z.string().min(1) }).parse(await requestJson(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() }));
    const runReport = async (metrics: string[], dimension?: string) => reportSchema.parse(await requestJson(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
      method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }], metrics: metrics.map(name => ({ name })), ...(dimension ? { dimensions: [{ name: dimension }], orderBys: [{ metric: { metricName: metrics[0] }, desc: true }], limit: "10" } : {}) }),
    }));
    const summary = await runReport(["totalUsers", "sessions", "screenPageViews"]);
    const values = summary.rows?.[0]?.metricValues;
    const totals = values ? values.map(item => metric(item.value)) : [0, 0, 0];
    if (totals.length !== 3) throw new Error("invalid_metrics");
    const breakdown = async (dimension: string, metricName: string): Promise<Ga4Row[] | null> => {
      try {
        const report = await runReport([metricName], dimension);
        return (report.rows ?? []).map(row => {
          const label = row.dimensionValues?.[0]?.value;
          if (label === undefined) throw new Error("invalid_dimension");
          return { label, value: metric(row.metricValues[0]?.value) };
        });
      } catch { return null; }
    };
    const [pages, sources, countries] = await Promise.all([breakdown("pagePath", "screenPageViews"), breakdown("sessionSourceMedium", "sessions"), breakdown("country", "totalUsers")]);
    return { available: true, metrics: { users: totals[0], sessions: totals[1], pageviews: totals[2] }, pages, sources, countries, timezone: summary.metadata?.timeZone ?? null };
  } catch (error) {
    // Never return Google response bodies, credentials, file paths, or token errors.
    return { available: false, reason: error instanceof Ga4RequestError ? (error.reason === "permission_denied" ? "permission_denied" : "unavailable") : "unavailable" };
  }
}

// Read-only transport shared by the expanded reports; Google endpoints never come from user input.
let expandedToken: {key:string;value:string;expires:number}|undefined;
let expandedTokenPending: {key:string;promise:Promise<string>}|undefined;
async function expandedAccessToken() {
 const property=process.env.GA4_PROPERTY_ID, path=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if(!property||!path||!path.startsWith("/")||!/^[1-9][0-9]{0,19}$/.test(property)) throw new Error("GA4 配置不可用");
 const cacheKey=property+":"+path;
 if(expandedToken?.key===cacheKey&&expandedToken.expires>Date.now()) return expandedToken.value;
 if(expandedTokenPending?.key===cacheKey) return expandedTokenPending.promise;
 expandedTokenPending={key:cacheKey,promise:(async()=>{
  const credentials=credentialsSchema.parse(JSON.parse(await readFile(path,"utf8")));
  const key=createPrivateKey(credentials.private_key);if(key.asymmetricKeyType!=="rsa") throw new Error("invalid_config");
  const now=Math.floor(Date.now()/1000), encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned=`${encode({alg:"RS256",typ:"JWT"})}.${encode({iss:credentials.client_email,scope,aud:tokenUrl,iat:now,exp:now+300})}`;
  const assertion=`${unsigned}.${sign("RSA-SHA256",Buffer.from(unsigned),key).toString("base64url")}`;
  const token=z.object({access_token:z.string().min(1),expires_in:z.number().optional()}).parse(await requestJson(tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}).toString()}));
  const lifetime=Math.max(0,Math.min(300,token.expires_in??3600)-60);expandedToken={key:cacheKey,value:token.access_token,expires:Date.now()+lifetime*1000};return token.access_token;
 })()};
 try{return await expandedTokenPending.promise;}finally{if(expandedTokenPending?.key===cacheKey)expandedTokenPending=undefined;}
}
export async function ga4ReadApi(method:string,body?:Record<string,unknown>):Promise<unknown> {
 const token=await expandedAccessToken(), property=process.env.GA4_PROPERTY_ID!;
 const dataMethods=["metadata","checkCompatibility","runReport","runRealtimeReport","batchRunReports"];
 const adminMethods=["property","dataStreams","customDimensions","customMetrics","keyEvents","dataRetentionSettings","enhancedMeasurementSettings"];
 if(!dataMethods.includes(method)&&!adminMethods.includes(method)) throw new Error("unsupported");
 const adminPaths:Record<string,string>={property:"",dataStreams:"dataStreams",customDimensions:"customDimensions",customMetrics:"customMetrics",keyEvents:"keyEvents",dataRetentionSettings:"dataRetentionSettings",enhancedMeasurementSettings:"enhancedMeasurementSettings"};
 const url=dataMethods.includes(method)?`https://analyticsdata.googleapis.com/v1beta/properties/${property}${method==="metadata"?"/metadata":":"+method}`:`https://analyticsadmin.googleapis.com/v1beta/properties/${property}${adminPaths[method]?"/"+adminPaths[method]:""}`;
 try{return await requestJson(url,{method:body?"POST":"GET",headers:{Authorization: `Bearer ${token}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});}catch(error){
  if(!(error instanceof Ga4RequestError))throw error;
  const messages={permission_denied:"GA4 API 读取权限不足",invalid_argument:"GA4 API 拒绝了请求字段或参数",resource_exhausted:"GA4 API 配额已耗尽，请稍后重试",unavailable:"Google Analytics API 暂时不可用"};
  throw new Error(messages[error.reason]);
 }
}
