// @vitest-environment node
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collect, requests } from "../scripts/seo-data/adapters";
import { optionsSchema, type Run } from "../scripts/seo-data/model";
import { persist } from "../scripts/seo-data/store";
import { cli } from "../scripts/seo-data/cli";

const now = new Date("2026-11-07T12:00:00Z");
const identity = { version: "3.4.0", image: "sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367" };
const options = () => optionsSchema.parse({ source: "umami", property: "fixture-site", baseURL: "https://analytics.example.org", start: "2026-03-07", end: "2026-03-08", dimensions: [], events: ["inquiry-click", "inquiry-success"], umamiIdentity: identity, probeEvent: "inquiry-click", probeDate: "2026-03-06" });
const response = (data: unknown) => new Response(JSON.stringify(data));
const fetcher = () => vi.fn<typeof fetch>(async (url) => {
  const event = new URL(String(url)).searchParams.get("event")!.slice(3);
  return response(event === "inquiry-click" ? [{ x: event, y: 7 }] : []);
});
const dependencies = (fetch: typeof globalThis.fetch) => ({ fetch, now, token: "fixture-secret", evidenceKind: "fixture" as const });
const directories: string[] = [];
async function output() { const directory = await mkdtemp(join(tmpdir(), "umami-exact-")); directories.push(directory); return directory; }
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("measured exact Umami capability, offline fixtures", () => {
  it("probes each execution and measures configured empty zero", async () => {
    const fetch = fetcher();
    const run = await collect(options(), dependencies(fetch));
    expect(run.status).toBe("complete");
    expect(run.completeness).toBe("configured_events_exact");
    expect(run.observations.map((row) => row.metrics.contactClicks)).toEqual([7, 0, 7, 0]);
    expect(run.umamiCapability?.positive).toMatchObject({ event: "inquiry-click", rowCount: 1, count: 7 });
    expect(run.umamiCapability?.negative.rowCount).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(6);
    for (const [url] of fetch.mock.calls) {
      const params = new URL(String(url)).searchParams;
      expect(params.get("limit")).toBe("1");
      expect(params.get("offset")).toBe("0");
      expect(params.has("search")).toBe(false);
      expect(params.get("event")).toMatch(/^eq\./);
    }
    expect(JSON.stringify(run)).not.toContain("fixture-secret");
    expect(requests(options(), now)).toHaveLength(6);
  });
  it.each([[], [{ x: "inquiry-click", y: 0 }], [{ x: "wrong", y: 1 }], [{ x: "inquiry-click", y: -1 }]].map((payload) => ({ payload })))("rejects invalid positive evidence %j", async ({ payload }) => {
    const run = await collect(options(), dependencies(vi.fn(async () => response(payload))));
    expect(run.status).toBe("partial");
    expect(run.observations).toEqual([]);
  });
  it.each([null, {}, [{ x: "wrong", y: 3 }], [{ x: "inquiry-success", y: 1.2 }], [{ x: "inquiry-success", y: Number.MAX_SAFE_INTEGER + 1 }], [{ x: "inquiry-success", y: 0 }, { x: "inquiry-success", y: 1 }]].map((payload) => ({ payload })))("rejects invalid event measurement without committing facts %j", async ({ payload }) => {
    const directory = await output();
    const good = await collect(options(), dependencies(fetcher()));
    await persist(directory, good);
    const before = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    const fetch = fetcher();
    const run = await collect(options(), dependencies(vi.fn(async (url, init) => new URL(String(url)).searchParams.get("event") === "eq.inquiry-success" ? response(payload) : fetch(url, init))));
    expect(run.status).toBe("partial");
    await persist(directory, run);
    const after = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
    expect(after.runs[0].umamiCapability.measurements).toHaveLength(4);
    expect(JSON.stringify(after)).not.toContain("fixture-secret");
  });
  it("uses fresh controls and identical positive/negative windows on every execution", async () => {
    const first = await collect(options(), dependencies(fetcher()));
    const second = await collect(options(), dependencies(fetcher()));
    expect(first.umamiCapability!.negative.event).not.toBe(second.umamiCapability!.negative.event);
    expect(first.umamiCapability!.negative).toMatchObject({ date: first.umamiCapability!.positive.date, startAt: first.umamiCapability!.positive.startAt, endAt: first.umamiCapability!.positive.endAt });
    const fetch = fetcher();
    const contaminated = await collect(options(), dependencies(vi.fn(async (url, init) => String(url).includes("wp02-control-") ? response([{ x: new URL(String(url)).searchParams.get("event")!.slice(3), y: 1 }]) : fetch(url, init))));
    expect(contaminated.status).toBe("partial");
    expect(contaminated.observations).toEqual([]);
  });
  it.each(["missing", "version", "image", "missing_image"] as const)("keeps %s identity unverified even for empty aggregates", async (kind) => {
    const configured = options();
    if (kind === "missing") delete configured.umamiIdentity;
    else if (kind === "missing_image") delete configured.umamiIdentity!.image;
    else configured.umamiIdentity![kind] = "unknown";
    const run = await collect(configured, dependencies(vi.fn(async () => response([]))));
    expect(run.status).toBe("partial");
    expect(run.completeness).toBe("incomplete");
    expect(run.observations).toEqual([]);
    expect(run.umamiCapability).toBeUndefined();
  });
  it("rejects boolean verification, invalid events, missing probe, current/future probe days and overlong ranges", () => {
    expect(() => optionsSchema.parse({ ...options(), umamiIdentity: { ...identity, verified: true } })).toThrow();
    expect(() => requests({ ...options(), events: ["inquiry-click,product-view"] }, now)).toThrow();
    expect(() => requests({ ...options(), probeEvent: undefined }, now)).toThrow();
    for (const probeDate of ["2026-11-07", "2026-11-08"]) expect(() => requests({ ...options(), probeDate }, now)).toThrow();
    expect(() => requests({ ...options(), start: "2025-01-01" }, now)).toThrow();
    expect(requests({ ...options(), probeDate: undefined }, now)).toHaveLength(6);
  });
  it.each(["missing", "origin", "property", "identity", "runId", "window", "positive", "negative", "measurement", "event", "count", "empty"])("rejects fabricated or mismatched complete evidence: %s", async (kind) => {
    const run = await collect(options(), dependencies(fetcher()));
    const proof = run.umamiCapability!;
    if (kind === "missing") delete run.umamiCapability;
    if (kind === "origin") proof.origin = "https://other.example.org";
    if (kind === "property") proof.property = "other";
    if (kind === "identity") proof.identity.image = "other";
    if (kind === "runId") proof.runId = "00000000-0000-4000-8000-000000000000";
    if (kind === "window") proof.negative.startAt++;
    if (kind === "positive") proof.positive.count = 0;
    if (kind === "negative") proof.negative.rowCount = 1;
    if (kind === "measurement") proof.measurements.pop();
    if (kind === "event") proof.measurements[0].event = "product-view";
    if (kind === "count") run.observations[0].metrics.contactClicks = 8;
    if (kind === "empty") { run.events = []; run.observations = []; proof.measurements = []; }
    await expect(persist(join(await output(), "not-created"), run)).rejects.toThrow();
  });
  it("rejects structurally plausible fabricated complete runs not issued by collect", async () => {
    const run = await collect(options(), dependencies(fetcher()));
    await expect(persist(await output(), structuredClone(run) as Run)).rejects.toThrow("UMAMI_PROOF_NOT_COLLECTED_OR_CHANGED");
  });
  it("bounds retry requests and keeps probe transport failures partial", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 429 }));
    const run = await collect(options(), { ...dependencies(fetch), sleep: vi.fn(async () => {}) });
    expect(run.status).toBe("partial");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(run.observations).toEqual([]);
    const directory = await output();
    await persist(directory, run);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.runs[0].umamiChecks).toMatchObject({ identity, checks: [{ event: "inquiry-click", rowCount: null, outcome: "rejected" }, { rowCount: null, outcome: "not_requested" }] });
    expect(ledger.observations).toEqual([]);
    expect(ledger.checkpoints).toEqual([]);
  });
  it("rejects changed repeated positive measurements and never marks a failed run complete", async () => {
    const configured = { ...options(), probeDate: undefined };
    let positiveCalls = 0;
    const fetch = fetcher();
    const run = await collect(configured, dependencies(vi.fn(async (url, init) => {
      if (new URL(String(url)).searchParams.get("event") === "eq.inquiry-click" && ++positiveCalls > 1) return response([]);
      return fetch(url, init);
    })));
    expect(run.status).toBe("partial");
    expect(run.completeness).toBe("incomplete");
    await persist(await output(), run);
  });
  it("dry-run enumerates probes and event plans without token requests, network or writes", async () => {
    const directory = join(await output(), "not-created");
    const fetch = vi.fn();
    const args = ["--source", "umami", "--start", "2026-03-07", "--end", "2026-03-08", "--output", directory, "--events", "inquiry-click,inquiry-success", "--umami-version", identity.version, "--umami-image", identity.image, "--probe-event", "inquiry-click", "--probe-date", "2026-03-06", "--dry-run"];
    const environment = { UMAMI_API_URL: "https://analytics.example.org", UMAMI_WEBSITE_ID: "fixture-site" };
    const result = await cli(args, environment, fetch, now);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.text)).toMatchObject({ network: false, writes: false, requests: Array.from({ length: 6 }, () => ({ method: "GET" })) });
    expect(fetch).not.toHaveBeenCalled();
    await expect(access(directory)).rejects.toThrow();
    const liveFixture = await cli(args.filter((arg) => arg !== "--dry-run"), { ...environment, UMAMI_ACCESS_TOKEN: "fixture-secret" }, fetcher(), now);
    expect(liveFixture.code).toBe(0);
    expect(JSON.parse(liveFixture.text)).toMatchObject({ completeness: "configured_events_exact", researchReady: false });
    expect(await readFile(join(directory, "ledger.json"), "utf8")).not.toContain("fixture-secret");
  });
});
