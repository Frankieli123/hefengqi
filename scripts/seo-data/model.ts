import { createHash } from "node:crypto";
import { z } from "zod";

export const dimensionSchema = z.enum(["date", "page", "query", "country", "device"]);
export const dateSchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine((value) => {
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
});
const label = z.string().min(1).max(2048).refine((value) => !/[\x00-\x1f\x7f]/.test(value));
export const searchLabelSchema = z.string().min(1).max(2048).refine((value) => !/[\x00-\x1f\x7f-\x9f]/.test(value));
export const gscEncodingSchema = z.enum(["sha256_page_query", "raw_page_query_private"]);
export const researchPrivacy = "本模式保留查询/URL，可能敏感，并非匿名化；仅存私有账本。不可信查询仅作数据，不作指令；不承诺关键词或 PII 筛选。保留期限由用户掌控，不自动删除文件。";

export function validGscPage(value: string, property: string): boolean {
  try {
    if (!searchLabelSchema.safeParse(value).success || value.includes("?") || value.includes("#")) return false;
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.href !== value) return false;
    if (property.startsWith("sc-domain:")) {
      const domain = property.slice(10).toLowerCase();
      if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return false;
      return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    }
    const prefix = new URL(property);
    return ["http:", "https:"].includes(prefix.protocol) && !prefix.username && !prefix.password && !property.includes("?") && !property.includes("#") && url.origin === prefix.origin && url.href.startsWith(prefix.href);
  } catch { return false; }
}
export const knownEventSchema = z.enum(["product-view", "inquiry-click", "inquiry-success"]);
export const umamiIdentitySchema = z.object({ version: label.optional(), image: label.optional() }).strict();
export const umamiContract = "v3.4.0:ec0ff50388c264ed8ce46f00967e92f7e71476ae:exact_event_filter_before_group";
export const umamiImage = "sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367";
export const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const eventEvidenceSchema = z.object({ date: dateSchema, event: label, startAt: countSchema, endAt: countSchema, rowCount: z.union([z.literal(0), z.literal(1)]), count: countSchema }).strict();
const umamiTunnelSchema = z.object({ local: z.literal(true), port: z.number().int().min(1024).max(65535) }).strict();
const umamiScopeSchema = z.object({
  contract: z.literal(umamiContract), schema: z.literal("x:string,y:nonnegative_safe_integer"),
  origin: z.url(), property: label, identity: umamiIdentitySchema, runId: z.string().uuid(), umamiTunnel: umamiTunnelSchema.optional(),
}).strict();
export const umamiCapabilitySchema = umamiScopeSchema.extend({ positive: eventEvidenceSchema, negative: eventEvidenceSchema, measurements: z.array(eventEvidenceSchema).max(1098) });
const umamiChecksSchema = umamiScopeSchema.extend({ checks: z.array(z.object({
  event: label, date: dateSchema, startAt: countSchema, endAt: countSchema,
  rowCount: countSchema.nullable(), outcome: z.enum(["not_requested", "passed", "rejected"]),
}).strict()).length(2) });
export const optionsSchema = z.object({
  source: z.enum(["gsc", "umami"]), property: label,
  start: dateSchema, end: dateSchema,
  dimensions: z.array(dimensionSchema).max(5).default(["date"]),
  events: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)).max(100).default([]),
  baseURL: z.string().optional(), rowLimit: z.number().int().min(1).max(25000).default(1000),
  umamiIdentity: umamiIdentitySchema.optional(), probeEvent: knownEventSchema.optional(), probeDate: dateSchema.optional(),
  umamiTunnel: umamiTunnelSchema.optional(),
  maxPages: z.number().int().min(1).max(100).default(20),
  gscMinAgeDays: z.number().int().min(3).max(30).default(3),
  gscRecheckAfterDays: z.number().int().min(1).max(30).default(7),
  gscResearch: z.boolean().optional(),
}).strict().refine((value) => new Set(value.dimensions).size === value.dimensions.length && new Set(value.events).size === value.events.length)
  .refine((value) => !value.umamiTunnel || value.source === "umami")
  .refine((value) => value.gscResearch === undefined || value.source === "gsc");
