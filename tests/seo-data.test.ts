// @vitest-environment node
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm, rename, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dateRange, dayBounds, digest, optionsSchema, rowKey, scopeKey, umamiImage, type Options } from "../scripts/seo-data/model";
import { buildGscRequest, collect, buildUmamiRequest } from "../scripts/seo-data/adapters";
import { persist } from "../scripts/seo-data/store";
import { cli } from "../scripts/seo-data/cli";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, rename: vi.fn(original.rename) };
});

const fixture = { source: "gsc", property: "sc-domain:fixture.example", start: "2026-03-07", end: "2026-03-07", dimensions: ["date"], rowLimit: 2, maxPages: 3 };
const now = new Date("2026-11-07T12:00:00Z");
const directories: string[] = [];
async function output() { const directory = await mkdtemp(join(tmpdir(), "seo-fixture-")); directories.push(directory); return directory; }
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const response = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status });
const gscRow = (date = "2026-03-07", clicks = 0) => ({ keys: [date], clicks, impressions: 1, ctr: clicks, position: 1 });
const config = () => optionsSchema.parse(fixture);
const deps = (fetcher: typeof fetch) => ({ fetch: fetcher, token: "fixture-secret", now, sleep: vi.fn(async () => {}), evidenceKind: "fixture" as const });
async function exactFixture(options: Options, payload: { x: string; y: number }[]) {
  const aliases: Record<string, string> = { contact: "inquiry-click", other: "inquiry-success", unrelated: "product-view" };
  const configured = optionsSchema.parse({ ...options, events: options.events.map((event) => aliases[event] ?? event), umamiIdentity: { version: "3.4.0", image: umamiImage }, probeEvent: "product-view", probeDate: "2026-03-01" });
  return collect(configured, deps(vi.fn(async (url) => {
    const params = new URL(String(url)).searchParams;
    const event = params.get("event")!.slice(3);
    if (Number(params.get("startAt")) === dayBounds("2026-03-01", "Asia/Shanghai")[0]) return response(event === "product-view" ? [{ x: event, y: 1 }] : []);
    return response(payload.filter((row) => (aliases[row.x] ?? row.x) === event).map((row) => ({ ...row, x: event })));
  })));
}

describe("SEO data calendar and request semantics (fixtures only)", () => {
  it("rejects invalid dates, reversed ranges and current source days", () => {
    expect(() => dateRange("2026-02-30", "2026-03-01", "America/Los_Angeles", now)).toThrow();
    expect(() => dateRange("2026-03-08", "2026-03-07", "Asia/Shanghai", now)).toThrow();
    expect(() => dateRange("2026-11-07", "2026-11-07", "America/Los_Angeles", now)).toThrow();
    expect(() => dateRange("2026-11-08", "2026-11-08", "Asia/Shanghai", new Date("2026-11-07T16:00:00Z"))).toThrow();
    expect(dateRange("2026-11-05", "2026-11-05", "America/Los_Angeles", new Date("2026-11-07T07:59:59Z"))).toEqual(["2026-11-05"]);
    expect(() => dateRange("2026-11-06", "2026-11-06", "America/Los_Angeles", new Date("2026-11-07T07:59:59Z"))).toThrow();
    expect(dateRange("2026-11-06", "2026-11-06", "America/Los_Angeles", new Date("2026-11-07T08:00:00Z"))).toEqual(["2026-11-06"]);
    expect(() => dateRange("2026-11-07", "2026-11-07", "Asia/Shanghai", new Date("2026-11-07T15:59:59Z"))).toThrow();
    expect(dateRange("2026-11-07", "2026-11-07", "Asia/Shanghai", new Date("2026-11-07T16:00:00Z"))).toEqual(["2026-11-07"]);
  });
  it("handles PT DST 23/25 hour days and China midnight", () => {
    expect(dayBounds("2026-03-08", "America/Los_Angeles")[1] - dayBounds("2026-03-08", "America/Los_Angeles")[0]).toBe(23 * 3600000);
    expect(dayBounds("2026-11-01", "America/Los_Angeles")[1] - dayBounds("2026-11-01", "America/Los_Angeles")[0]).toBe(25 * 3600000);
    expect(new Date(dayBounds("2026-03-08", "Asia/Shanghai")[0]).toISOString()).toBe("2026-03-07T16:00:00.000Z");
  });
  it("computes non-US and half-hour DST calendar boundaries without assuming 24 hours", () => {
    const berlin = dayBounds("2026-03-29", "Europe/Berlin");
    const lordHowe = dayBounds("2026-10-04", "Australia/Lord_Howe");
    expect(berlin[1] - berlin[0]).toBe(23 * 3600000);
    expect(lordHowe[1] - lordHowe[0]).toBe(23.5 * 3600000);
  });
  it("encodes sites, requests final daily data and enforces bounds", () => {
    const request = buildGscRequest(config(), "2026-03-07", 2);
    expect(request.url).toContain("sites/sc-domain%3Afixture.example/searchAnalytics/query");
    expect(request.body).toMatchObject({ dataState: "final", startRow: 2, rowLimit: 2, dimensions: ["date"] });
    expect(() => optionsSchema.parse({ ...fixture, rowLimit: 25001 })).toThrow();
    expect(() => optionsSchema.parse({ ...fixture, dimensions: ["query", "query"] })).toThrow();
  });
  it.each(["http://example.org", "https://user:pass@example.org", "https://example.org/api", "https://example.org/?token=x", "https://127.0.0.1", "https://169.254.169.254", "https://example.org/#x", "https://metadata.google.internal.", "https://[::1]", "https://2130706433", "https://example.org:1234"])("rejects unsafe Umami URL %s", (baseURL) => {
    expect(() => buildUmamiRequest(optionsSchema.parse({ ...fixture, source: "umami", property: "fixture-site", baseURL, events: ["fixture-contact"] }), "2026-03-07")).toThrow();
  });
});

