// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { createHash, generateKeyPairSync } from "node:crypto";
import { getBigQueryActivity, productionQuery } from "./bigquery-activity";

const credentialRead = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async original => ({ ...await original<typeof import("node:fs/promises")>(), readFile: credentialRead }));
const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); credentialRead.mockReset(); });
function transport(handler: (url: string, init: RequestInit) => unknown) {
  vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "/synthetic-test-service-account.json");
  credentialRead.mockResolvedValue(JSON.stringify({ type: "service_account", client_email: "test@example.invalid", private_key: privateKey, token_uri: "https://oauth2.googleapis.com/token" }));
  let tokens = 0;
  const mock = vi.fn(async (url: string, init: RequestInit = {}) => new Response(JSON.stringify(
    url.includes("oauth2.googleapis.com") ? { access_token: `token${++tokens}` } : await handler(url, init)
  ), { status: 200 }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

const hash = (user: string, session: string) => createHash("sha256").update(`${user}:${session}`).digest("hex").slice(0, 12);
const event = (name: string, timestamp: string, user = "private-user", session = "123") => ({
  event_time: timestamp, event_name: name, user_pseudo_id: user, session_id: session,
  page_location: "https://example.test/a?secret=x", page_title: "Page", country: "US", region: "CA", city: "SF", device: "desktop", browser: "Chrome", os: "Linux", source: "newsletter", medium: "email",
});
const response = (rows: unknown[] = []) => ({ schema: { fields: ["event_timestamp", "event_name", "user_pseudo_id", "session_id", "event_params", "geo", "device", "traffic"].map(name => ({ name })) }, rows });

describe("getBigQueryActivity", () => {
  it("prefers daily tables, binds dates and returns anonymized recent activity", async () => {
    const calls: string[] = [];
    const api = async (sql: string) => {
      calls.push(sql);
      if (sql.includes("__TABLES__")) return { rows: [{ table_id: "events_20261122" }, { table_id: "events_intraday_20261122" }] };
      return response([event("page_view", "2026-11-22T10:00:00Z"), event("scroll", "2026-11-22T10:01:00Z")]);
    };
    const result = await getBigQueryActivity({ start: "2026-11-22", end: "2026-11-22", session: hash("private-user", "123") }, api);
    expect(calls[1]).toContain("events_20261122");
    expect(calls[1]).not.toContain("events_intraday_20261122");
    expect(calls[1]).not.toContain("_TABLE_SUFFIX");
    expect(result.status).toBe("ready");
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({ id: hash("private-user", "123"), country: "US", source: "newsletter", medium: "email", pageViews: 1, eventCount: 2 });
    expect(JSON.stringify(result.sessions[0])).not.toContain("private-user");
    expect(result.selected?.events.map(e => e.name)).toEqual(["page_view", "scroll"]);
  });

  it("uses intraday only when daily is absent and does not duplicate tables", async () => {
    const calls: string[] = [];
    const result = await getBigQueryActivity({ start: "2026-11-22", end: "2026-11-22" }, async sql => {
      calls.push(sql);
      return sql.includes("__TABLES__") ? { rows: [{ table_id: "events_intraday_20261122" }] } : response([]);
    });
    expect(result.status).toBe("ready");
    expect(calls[1]).toContain("events_intraday_20261122");
    expect(calls[1]).not.toContain("UNION ALL");
  });

  it("returns waiting when no tables exist and unavailable for permission errors", async () => {
    const waiting = await getBigQueryActivity({ start: "2026-11-22", end: "2026-11-22" }, async (sql) => sql.includes("INFORMATION_SCHEMA") ? { rows: [] } : { rows: [] });
    expect(waiting).toMatchObject({ status: "waiting", sessions: [] });
    const unavailable = await getBigQueryActivity({ start: "2026-11-22", end: "2026-11-22" }, async () => { throw new Error("permission denied"); });
    expect(unavailable).toMatchObject({ status: "unavailable", sessions: [] });
  });

  it("rejects invalid dates and identifiers before querying", async () => {
    const api = vi.fn();
    const invalid = await getBigQueryActivity({ start: "2026-02-30", end: "2026-03-01" }, api);
    expect(invalid.status).toBe("unavailable"); expect(api).not.toHaveBeenCalled();
    vi.stubEnv("BIGQUERY_DATASET", "bad-name; DROP TABLE x");
    expect((await getBigQueryActivity({ start: "2026-11-22", end: "2026-11-22" }, api)).status).toBe("unavailable");
    expect(api).not.toHaveBeenCalled();
  });
  it("parses real BigQuery REST schema and f-row values",async()=>{
   const e=event("page_view","2026-11-22T10:00:00Z"),names=Object.keys(e);
   const result=await getBigQueryActivity({start:"2026-11-22",end:"2026-11-22"},async sql=>sql.includes("__TABLES__")?{schema:{fields:[{name:"table_id"}]},rows:[{f:[{v:"events_intraday_20261122"}]}]}:{schema:{fields:names.map(name=>({name}))},rows:[{f:Object.values(e).map(v=>({v}))}]});
   expect(result.status).toBe("ready");expect(result.sessions[0]).toMatchObject({country:"US",device:"desktop",pageViews:1,landingPage:"https://example.test/a?secret=x"});
  });

  it("polls via getQueryResults and retains schema across pages with one token", async () => {
    vi.useFakeTimers();
    const schema = { fields: [{ name: "event_time" }] };
    let calls = 0;
    const fetchMock = transport((url, init) => {
      if (init.method === "POST") return { jobComplete: false, jobReference: { projectId: "query-project", jobId: "job/1", location: "EU" } };
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/bigquery/v2/projects/query-project/queries/job%2F1");
      expect(parsed.searchParams.get("location")).toBe("EU");
      if (++calls === 1) return { jobComplete: true, schema, rows: [{ f: [{ v: "one" }] }], pageToken: "next +/=" };
      expect(parsed.searchParams.get("pageToken")).toBe("next +/=");
      return { jobComplete: true, rows: [{ f: [{ v: "two" }] }] };
    });
    const check = expect(productionQuery("SELECT 1")).resolves.toMatchObject({ schema, rows: [{ f: [{ v: "one" }] }, { f: [{ v: "two" }] }] });
    void check.catch(() => {});
    await vi.runAllTimersAsync();
    await check;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refreshes once per query with a fresh signal and reuses the refreshed token for pages", async () => {
    let attempts = 0;
    const signals: AbortSignal[] = [];
    const fetchMock = transport((_url, init) => {
      signals.push(init.signal as AbortSignal);
      expect((init.headers as Record<string, string>).authorization).toBe(`Bearer token${attempts === 0 ? 1 : 2}`);
      if (++attempts === 1) return { unauthorized: true };
      return attempts === 2 ? { jobComplete: true, jobReference: { jobId: "j" }, pageToken: "p", rows: [] } : { jobComplete: true, rows: [] };
    });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init = {}) => {
      const result = await base(url, init);
      return attempts === 1 && !url.includes("oauth2.googleapis.com") ? new Response("{}", { status: 401 }) : result;
    });
    await expect(productionQuery("SELECT 1")).resolves.toMatchObject({ rows: [] });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(signals[0]).not.toBe(signals[1]);
  });
  it("rejects a second 401 without refreshing again", async () => {
    const fetchMock = transport(() => ({}));
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init = {}) => url.includes("oauth2.googleapis.com") ? base(url, init) : new Response("{}", { status: 401 }));
    await expect(productionQuery("SELECT 1")).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each(["poll", "page"])("rejects unbounded %s responses instead of returning partial results", async mode => {
    vi.useFakeTimers();
    const fetchMock = transport(() => ({ jobComplete: mode === "page", jobReference: { jobId: "j" }, ...(mode === "page" ? { pageToken: "forever", rows: [] } : {}) }));
    const check = expect(productionQuery("SELECT 1")).rejects.toThrow(/超时|上限/);
    void check.catch(() => {});
    await vi.runAllTimersAsync();
    await check;
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(202);
  });
  it.each([
    { jobComplete: false },
    { jobComplete: true, pageToken: "p" },
    { jobComplete: true, jobReference: { jobId: "j" }, pageToken: "p" },
  ])("rejects missing job references or errors on later pages: %j", async initial => {
    let calls = 0;
    transport(() => ++calls === 1 ? initial : { jobComplete: true, errors: [{ reason: "invalidQuery" }], rows: [] });
    await expect(productionQuery("SELECT 1")).rejects.toThrow();
  });
  it("enforces a total deadline across result requests", async () => {
    vi.useFakeTimers();
    transport(() => {
      vi.setSystemTime(Date.now() + 120_001);
      return { jobComplete: true, jobReference: { jobId: "j" }, rows: [], pageToken: "p" };
    });
    await expect(productionQuery("SELECT 1")).rejects.toThrow(/超时/);
  });

  it.each([
    ["2026-11-22", "2026-11-22", ["20261122"]],
    ["2026-01-31", "2026-02-02", ["20260131", "20260201", "20260202"]],
    ["2024-02-28", "2024-03-01", ["20240228", "20240229", "20240301"]],
  ] as const)("preserves explicit calendar suffixes %s through %s", async (start, end, suffixes) => {
    const queries: string[] = [];
    await getBigQueryActivity({ start, end }, async sql => {
      queries.push(sql);
      return sql.includes("__TABLES__") ? { rows: [...suffixes.map(suffix => ({ table_id: `events_${suffix}` })), { table_id: "events_20261121" }, { table_id: "events_20261123" }] } : response([]);
    });
    expect([...queries[1]!.matchAll(/FROM `[^`]+\.events_(\d{8})`/g)].map(match => match[1])).toEqual(suffixes);
    expect(queries[1]).toContain("TIMESTAMP_MICROS(event_timestamp)");
  });
  it.each([{ errors: [{ reason: "invalidQuery" }] }, { status: { errorResult: { reason: "invalidQuery" } } }, {}])("rejects error or malformed query completion %j", async raw => {
    transport(() => raw);
    await expect(productionQuery("SELECT 1")).rejects.toThrow();
  });
  it("does not grant another refresh to a later page", async () => {
    let calls = 0;
    const fetchMock = transport(() => ({}));
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init = {}) => {
      if (url.includes("oauth2.googleapis.com")) return base(url, init);
      if (++calls !== 2) return new Response("{}", { status: 401 });
      return new Response(JSON.stringify({ jobComplete: true, jobReference: { jobId: "j" }, pageToken: "p", rows: [] }));
    });
    await expect(productionQuery("SELECT 1")).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("keeps the requested page token while polling an incomplete page", async () => {
    vi.useFakeTimers();
    let calls = 0;
    transport((url, init) => {
      if (init.method === "POST") return { jobComplete: true, jobReference: { jobId: "j" }, pageToken: "second", rows: [{ f: [{ v: "one" }] }] };
      expect(new URL(url).searchParams.get("pageToken")).toBe("second");
      return ++calls === 1 ? { jobComplete: false } : { jobComplete: true, rows: [{ f: [{ v: "two" }] }] };
    });
    const check = expect(productionQuery("SELECT 1")).resolves.toMatchObject({ rows: [{ f: [{ v: "one" }] }, { f: [{ v: "two" }] }] });
    void check.catch(() => {});await vi.runAllTimersAsync();await check;
  });
});
