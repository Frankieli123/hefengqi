import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { addCalendarDays, canonical, countSchema, dateRange, dateSchema, dayBounds, digest, optionsSchema, rowKey, sourceDate, timezoneFor, type Observation, type Options, type Run } from "./model";
import { searchLabelSchema, umamiContract, validGscPage } from "./model";
import { exactIdentity, probeDate, validateUmamiProof } from "./umami";

const collectedProofs = new WeakMap<Run, string>();
export function validateCollectedUmami(run: Run) {
  validateUmamiProof(run);
  if (collectedProofs.get(run) !== digest(run)) throw new Error("UMAMI_PROOF_NOT_COLLECTED_OR_CHANGED");
}

type Dependencies = { fetch: typeof fetch; token?: string; now?: Date; sleep?: (milliseconds: number) => Promise<void>; evidenceKind?: Run["evidenceKind"] };
type Request = { url: string; method: "POST" | "GET"; body?: object };
class PipelineError extends Error {
  constructor(readonly reason: Run["reason"], readonly partial = false) { super(reason); }
}
export function safeBaseURL(base: string, options: Pick<Options, "umamiTunnel"> = {}): string {
  if (options.umamiTunnel !== undefined) {
    const { local, port } = options.umamiTunnel;
    if (local !== true || !Number.isInteger(port) || port < 1024 || port > 65535 || base !== `http://127.0.0.1:${port}`) throw new Error("UNSAFE_TUNNEL_URL");
    return base;
  }
  const url = new URL(base);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.port && url.port !== "443") || isIP(hostname.replace(/^\[|\]$/g, "")) || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(hostname)) throw new Error("UNSAFE_BASE_URL");
  return url.origin;
}
function site(value: string) {
  if (/^sc-domain:(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value)) return;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("INVALID_SITE");
}
export function buildGscRequest(options: Options, date: string, startRow = 0): Request & { body: object } {
  optionsSchema.parse(options); dateSchema.parse(date);
  site(options.property);
  if (!Number.isInteger(startRow) || startRow < 0 || startRow >= options.rowLimit * options.maxPages) throw new Error("INVALID_OFFSET");
  if (date < options.start || date > options.end) throw new Error("INVALID_REQUEST_DATE");
  return { url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(options.property)}/searchAnalytics/query`, method: "POST", body: { startDate: date, endDate: date, dimensions: options.dimensions, type: "web", dataState: "final", rowLimit: options.rowLimit, startRow } };
}
export function buildUmamiRequest(options: Options, date: string, event?: string): Request {
  optionsSchema.parse(options); dateSchema.parse(date);
  if ((date < options.start || date > options.end) && date !== options.probeDate) throw new Error("INVALID_REQUEST_DATE");
  if (!options.baseURL || !/^[a-zA-Z0-9_-]{1,100}$/.test(options.property) || !options.events.length) throw new Error("MISSING_UMAMI_CONFIGURATION");
  const base = safeBaseURL(options.baseURL, options);
  const [start, end] = dayBounds(date, "Asia/Shanghai");
  const query = new URLSearchParams({ startAt: String(start), endAt: String(end - 1), timezone: "Asia/Shanghai", type: "event", limit: String(options.rowLimit) });
  if (event !== undefined) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(event)) throw new Error("INVALID_EVENT");
    query.set("event", `eq.${event}`); query.set("limit", "1"); query.set("offset", "0");
  }
  return { url: `${base}/api/websites/${encodeURIComponent(options.property)}/metrics?${query}`, method: "GET" };
}
export function requests(options: Options, now = new Date()) {
  if (options.source === "umami" && exactIdentity(options)) {
    const date = probeDate(options, now);
    return [buildUmamiRequest(options, date, options.probeEvent), buildUmamiRequest(options, date, `wp02-control-${randomUUID()}`), ...dateRange(options.start, options.end, "Asia/Shanghai", now).flatMap((day) => options.events.map((event) => buildUmamiRequest(options, day, event)))];
  }
  return dateRange(options.start, options.end, timezoneFor(options.source), now).map((date) => options.source === "gsc" ? buildGscRequest(options, date) : buildUmamiRequest(options, date));
}

async function requestJSON(request: Request, dependencies: Dependencies): Promise<unknown> {
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await dependencies.fetch(request.url, { method: request.method, headers: { Authorization: `Bearer ${dependencies.token}`, ...(request.body ? { "Content-Type": "application/json" } : {}) }, ...(request.body ? { body: JSON.stringify(request.body) } : {}), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
    } catch { throw new PipelineError("http_or_transport"); }
    if (response.redirected || (response.url && response.url !== request.url)) throw new PipelineError("http_or_transport");
    if ((response.status === 429 || response.status >= 500 && response.status <= 599) && attempt < 2) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0;
      await response.body?.cancel();
      await sleep(Math.min(5000, Math.max(250 * 2 ** attempt, seconds * 1000)));
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new PipelineError("http_or_transport"); }
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("EMPTY_BODY");
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("PAYLOAD_BOUND"); }
        chunks.push(chunk.value);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { throw new PipelineError("invalid_payload"); }
  }
  throw new PipelineError("http_or_transport");
}
const gscPayload = z.object({
  rows: z.array(z.object({ keys: z.array(z.string().min(1).max(2048)).optional(), clicks: countSchema, impressions: countSchema, ctr: z.number().finite().min(0).max(1), position: z.number().finite().nonnegative() }).strict()).optional(),
  responseAggregationType: z.enum(["auto", "byPage", "byProperty", "byNewsShowcasePanel"]).optional(),
}).strict();
const umamiPayload = z.array(z.object({ x: z.string().max(2048), y: countSchema }).strict());

export async function collect(input: Options, dependencies: Dependencies): Promise<Run> {
  const options = optionsSchema.parse(input);
  if (dependencies.token && canonical(options).includes(dependencies.token)) throw new Error("CREDENTIAL_IN_METADATA");
  const now = dependencies.now ?? new Date();
  const dates = dateRange(options.start, options.end, timezoneFor(options.source), now);
  const plans = requests(options, now);
  const run: Run = {
    id: randomUUID(), startedAt: now.toISOString(), finishedAt: now.toISOString(), source: options.source, property: options.property,
    start: options.start, end: options.end, timezone: timezoneFor(options.source), dimensions: options.source === "gsc" ? [...options.dimensions].sort() : [], events: options.source === "umami" ? [...options.events].sort() : [],
    dataState: options.source === "gsc" ? "final" : "aggregate", provenance: options.source === "gsc" ? "gsc:webmasters-v3:searchAnalytics:web" : `${safeBaseURL(options.baseURL!, options)}/api/websites/{websiteId}/metrics:type=event`,
    dimensionEncoding: options.source === "gsc" ? options.gscResearch ? "raw_page_query_private" : "sha256_page_query" : "configured_event_names",
    evidenceKind: dependencies.evidenceKind ?? "live_api",
    ...(options.source === "gsc" ? { gscPolicy: { minAgeDays: options.gscMinAgeDays, recheckAfterDays: options.gscRecheckAfterDays, finality: "not_guaranteed" as const } } : {}),
    status: "unconfigured", completeness: "incomplete", reason: "missing_configuration", ga4: { status: "blocked_unconfigured" },
    days: dates.map((date) => ({ date, status: "unavailable", missingEvents: options.source === "umami" ? [...options.events].sort() : [], ...(options.source === "gsc" ? { finalAvailability: "unknown" as const, recheckOn: addCalendarDays(sourceDate(now, "America/Los_Angeles"), options.gscRecheckAfterDays) } : {}) })), observations: [],
  };
  if (!dependencies.token) return run;
  if (!/^[\x21-\x7e]{1,8192}$/.test(dependencies.token)) return run;
  try {
    if (options.source === "umami" && exactIdentity(options)) {
      const scope = { contract: umamiContract, schema: "x:string,y:nonnegative_safe_integer", origin: safeBaseURL(options.baseURL!, options), property: options.property, identity: options.umamiIdentity!, runId: run.id, ...(options.umamiTunnel ? { umamiTunnel: options.umamiTunnel } : {}) } as const;
      run.umamiChecks = { ...scope, checks: plans.slice(0, 2).map((plan) => {
        const params = new URL(plan.url).searchParams;
        return { event: params.get("event")!.slice(3), date: probeDate(options, now), startAt: Number(params.get("startAt")), endAt: Number(params.get("endAt")), rowCount: null, outcome: "not_requested" };
      }) };
      const evidence = async (request: Request, probeIndex?: number) => {
        const params = new URL(request.url).searchParams;
        const event = params.get("event")!.slice(3);
        const check = probeIndex === undefined ? undefined : run.umamiChecks!.checks[probeIndex];
        if (check) check.outcome = "rejected";
        const payload = await requestJSON(request, dependencies);
        if (check && Array.isArray(payload)) check.rowCount = payload.length;
        const rows = umamiPayload.parse(payload);
        if (rows.length > 1 || rows.some((row) => row.x !== event)) throw new PipelineError("invalid_payload", true);
        if (check && (probeIndex === 0 ? rows.length === 1 && rows[0].y > 0 : rows.length === 0)) check.outcome = "passed";
        return { date: sourceDate(new Date(Number(params.get("startAt"))), "Asia/Shanghai"), event, startAt: Number(params.get("startAt")), endAt: Number(params.get("endAt")), rowCount: rows.length as 0 | 1, count: rows[0]?.y ?? 0 };
      };
      const positive = await evidence(plans[0], 0);
      const negative = await evidence(plans[1], 1);
      run.umamiCapability = { ...scope, positive, negative, measurements: [] };
      if (positive.rowCount !== 1 || positive.count <= 0 || negative.rowCount !== 0) throw new PipelineError("aggregate_exhaustiveness_unverified", true);
      for (const plan of plans.slice(2)) {
        const measured = await evidence(plan);
        run.umamiCapability.measurements.push(measured);
        run.observations.push({ source: run.source, property: run.property, timezone: run.timezone, dataState: run.dataState, provenance: run.provenance, dimensionEncoding: run.dimensionEncoding, evidenceKind: run.evidenceKind, date: measured.date, dimensions: {}, event: measured.event, metrics: { contactClicks: measured.count }, status: "measured", runId: run.id });
      }
      run.days = dates.map((date) => ({ date, status: "measured", missingEvents: [] }));
      run.completeness = "configured_events_exact";
      validateUmamiProof(run);
      run.status = "complete"; run.reason = "none";
      run.finishedAt = (dependencies.now ?? new Date()).toISOString();
      collectedProofs.set(run, digest(run));
      return run;
    }
    const seen = new Set<string>();
    let incompleteReason: Run["reason"] | undefined;
    for (const [index, date] of dates.entries()) {
      if (options.source === "gsc" && addCalendarDays(date, options.gscMinAgeDays) > sourceDate(now, "America/Los_Angeles")) {
        run.days[index].recheckOn = addCalendarDays(date, options.gscMinAgeDays);
        incompleteReason ??= "gsc_maturity_pending";
        continue;
      }
      const daily: Observation[] = [];
      const add = (dimensions: Observation["dimensions"], event: string | null, metrics: Observation["metrics"]) => {
        const row: Observation = { source: run.source, property: run.property, date, timezone: run.timezone, dimensions, event, metrics, dataState: run.dataState, dimensionEncoding: run.dimensionEncoding, evidenceKind: run.evidenceKind, status: "measured", provenance: run.provenance, runId: run.id };
        const key = rowKey(row);
        if (seen.has(key)) throw new PipelineError("duplicate", true);
        if (seen.size >= 100000) throw new PipelineError("page_bound", true);
        seen.add(key); daily.push(row);
      };
      if (options.source === "gsc") {
        for (let page = 0; page < options.maxPages; page++) {
          const parsed = gscPayload.safeParse(await requestJSON(buildGscRequest(options, date, page * options.rowLimit), dependencies));
          if (!parsed.success) throw new PipelineError("invalid_payload");
          const rows = parsed.data.rows ?? [];
          if (rows.length > options.rowLimit) throw new PipelineError("invalid_payload");
          for (const row of rows) {
            const keys = row.keys ?? [];
            if (keys.length !== options.dimensions.length || row.clicks > row.impressions) throw new PipelineError("invalid_payload");
            const dimensions = Object.fromEntries(options.dimensions.map((name, keyIndex) => [name, keys[keyIndex]]));
            if (dimensions.date && dimensions.date !== date || dimensions.device && !["DESKTOP", "MOBILE", "TABLET"].includes(dimensions.device) || dimensions.country && !/^[a-zA-Z]{3}$/.test(dimensions.country) || keys.some((key) => /[\x00-\x1f\x7f]/.test(key))) throw new PipelineError("invalid_payload");
            if (dimensions.page && !validGscPage(dimensions.page, options.property)) {
              run.observations = [];
              throw new PipelineError("invalid_payload", true);
            }
            if (dimensions.query && !searchLabelSchema.safeParse(dimensions.query).success) throw new PipelineError("invalid_payload", true);
            if (!options.gscResearch) for (const name of ["page", "query"]) if (dimensions[name]) dimensions[name] = `sha256:${digest(dimensions[name])}`;
            add(dimensions, null, { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position });
          }
          if (rows.length < options.rowLimit) break;
          if (page === options.maxPages - 1) throw new PipelineError("page_bound", true);
        }
      } else {
        const parsed = umamiPayload.safeParse(await requestJSON(plans[index], dependencies));
        if (!parsed.success) throw new PipelineError("invalid_payload");
        for (const row of parsed.data) if (options.events.includes(row.x)) add({}, row.x, { contactClicks: row.y });
      }
      if (options.source === "gsc" && !daily.length) {
        incompleteReason ??= "gsc_final_unconfirmed";
        continue;
      }
      run.observations.push(...daily);
      run.days[index] = { ...run.days[index], date, status: daily.length ? "measured" : "no_rows", missingEvents: options.source === "umami" ? options.events.filter((event) => !daily.some((row) => row.event === event)).sort() : [], ...(options.source === "gsc" ? { finalAvailability: "observed_nonempty" as const } : {}) };
    }
    run.reason = options.source === "umami" ? "aggregate_exhaustiveness_unverified" : incompleteReason ?? "none";
    run.status = run.reason === "none" ? "complete" : "partial";
    run.completeness = run.status === "complete" ? "api_exhausted_not_property_totals" : "incomplete";
  } catch (error) {
    run.completeness = "incomplete";
    run.status = options.source === "umami" && exactIdentity(options) || run.observations.length || error instanceof PipelineError && error.partial ? "partial" : "unavailable";
    run.reason = error instanceof PipelineError ? error.reason : "invalid_payload";
    if (options.source === "gsc" && run.reason === "invalid_payload" && options.dimensions.includes("page")) {
      run.status = "partial";
      run.observations = [];
    }
  }
  if (options.gscResearch && run.status !== "complete") run.observations = [];
  run.observations.sort((left, right) => rowKey(left) < rowKey(right) ? -1 : rowKey(left) > rowKey(right) ? 1 : 0);
  run.finishedAt = (dependencies.now ?? new Date()).toISOString();
  return run;
}