describe("SEO adapters (mock aggregate fixtures, not live)", () => {
  it("keeps measured zero distinct from empty rows and unconfigured", async () => {
    const zero = await collect(config(), deps(vi.fn(async () => response({ rows: [gscRow()] }))));
    expect(zero.observations[0].metrics.clicks).toBe(0);
    expect(zero.days[0].status).toBe("measured");
    const empty = await collect(config(), deps(vi.fn(async () => response({}))));
    expect(empty.days[0].status).toBe("unavailable");
    expect(empty.reason).toBe("gsc_final_unconfirmed");
    expect(empty.observations).toEqual([]);
    const fetcher = vi.fn();
    expect((await collect(config(), { ...deps(fetcher), token: undefined })).status).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("paginates, sorts stable rows, retries 429/5xx, never retries 403", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({}, 429)).mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({ rows: [{ ...gscRow(), keys: ["b"] }, { ...gscRow(), keys: ["a"] }] }))
      .mockResolvedValueOnce(response({ rows: [] }));
    const run = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query"] }), deps(fetcher));
    expect(run.status).toBe("complete");
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(run.observations.map((row) => row.dimensions.query)).toEqual([`sha256:${digest("a")}`, `sha256:${digest("b")}`].sort());
    expect(JSON.parse(fetcher.mock.calls[3][1].body).startRow).toBe(2);
    const forbidden = vi.fn(async () => response({ secret: "fixture-secret" }, 403));
    const failed = await collect(config(), deps(forbidden));
    expect(failed.status).toBe("unavailable");
    expect(forbidden).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(failed)).not.toContain("fixture-secret");
  });
  it("marks duplicate, truncated, corrupted and redirects incomplete", async () => {
    for (const payload of [{ rows: [gscRow(), gscRow()] }, { rows: [{ ...gscRow(), keys: ["2026-03-07", "extra"] }] }, { rows: [{ ...gscRow(), clicks: -1 }] }, { rows: [{ ...gscRow(), keys: ["2026-03-06"] }] }]) {
      expect((await collect(config(), deps(vi.fn(async () => response(payload))))).status).not.toBe("complete");
    }
    const truncated = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query"], maxPages: 1 }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["a"] }, { ...gscRow(), keys: ["b"] }] }))));
    expect(truncated.status).toBe("partial");
    const redirect = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://evil.example" } }));
    expect((await collect(config(), deps(redirect))).status).toBe("unavailable");
    expect(redirect.mock.calls).toHaveLength(1);
  });
  it("uses aggregate Umami endpoint and event whitelist without PII", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response([{ x: "fixture-contact", y: 0 }, { x: "private-email@example.org", y: 8 }]));
    const run = await collect(optionsSchema.parse({ ...fixture, source: "umami", baseURL: "https://analytics.example.org", property: "fixture-site", events: ["fixture-contact", "fixture-other"], rowLimit: 10 }), deps(fetcher));
    expect(run.observations).toHaveLength(1);
    expect(run.observations[0].metrics.contactClicks).toBe(0);
    expect(run.days[0].missingEvents).toEqual(["fixture-other"]);
    expect(JSON.stringify(run)).not.toContain("private-email");
    expect(fetcher.mock.calls[0][0]).toContain("/api/websites/fixture-site/metrics?");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error", method: "GET" });
    expect(run.ga4.status).toBe("blocked_unconfigured");
    const capped = await collect(optionsSchema.parse({ ...fixture, source: "umami", baseURL: "https://analytics.example.org", property: "fixture-site", events: ["fixture-contact"], rowLimit: 1 }), deps(fetcher));
    expect(capped.status).toBe("partial");
  });
  it("canonical keys ignore dimension insertion order", () => {
    expect(rowKey({ source: "gsc", property: "x", date: "2026-03-07", dimensions: { query: "q", page: "p" }, event: null })).toBe(rowKey({ source: "gsc", property: "x", date: "2026-03-07", dimensions: { page: "p", query: "q" }, event: null }));
  });
  it("bounds retries and never persists raw transport errors or raw search dimensions", async () => {
    const fetcher = vi.fn(async () => response({}, 429));
    expect((await collect(config(), deps(fetcher))).status).toBe("unavailable");
    expect(fetcher).toHaveBeenCalledTimes(3);
    const transport = await collect(config(), deps(vi.fn(async () => { throw new Error("Authorization: Bearer fixture-secret"); })));
    expect(JSON.stringify(transport)).not.toContain("fixture-secret");
    const privateSearch = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query", "page"] }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["person@example.org", "https://fixture.example/contact?email=person@example.org"] }] }))));
    expect(privateSearch.status).toBe("complete");
    expect(JSON.stringify(privateSearch)).not.toContain("person@example.org");
    expect(privateSearch.dimensionEncoding).toBe("sha256_page_query");
  });
  it("keeps the run partial when a later day fails, and rejects duplicate keys across pages", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ rows: [gscRow()] })).mockResolvedValueOnce(response({}, 403));
    const run = await collect(optionsSchema.parse({ ...fixture, end: "2026-03-08" }), deps(fetcher));
    expect(run.status).toBe("partial");
    expect(run.days.map((day) => day.status)).toEqual(["measured", "unavailable"]);
    const duplicates = vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["q"] }] }));
    const duplicate = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query"], rowLimit: 1 }), deps(duplicates));
    expect(duplicate.reason).toBe("duplicate");
    expect(duplicate.status).toBe("partial");
  });
  it("does not convert absent configured contact events to zero", async () => {
    const run = await collect(optionsSchema.parse({ ...fixture, source: "umami", dimensions: [], baseURL: "https://analytics.example.org", property: "fixture-site", events: ["fixture-contact"] }), deps(vi.fn(async () => response([]))));
    expect(run.status).toBe("partial");
    expect(run.days[0]).toMatchObject({ status: "no_rows", missingEvents: ["fixture-contact"] });
    expect(run.observations).toEqual([]);
  });
});