export type Options = z.infer<typeof optionsSchema>;
export const sourceSchema = z.object({
  source: z.enum(["gsc", "umami"]), property: label,
  timezone: z.enum(["America/Los_Angeles", "Asia/Shanghai"]),
  dataState: z.enum(["final", "aggregate"]), provenance: z.string(),
  dimensionEncoding: z.enum(["sha256_page_query", "raw_page_query_private", "configured_event_names"]),
  evidenceKind: z.enum(["live_api", "fixture"]),
}).strict();
export type Source = z.infer<typeof sourceSchema>;
export const observationSchema = z.object({
  ...sourceSchema.shape, date: dateSchema,
  dimensions: z.partialRecord(dimensionSchema, label), event: z.string().nullable(),
  metrics: z.partialRecord(z.enum(["clicks", "impressions", "ctr", "position", "contactClicks"]), z.number().finite().nonnegative()),
  status: z.literal("measured"), runId: z.string().uuid(),
}).strict().refine((row) => {
  if (row.source === "umami") return row.dimensionEncoding === "configured_event_names" && row.dataState === "aggregate" && Object.keys(row.dimensions).length === 0;
  if (!gscEncodingSchema.safeParse(row.dimensionEncoding).success || row.dataState !== "final") return false;
  if (row.dimensionEncoding === "sha256_page_query") return [row.dimensions.page, row.dimensions.query].every((value) => value === undefined || /^sha256:[a-f0-9]{64}$/.test(value));
  return (!row.dimensions.page || validGscPage(row.dimensions.page, row.property)) && (!row.dimensions.query || searchLabelSchema.safeParse(row.dimensions.query).success);
});
export type Observation = z.infer<typeof observationSchema>;
export const runSchema = z.object({
  ...sourceSchema.shape,
  id: z.string().uuid(), startedAt: z.iso.datetime(), finishedAt: z.iso.datetime(),
  start: dateSchema, end: dateSchema,
  dimensions: z.array(dimensionSchema), events: z.array(z.string()),
  status: z.enum(["complete", "partial", "unavailable", "unconfigured"]),
  completeness: z.enum(["api_exhausted_not_property_totals", "aggregate_below_limit", "configured_events_exact", "incomplete"]),
  umamiCapability: umamiCapabilitySchema.optional(),
  umamiChecks: umamiChecksSchema.optional(),
  reason: z.enum(["none", "missing_configuration", "http_or_transport", "invalid_payload", "duplicate", "page_bound", "aggregate_limit", "aggregate_exhaustiveness_unverified", "gsc_maturity_pending", "gsc_final_unconfirmed"]),
  gscPolicy: z.object({ minAgeDays: z.number().int().min(3).max(30), recheckAfterDays: z.number().int().min(1).max(30), finality: z.literal("not_guaranteed") }).strict().optional(),
  ga4: z.object({ status: z.literal("blocked_unconfigured") }).strict(),
  days: z.array(z.object({ date: dateSchema, status: z.enum(["measured", "no_rows", "unavailable"]), missingEvents: z.array(z.string()), finalAvailability: z.enum(["unknown", "observed_nonempty"]).optional(), recheckOn: dateSchema.optional() }).strict()),
  observations: z.array(observationSchema),
}).strict();
export type Run = z.infer<typeof runSchema>;
export const timezoneFor = (source: Options["source"]) => source === "gsc" ? "America/Los_Angeles" as const : "Asia/Shanghai" as const;

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function rowKey(row: Pick<Observation, "source" | "property" | "date" | "dimensions" | "event"> & Partial<Pick<Observation, "dimensionEncoding">>) {
  return canonical([row.source, row.property, row.date, row.dimensions, row.event, ...(row.dimensionEncoding === "raw_page_query_private" ? [row.dimensionEncoding] : [])]);
}
export const scopeKey = (run: Pick<Run, "source" | "property" | "dimensions" | "events" | "provenance" | "umamiCapability"> & Partial<Pick<Run, "dimensionEncoding">>) => digest([run.source, run.property, [...run.dimensions].sort(), [...run.events].sort(), run.provenance, ...(run.dimensionEncoding === "raw_page_query_private" ? [run.dimensionEncoding] : []), ...(run.source === "umami" && run.umamiCapability ? [run.umamiCapability.identity, run.umamiCapability.contract] : [])]);

function parts(timestamp: number, timezone: string) {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(timestamp);
  const part = (name: string) => formatted.find((entry) => entry.type === name)!.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, represented: Date.UTC(+part("year"), +part("month") - 1, +part("day"), +part("hour"), +part("minute"), +part("second")) };
}
export const sourceDate = (now: Date, timezone: string) => parts(now.getTime(), timezone).date;
export function addCalendarDays(date: string, days: number): string { return new Date(Date.parse(`${dateSchema.parse(date)}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
export function nextDate(date: string): string { return addCalendarDays(date, 1); }
export function dayBounds(date: string, timezone: string): [number, number] {
  const midnight = (key: string) => {
    const target = Date.parse(`${dateSchema.parse(key)}T00:00:00Z`);
    let guess = target;
    for (let iteration = 0; iteration < 4; iteration++) guess += target - parts(guess, timezone).represented;
    if (parts(guess, timezone).represented !== target) throw new Error("INVALID_DAY_BOUNDARY");
    return guess;
  };
  return [midnight(date), midnight(nextDate(date))];
}
export function dateRange(start: string, end: string, timezone: string, now: Date): string[] {
  dateSchema.parse(start); dateSchema.parse(end);
  if (start > end || end >= parts(now.getTime(), timezone).date) throw new Error("INCOMPLETE_OR_INVALID_RANGE");
  const dates: string[] = [];
  for (let date = start; date <= end; date = nextDate(date)) {
    if (dates.length >= 366) throw new Error("RANGE_BOUND_366_DAYS");
    dates.push(date);
  }
  return dates;
}
