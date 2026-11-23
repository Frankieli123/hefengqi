import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => { const readFile = vi.fn(); return { readFile, default: { readFile } }; });
import { readFile } from "node:fs/promises";
import { generateKeyPairSync, verify } from "node:crypto";
import { searchAnalyticsQuery } from "./gsc-reporting";
const fetchMock = vi.fn();
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const row = { keys: ["/en"], clicks: 12, impressions: 100, ctr: 0.12, position: 3.5 };
beforeEach(() => {
 vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "/safe/credentials.json"); vi.stubEnv("GSC_SITE_URL", "sc-domain:ricewind.com");
 vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
 vi.mocked(readFile).mockResolvedValue(JSON.stringify({ type: "service_account", client_email: "reader@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), token_uri: "https://evil.invalid" }));
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "test-token" }) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("signs a read-only JWT and sends bounded, uncached paginated search requests", async () => {
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ rows: [row] }) });
 expect(await searchAnalyticsQuery({ startDate: "2026-10-01", endDate: "2026-10-28", dimensions: ["page"], rowLimit: 50, startRow: 100 })).toEqual([row]);
 const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]; expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
 const assertion = new URLSearchParams(tokenInit.body).get("assertion")!; const [header, payload, signature] = assertion.split(".");
 expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({ scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: tokenUrl });
 expect(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url"))).toBe(true);
 const [url, init] = fetchMock.mock.calls[1]; expect(url).toBe("https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aricewind.com/searchAnalytics/query");
 expect(JSON.parse(init.body)).toEqual({ startDate: "2026-10-01", endDate: "2026-10-28", dimensions: ["page"], rowLimit: 50, startRow: 100, type: "web", dataState: "final", aggregationType: "auto" });
 for (const [, options] of fetchMock.mock.calls) { expect(options.signal).toBeDefined(); expect(options.cache).toBe("no-store"); expect(options.redirect).toBe("error"); }
});

it.each([{}, { rows: [] }])("returns empty successful responses without fabricated metrics: %j", async raw => {
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => raw });
 expect(await searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).toEqual([]);
});
it("preserves real zero-valued metrics from successful API responses", async () => {
 const zero = { keys: [], clicks: 0, impressions: 0, ctr: 0, position: 0 };
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ rows: [zero] }) });
 expect(await searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).toEqual([zero]);
});
it.each([400, 401, 403, 500])("throws safe errors for HTTP %i rather than returning empty rows", async status => {
 fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: "secret" }) });
 await expect(searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).rejects.toThrow(status === 401 || status === 403 ? "permission_denied" : "unavailable");
});
it.each([{ startDate: "2026-02-30", endDate: "2026-03-01" }, { startDate: "2026-11-02", endDate: "2026-11-01" }, { startDate: "bad", endDate: "2026-11-01" }, { startDate: "2026-11-01", endDate: "2026-11-02", rowLimit: 25001 }, { startDate: "2026-11-01", endDate: "2026-11-02", startRow: -1 }])("validates input before authentication: %j", async input => {
 await expect(searchAnalyticsQuery(input)).rejects.toThrow("invalid_input"); expect(fetchMock).not.toHaveBeenCalled();
});
it("supports URL-prefix properties using encoded Google site identifiers", async () => {
 vi.stubEnv("GSC_SITE_URL", "https://ricewind.com/");
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
 await searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02", startRow: 25000 });
 expect(fetchMock.mock.calls[1][0]).toContain("sites/https%3A%2F%2Fricewind.com%2F/searchAnalytics/query");
 expect(JSON.parse(fetchMock.mock.calls[1][1].body).startRow).toBe(25000);
});
it("rejects malformed metrics rather than manufacturing zero", async () => {
 fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ rows: [{ keys: [] }] }) });
 await expect(searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).rejects.toThrow("unavailable");
});
it("handles request timeouts as failures", async () => {
 fetchMock.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
 await expect(searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).rejects.toThrow("unavailable");
});

it("fails safely when service account credentials are not configured", async () => {
 vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
 await expect(searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).rejects.toThrow("not_configured");
 expect(fetchMock).not.toHaveBeenCalled();
});
it("does not expose credential parsing errors", async () => {
 vi.mocked(readFile).mockResolvedValue("secret-invalid-json");
 await expect(searchAnalyticsQuery({ startDate: "2026-11-01", endDate: "2026-11-02" })).rejects.toThrow("invalid_config");
 expect(fetchMock).not.toHaveBeenCalled();
});
