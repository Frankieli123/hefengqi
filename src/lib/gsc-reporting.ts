import "server-only";
import { readFile } from "node:fs/promises";
import { createPrivateKey, sign } from "node:crypto";
import { z } from "zod";

export type GscDimension = "date" | "page" | "query" | "country" | "device" | "searchAppearance";
export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type GscQuery = { startDate: string; endDate: string; dimensions?: GscDimension[]; rowLimit?: number; startRow?: number };
const tokenUrl = "https://oauth2.googleapis.com/token";
const credentialsSchema = z.object({ type: z.literal("service_account"), client_email: z.string().email(), private_key: z.string().min(1) });
const rowsSchema = z.object({ rows: z.array(z.object({ keys: z.array(z.string()).optional(), clicks: z.number().finite().nonnegative(), impressions: z.number().finite().nonnegative(), ctr: z.number().finite().min(0).max(1), position: z.number().finite().nonnegative() })).optional() });
export class GscError extends Error {
 constructor(readonly reason: "invalid_input" | "not_configured" | "invalid_config" | "permission_denied" | "unavailable") { super(reason); }
}
const dateValid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function validateGscDates(startDate: string, endDate: string) {
 if (!dateValid(startDate) || !dateValid(endDate) || startDate > endDate) throw new GscError("invalid_input");
}
export function defaultGscDates(now = new Date()) {
 const california = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
 const day = Date.parse(`${california}T00:00:00Z`);
 return { startDate: new Date(day - 30 * 86400000).toISOString().slice(0, 10), endDate: new Date(day - 3 * 86400000).toISOString().slice(0, 10) };
}
async function requestJson(url: string, init: RequestInit): Promise<unknown> {
 const response = await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
 if (!response.ok) throw new GscError(response.status === 401 || response.status === 403 ? "permission_denied" : "unavailable");
 return response.json();
}
async function serviceAccountToken(): Promise<string> {
 const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if (!path) throw new GscError("not_configured");
 if (!path.startsWith("/")) throw new GscError("invalid_config");
 let credentials: z.infer<typeof credentialsSchema>, key: ReturnType<typeof createPrivateKey>;
 try { credentials = credentialsSchema.parse(JSON.parse(await readFile(path, "utf8"))); key = createPrivateKey(credentials.private_key); if (key.asymmetricKeyType !== "rsa") throw new Error(); }
 catch { throw new GscError("invalid_config"); }
 const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
 const now = Math.floor(Date.now() / 1000);
 const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: credentials.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: tokenUrl, iat: now, exp: now + 300 })}`;
 const assertion = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url")}`;
 return z.object({ access_token: z.string().min(1) }).parse(await requestJson(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString() })).access_token;
}
/** Empty successful responses return []; transport/configuration failures throw, never fabricate zeros. */
export async function searchAnalyticsQuery(input: GscQuery): Promise<GscRow[]> {
 validateGscDates(input.startDate, input.endDate);
 const dimensions = input.dimensions ?? [], rowLimit = input.rowLimit ?? 1000, startRow = input.startRow ?? 0;
 if (!Array.isArray(dimensions) || dimensions.some(d => !["date", "page", "query", "country", "device", "searchAppearance"].includes(d)) || new Set(dimensions).size !== dimensions.length || !Number.isSafeInteger(rowLimit) || rowLimit < 1 || rowLimit > 25000 || !Number.isSafeInteger(startRow) || startRow < 0) throw new GscError("invalid_input");
 const site = process.env.GSC_SITE_URL || "sc-domain:ricewind.com";
 if (!/^sc-domain:[a-zA-Z0-9.-]+$/.test(site) && !/^https?:\/\/[^\s?#]+\/$/.test(site)) throw new GscError("invalid_config");
 try {
  const token = await serviceAccountToken();
  const result = rowsSchema.parse(await requestJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: input.startDate, endDate: input.endDate, dimensions, rowLimit, startRow, type: "web", dataState: "final", aggregationType: "auto" }) }));
  return (result.rows ?? []).map(row => { const keys = row.keys ?? []; if (keys.length !== dimensions.length) throw new GscError("unavailable"); return { ...row, keys }; });
 } catch (error) { throw error instanceof GscError ? error : new GscError("unavailable"); }
}