describe("atomic evidence store and CLI", () => {
  it("does not trust a server's smaller Umami cap or erase the missing 501st event", async () => {
    const directory = await output();
    const options = optionsSchema.parse({ ...fixture, source: "umami", dimensions: [], property: "fixture-site", baseURL: "https://analytics.example.org", events: ["inquiry-click"], rowLimit: 1000 });
    const historical = await exactFixture(options, [{ x: "contact", y: 7 }]);
    await persist(directory, historical);
    const before = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    const capped = await collect(options, deps(vi.fn(async () => response(Array.from({ length: 500 }, (_, index) => ({ x: `other-${index}`, y: 1 }))))));
    await persist(directory, capped);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(capped.status).toBe("partial");
    expect(capped.reason).toBe("aggregate_exhaustiveness_unverified");
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
  });
  it.each(["2026-11-06", "2026-03-07"])("does not treat absent final data on %s as confirmed empty coverage", async (date) => {
    const directory = await output();
    const options = optionsSchema.parse({ ...fixture, start: date, end: date });
    const historical = await collect(options, { ...deps(vi.fn(async () => response({ rows: [gscRow(date)] }))), now: new Date("2026-11-20T12:00:00Z") });
    await persist(directory, historical);
    const before = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    const missing = await collect(options, deps(vi.fn(async () => response({}))));
    await persist(directory, missing);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(missing.status).not.toBe("complete");
    expect(missing.days[0]).toMatchObject({ status: "unavailable", finalAvailability: "unknown" });
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
    const emptyDirectory = await output();
    await persist(emptyDirectory, missing);
    expect(JSON.parse(await readFile(join(emptyDirectory, "ledger.json"), "utf8")).checkpoints).toEqual([]);
  });
  it("waits a safe PT calendar lag even for nonempty final responses and records rechecks", async () => {
    const fetcher = vi.fn(async () => response({ rows: [gscRow("2026-11-06")] }));
    const recent = await collect(optionsSchema.parse({ ...fixture, start: "2026-11-06", end: "2026-11-06", dimensions: ["query"] }), deps(fetcher));
    expect(recent.status).toBe("partial");
    expect(recent.reason).toBe("gsc_maturity_pending");
    expect(fetcher).not.toHaveBeenCalled();
    const measured = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query"] }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["term"] }] }))));
    expect(measured).toMatchObject({ gscPolicy: { minAgeDays: 3, recheckAfterDays: 7, finality: "not_guaranteed" } });
    expect(measured.days[0]).toMatchObject({ finalAvailability: "observed_nonempty", recheckOn: "2026-11-14" });
    expect(() => optionsSchema.parse({ ...fixture, gscMinAgeDays: 0 })).toThrow();
    expect(() => optionsSchema.parse({ ...fixture, gscRecheckAfterDays: 0 })).toThrow();
  });
  it.each([{ payload: [] }, { payload: [{ x: "contact", y: 2 }] }])("invalidates overlapping global-fact scopes for historical complete snapshots: %j", async ({ payload }) => {
    const directory = await output();
    const options = optionsSchema.parse({ ...fixture, source: "umami", dimensions: [], property: "fixture-site", baseURL: "https://analytics.example.org", events: ["inquiry-click", "inquiry-success"], rowLimit: 1000 });
    const broad = await exactFixture(options, [{ x: "contact", y: 7 }, { x: "other", y: 4 }]);
    await persist(directory, broad);
    const narrow = await exactFixture(optionsSchema.parse({ ...options, events: ["inquiry-click"] }), payload);
    await persist(directory, narrow);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.checkpoints.map((checkpoint: { scope: string }) => checkpoint.scope)).not.toContain(scopeKey(broad));
    expect(ledger.checkpoints.map((checkpoint: { scope: string }) => checkpoint.scope)).toContain(scopeKey(narrow));
    expect(ledger.observations.find((row: { event: string }) => row.event === "inquiry-success").metrics.contactClicks).toBe(4);
    expect(ledger.runs[0].observationDigest).toBe(digest(broad.observations));
  });
  it("treats reordered GSC dimensions as one scope while mapping keys correctly", async () => {
    const directory = await output();
    const first = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query", "page"] }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["keyword", "https://fixture.example/public"] }] }))));
    const second = await collect(optionsSchema.parse({ ...fixture, dimensions: ["page", "query"] }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["https://fixture.example/public", "keyword"] }] }))));
    await persist(directory, first);
    await persist(directory, second);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(scopeKey(first)).toBe(scopeKey(second));
    expect(rowKey(first.observations[0])).toBe(rowKey(second.observations[0]));
    expect(ledger.observations).toHaveLength(1);
    expect(ledger.checkpoints).toHaveLength(1);
  });
  it.each([{ payload: [] }, { payload: [{ x: "inquiry-click", y: 2 }] }])("keeps historical broad-scope evidence unchanged on unverified scoped Umami runs: %j", async ({ payload }) => {
    const directory = await output();
    const options = optionsSchema.parse({ ...fixture, source: "umami", dimensions: [], property: "fixture-site", baseURL: "https://analytics.example.org", events: ["inquiry-click", "inquiry-success"] });
    const prior = await exactFixture(options, [{ x: "contact", y: 7 }, { x: "other", y: 4 }]);
    await persist(directory, prior);
    const before = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    const narrow = await collect(optionsSchema.parse({ ...options, events: ["inquiry-click"] }), deps(vi.fn(async () => response(payload))));
    await persist(directory, narrow);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(narrow.status).toBe("partial");
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
  });
  it("invalidates only overlapping dates/scopes and preserves historical interval tails and disjoint events", async () => {
    const directory = await output();
    const options = optionsSchema.parse({ ...fixture, source: "umami", dimensions: [], property: "fixture-site", baseURL: "https://analytics.example.org", events: ["inquiry-click", "inquiry-success"], end: "2026-03-09" });
    const broad = await exactFixture(options, [{ x: "contact", y: 7 }, { x: "other", y: 4 }]);
    await persist(directory, broad);
    const disjoint = await exactFixture(optionsSchema.parse({ ...options, events: ["product-view"] }), [{ x: "unrelated", y: 1 }]);
    await persist(directory, disjoint);
    const narrow = await exactFixture(optionsSchema.parse({ ...options, start: "2026-03-08", end: "2026-03-08", events: ["inquiry-click"] }), []);
    await persist(directory, narrow);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.checkpoints.filter((checkpoint: { scope: string }) => checkpoint.scope === scopeKey(broad))).toEqual([
      { scope: scopeKey(broad), from: "2026-03-07", through: "2026-03-07" },
      { scope: scopeKey(broad), from: "2026-03-09", through: "2026-03-09" },
    ]);
    expect(ledger.checkpoints).toContainEqual({ scope: scopeKey(disjoint), from: "2026-03-07", through: "2026-03-09" });
    expect(ledger.observations.filter((row: { event: string; date: string; metrics: { contactClicks: number } }) => row.event === "inquiry-click" && row.metrics.contactClicks > 0)).toHaveLength(2);
    expect(ledger.observations.find((row: { event: string; date: string }) => row.event === "inquiry-click" && row.date === "2026-03-08").metrics.contactClicks).toBe(0);
  });
  it("does not commit any days when one GSC final day is unconfirmed", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ rows: [gscRow("2026-03-08")] }));
    const run = await collect(optionsSchema.parse({ ...fixture, end: "2026-03-08" }), deps(fetcher));
    const directory = await output();
    await persist(directory, run);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(run.status).toBe("partial");
    expect(run.observations).toHaveLength(1);
    expect(ledger.observations).toEqual([]);
    expect(ledger.checkpoints).toEqual([]);
    await expect(persist(directory, { ...run, status: "complete", reason: "none", completeness: "api_exhausted_not_property_totals", days: run.days.map((day) => ({ ...day, status: "no_rows" })) })).rejects.toThrow("UNCONFIRMED_FINAL_DAY");
  });
  it("honors explicit safe lag/rechecks at PT midnight without treating lag as proof", async () => {
    const options = optionsSchema.parse({ ...fixture, start: "2026-11-04", end: "2026-11-04", gscMinAgeDays: 4, gscRecheckAfterDays: 2 });
    const fetcher = vi.fn(async () => response({ rows: [gscRow("2026-11-04")] }));
    const pending = await collect(options, { ...deps(fetcher), now: new Date("2026-11-08T07:59:59Z") });
    expect(pending.reason).toBe("gsc_maturity_pending");
    expect(pending.days[0].recheckOn).toBe("2026-11-08");
    expect(fetcher).not.toHaveBeenCalled();
    const eligible = await collect(options, { ...deps(fetcher), now: new Date("2026-11-08T08:00:00Z") });
    expect(eligible.status).toBe("complete");
    expect(eligible.gscPolicy?.finality).toBe("not_guaranteed");
    expect(eligible.days[0].recheckOn).toBe("2026-11-10");
    const unknown = await collect(options, { ...deps(vi.fn(async () => response({ rows: [] }))), now: new Date("2026-11-08T08:00:00Z") });
    expect(unknown.reason).toBe("gsc_final_unconfirmed");
  });
  it("exposes safe GSC policy and research limitations through the CLI without enabling raw collection", async () => {
    const directory = await output();
    const args = ["--source", "gsc", "--start", fixture.start, "--end", fixture.end, "--output", directory, "--gsc-min-age-days", "5", "--gsc-recheck-after-days", "2"];
    const result = await cli(args, { GSC_SITE_URL: fixture.property, GSC_ACCESS_TOKEN: "fixture-secret" }, vi.fn(async () => response({ rows: [gscRow()] })), now);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.text)).toMatchObject({ researchReady: false, gscPolicy: { minAgeDays: 5, recheckAfterDays: 2, finality: "not_guaranteed" } });
    expect(JSON.parse(await readFile(join(directory, "ledger.json"), "utf8")).runs[0].gscPolicy.minAgeDays).toBe(5);
    const fetcher = vi.fn();
    expect((await cli([...args, "--research-mode"], {}, fetcher, now)).code).toBe(1);
    expect((await cli([...args, "--gsc-min-age-days", "0"], {}, fetcher, now)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await cli(["--help"], {}, fetcher, now)).text).toContain("not production research ready");
  });
  it("upserts idempotently; errors preserve last good rows and checkpoints", async () => {
    const directory = await output();
    const run = await collect(config(), deps(vi.fn(async () => response({ rows: [gscRow()] }))));
    await persist(directory, run);
    await persist(directory, run);
    let ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.observations).toHaveLength(1);
    expect(ledger.checkpoints[0].through).toBe("2026-03-07");
    const lastGood = JSON.stringify([ledger.observations, ledger.checkpoints]);
    await persist(directory, await collect(config(), deps(vi.fn(async () => response({}, 403)))));
    ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(JSON.stringify([ledger.observations, ledger.checkpoints])).toBe(lastGood);
    expect(ledger.runs).toHaveLength(3);
    expect(ledger.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(ledger)).not.toContain("fixture-secret");
  });
  it("fails closed on lock, corrupt ledger, symlink and forbidden output", async () => {
    const directory = await output();
    const run = await collect(config(), deps(vi.fn(async () => response({ rows: [] }))));
    await mkdir(join(directory, ".seo-data.lock"));
    await expect(persist(directory, run)).rejects.toThrow();
    await rm(join(directory, ".seo-data.lock"), { recursive: true });
    await writeFile(join(directory, "ledger.json"), "corrupt");
    await expect(persist(directory, run)).rejects.toThrow();
    expect(await readFile(join(directory, "ledger.json"), "utf8")).toBe("corrupt");
    const linked = join(directory, "linked");
    await symlink(await output(), linked);
    await expect(persist(linked, run)).rejects.toThrow();
    await expect(persist(join(process.cwd(), "public", "seo-evidence"), run)).rejects.toThrow();
  });
  it("atomic rename failure and partial runs leave all last-good evidence unchanged", async () => {
    const directory = await output();
    const run = await collect(config(), deps(vi.fn(async () => response({ rows: [gscRow()] }))));
    await persist(directory, run);
    const before = await readFile(join(directory, "ledger.json"), "utf8");
    vi.mocked(rename).mockRejectedValueOnce(new Error("fixture disk failure"));
    await expect(persist(directory, run)).rejects.toThrow("fixture disk failure");
    expect(await readFile(join(directory, "ledger.json"), "utf8")).toBe(before);
    expect(await readdir(directory)).toEqual(["ledger.json"]);
    const partial = await collect(optionsSchema.parse({ ...fixture, dimensions: ["query"], rowLimit: 1, maxPages: 1 }), deps(vi.fn(async () => response({ rows: [{ ...gscRow(), keys: ["q"] }] }))));
    await persist(directory, partial);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(after.observations).toEqual(JSON.parse(before).observations);
    expect(after.checkpoints).toEqual(JSON.parse(before).checkpoints);
  });
  it("does not advance checkpoints across gaps; backfills merge contiguous coverage", async () => {
    const directory = await output();
    for (const date of ["2026-03-07", "2026-03-09"]) {
      await persist(directory, await collect(optionsSchema.parse({ ...fixture, start: date, end: date }), deps(vi.fn(async () => response({ rows: [gscRow(date)] })))));
    }
    expect(JSON.parse(await readFile(join(directory, "ledger.json"), "utf8")).checkpoints).toHaveLength(2);
    await persist(directory, await collect(optionsSchema.parse({ ...fixture, start: "2026-03-08", end: "2026-03-08" }), deps(vi.fn(async () => response({ rows: [gscRow("2026-03-08")] })))));
    expect(JSON.parse(await readFile(join(directory, "ledger.json"), "utf8")).checkpoints).toMatchObject([{ from: "2026-03-07", through: "2026-03-09" }]);
  });
  it("concurrent writers fail safe and corrupt digest or metadata cannot replace evidence", async () => {
    const directory = await output();
    const run = await collect(config(), deps(vi.fn(async () => response({ rows: [gscRow()] }))));
    const results = await Promise.allSettled([persist(directory, run), persist(directory, run)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const before = await readFile(join(directory, "ledger.json"), "utf8");
    const corrupted = JSON.parse(before);
    corrupted.observations[0].metrics.clicks = 1;
    await writeFile(join(directory, "ledger.json"), JSON.stringify(corrupted));
    await expect(persist(directory, run)).rejects.toThrow();
    await writeFile(join(directory, "ledger.json"), before);
    await expect(persist(directory, { ...run, observations: [{ ...run.observations[0], date: "2026-03-06" }] })).rejects.toThrow();
    expect(await readFile(join(directory, "ledger.json"), "utf8")).toBe(before);
    await expect(persist(directory, { ...run, evidenceKind: "live_api", observations: run.observations.map((row) => ({ ...row, evidenceKind: "live_api" })) })).rejects.toThrow("FIXTURE_LIVE_MIX_REJECTED");
  });
  it("dry-run has no network, secrets, files or implicit calls", async () => {
    const directory = join(await output(), "not-created");
    const fetcher = vi.fn();
    const args = ["--source", "gsc", "--start", fixture.start, "--end", fixture.end, "--output", directory, "--dry-run"];
    const result = await cli(args, { GSC_SITE_URL: fixture.property, GSC_ACCESS_TOKEN: "fixture-secret" }, fetcher, now);
    expect(result.code).toBe(0);
    expect(result.text).toContain("searchAnalytics/query");
    expect(result.text).not.toContain("fixture-secret");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(readFile(join(directory, "ledger.json"))).rejects.toThrow();
    expect((await cli([], {}, fetcher, now)).code).not.toBe(0);
    expect((await cli(["--help"], {}, fetcher, now)).code).toBe(0);
    expect((await cli(args.filter((arg) => arg !== "--dry-run"), { GSC_SITE_URL: fixture.property }, fetcher, now)).text).toContain("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("redacts CLI auth failures and validates missing-config dates without credentials", async () => {
    const directory = await output();
    const args = ["--source", "gsc", "--start", fixture.start, "--end", fixture.end, "--output", directory];
    const result = await cli(args, { GSC_SITE_URL: fixture.property, GSC_ACCESS_TOKEN: "fixture-secret" }, vi.fn(async () => { throw new Error("fixture-secret"); }), now);
    expect(result.code).toBe(2);
    expect(result.text).not.toContain("fixture-secret");
    expect(await readFile(join(directory, "ledger.json"), "utf8")).not.toContain("fixture-secret");
    expect((await cli(["--source", "gsc", "--start", "2026-03-08", "--end", "2026-03-07", "--output", directory], {}, vi.fn(), now)).code).toBe(1);
  });
});
