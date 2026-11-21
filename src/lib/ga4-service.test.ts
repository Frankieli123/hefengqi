import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => { const readFile = vi.fn(); return { readFile, default: { readFile } }; });
import { readFile } from "node:fs/promises";
import { generateKeyPairSync, verify } from "node:crypto";
import { getGa4Overview } from "./ga4-service";
const fetchMock = vi.fn();
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const credentials = { type: "service_account", client_email: "reader@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), token_uri: "https://evil.invalid" };
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubEnv("GA4_PROPERTY_ID", ""); vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", ""); fetchMock.mockReset(); vi.mocked(readFile).mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("GA4 configuration", () => {
 it("reports missing configuration without requests or fabricated metrics", async () => {
  const result = await getGa4Overview();
  expect(result).toMatchObject({ available: false, reason: "not_configured" });
  expect(result).not.toHaveProperty("metrics"); expect(fetchMock).not.toHaveBeenCalled();
 });
});
describe("GA4 read-only reports", () => {
 it("uses signed scoped OAuth and fixed Google URLs with bounded uncached requests", async () => {
  configure(); successFetch();
  const result = await getGa4Overview();
  expect(result).toMatchObject({ available: true, metrics: { users: 12, sessions: 12, pageviews: 12 }, pages: [{ label: "example", value: 12 }], timezone: "Asia/Shanghai" });
  expect(fetchMock).toHaveBeenCalledTimes(5);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://oauth2.googleapis.com/token");
  const assertion = new URLSearchParams(init.body).get("assertion")!;
  const [header, payload, signature] = assertion.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  expect(claims).toMatchObject({ scope: "https://www.googleapis.com/auth/analytics.readonly", aud: url });
  expect(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  for (const [reportUrl, request] of fetchMock.mock.calls.slice(1)) {
   expect(reportUrl).toBe("https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport");
   expect(request.cache).toBe("no-store"); expect(request.redirect).toBe("error"); expect(request.signal).toBeDefined();
   expect(JSON.parse(request.body).dateRanges).toEqual([{ startDate: "28daysAgo", endDate: "yesterday" }]);
  }
 });
 it("rejects measurement IDs or arbitrary URL-like properties without requests", async () => {
  configure(); vi.stubEnv("GA4_PROPERTY_ID", "G-1GLJE63BSE");
  expect(await getGa4Overview()).toEqual({ available: false, reason: "invalid_config" });
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("does not leak permission error bodies or secrets", async () => {
  configure(); successFetch(); fetchMock.mockImplementationOnce(async () => Response.json({ access_token: "private-token" }));
  fetchMock.mockImplementation(async (url: string) => url.includes("oauth2") ? Response.json({ access_token: "private-token" }) : Response.json({ error: "private-token secret" }, { status: 403 }));
  expect(await getGa4Overview()).toEqual({ available: false, reason: "permission_denied" });
 });
 it("keeps optional incompatible dimensions unavailable rather than fabricated zeros", async () => {
  configure(); successFetch(); const implementation = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => url.includes("analyticsdata") && JSON.parse(init.body as string).dimensions?.[0].name === "country" ? Response.json({}, { status: 400 }) : implementation(url, init));
  expect(await getGa4Overview()).toMatchObject({ available: true, countries: null });
 });
 it("treats network errors and malformed responses as unavailable", async () => {
  configure(); fetchMock.mockRejectedValue(new Error("private secret"));
  expect(await getGa4Overview()).toEqual({ available: false, reason: "unavailable" });
  fetchMock.mockResolvedValue(Response.json({}));
  expect(await getGa4Overview()).toEqual({ available: false, reason: "unavailable" });
 });
 it("does not turn malformed successful report JSON into zero traffic", async () => {
  configure(); successFetch();
  fetchMock.mockImplementation(async (url: string) => url.includes("oauth2") ? Response.json({ access_token: "private-token" }) : Response.json({}));
  expect(await getGa4Overview()).toEqual({ available: false, reason: "unavailable" });
 });
 it("bounds a stalled Google request and reports timeout without secrets", async () => {
  configure(); vi.useFakeTimers();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
   const controller = new AbortController(); setTimeout(() => controller.abort(), ms); return controller.signal;
  });
  fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("timeout private-token")))));
  try {
   const result = getGa4Overview();
   await vi.advanceTimersByTimeAsync(8000);
   expect(await result).toEqual({ available: false, reason: "unavailable" });
   expect(timeout).toHaveBeenCalledWith(8000);
  } finally { timeout.mockRestore(); vi.useRealTimers(); }
 });
 it("does not fetch with an unreadable credential file", async () => {
  configure(); vi.mocked(readFile).mockRejectedValue(new Error("secret path"));
  expect(await getGa4Overview()).toEqual({ available: false, reason: "invalid_config" });
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("preserves genuine empty reports as zero totals and empty tables", async () => {
  configure(); successFetch(); const implementation = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => url.includes("oauth2") ? implementation(url, init) : Response.json({ ...report(JSON.parse(init.body as string).metrics.map((m: { name: string }) => m.name), []), rows: [] }));
  expect(await getGa4Overview()).toMatchObject({ available: true, metrics: { users: 0, sessions: 0, pageviews: 0 }, pages: [] });
 });
});
function configure() {
 vi.stubEnv("GA4_PROPERTY_ID", "123456789"); vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "/private/service-account.json");
 vi.mocked(readFile).mockResolvedValue(JSON.stringify(credentials));
}
export function report(metrics: string[], values: string[], dimension?: string) {
 return { metricHeaders: metrics.map(name => ({ name })), ...(dimension ? { dimensionHeaders: [{ name: dimension }] } : {}), rows: [{ metricValues: values.map(value => ({ value })), ...(dimension ? { dimensionValues: [{ value: "example" }] } : {}) }], metadata: { timeZone: "Asia/Shanghai" } };
}
export function successFetch() {
 fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
  if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "private-token", expires_in: 3600 });
  const body = JSON.parse(init.body as string);
  const names = body.metrics.map((m: { name: string }) => m.name);
  return Response.json(report(names, names.map(() => "12"), body.dimensions?.[0].name));
 });
}
export { fetchMock, publicKey, verify };
