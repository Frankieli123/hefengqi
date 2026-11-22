import { describe, expect, it, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { getBigQueryActivity } from "./bigquery-activity";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

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
});
