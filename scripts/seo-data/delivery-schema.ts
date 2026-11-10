import { z } from "zod";
import { canonical, dateSchema, runSchema } from "./model";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().datetime();
const source = z.enum(["gsc", "umami"]);
const windowSchema = z.object({ start: dateSchema, end: dateSchema }).strict().refine((value) => value.start <= value.end);
const status = z.enum(["complete", "partial", "failed", "unavailable", "unconfigured", "unknown"]);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const reason = z.enum(["missing_configuration", "partial", "failed", "unknown", "stale"]);
const alertSchema = z.object({
  version: z.literal(1), delivery: z.literal("pending"), sent: z.literal(false), transport: z.literal("not_sent"),
  reasons: z.array(reason).max(5).refine((values) => new Set(values).size === values.length),
  currentLedgerFinishedAt: timestamp.nullable(), lastGoodLedgerFinishedAt: timestamp.nullable(),
  stale: z.union([z.boolean(), z.literal("unknown")]), staleAfterHours: z.literal(168), fixtureIsNotLive: z.literal(true), qualified: z.literal("unknown"),
}).strict();
const reportSchema = z.object({
  version: z.literal(1), source, window: windowSchema, scopeHash: hash.nullable(),
  dimensionEncoding: z.enum(["sha256_page_query", "raw_page_query_private", "configured_event_names"]).nullable(),
  evidenceKind: z.enum(["live_api", "fixture"]).nullable(),
  coverage: z.object({ status, completeness: runSchema.shape.completeness, measuredDays: count.max(366), expectedDays: count.min(1).max(366).nullable(), observationCount: count.nullable() }).strict(),
  interpretation: z.literal("presence_or_content_change_not_growth"), personalDataJoin: z.literal(false),
  comparison: z.union([
    z.object({ status: z.literal("not_comparable"), reason: z.enum(["current_not_complete", "no_compatible_window", "snapshot_not_available"]) }).strict(),
    z.object({ status: z.literal("comparable"), priorContentHash: hash, currentContentHash: hash }).strict(),
  ]),
  changes: z.object({ addedRows: count, missingRows: count, changedRows: count, commonRows: count }).strict().nullable(),
}).strict();
const common = { version: z.literal(1), id: z.string().uuid(), source, window: windowSchema, maxHttpAttempts: z.number().int().min(1).max(3), wholeRunAttempts: z.literal(1) };
const startedSchema = z.object({ ...common, startedAt: timestamp, status: z.literal("started") }).strict();
const resultSchema = z.object({
  ...common, status, reason: z.union([runSchema.shape.reason, z.enum(["collector_or_store_rejected", "INVALID_RUNNER_ARGUMENTS", "RUNNER_LOCKED_MANUAL_REVIEW", "COLLECTOR_LOCKED_MANUAL_REVIEW", "RUNNER_STORE_REJECTED_MANUAL_REVIEW"])]), executed: z.literal(true), successful: z.boolean(),
  finishedAt: timestamp, report: reportSchema, alert: alertSchema, qualified: z.literal("unknown"),
}).strict();

export function validateDeliveryAudit(startedValue: unknown, resultValue: unknown, diffValue: unknown, alertValue: unknown) {
  const started = startedSchema.parse(startedValue);
  const result = resultSchema.parse(resultValue);
  const diff = reportSchema.parse(diffValue);
  const alert = alertSchema.parse(alertValue);
  if (started.id !== result.id || started.source !== result.source || canonical(started.window) !== canonical(result.window) || started.maxHttpAttempts !== result.maxHttpAttempts || started.startedAt > result.finishedAt ||
      canonical(diff) !== canonical(result.report) || canonical(alert) !== canonical(result.alert) || diff.source !== result.source || canonical(diff.window) !== canonical(result.window) ||
      result.successful !== (result.status === "complete") || (!alert.reasons.length && !result.successful) || diff.evidenceKind !== "live_api" ||
      !diff.scopeHash || !diff.dimensionEncoding || !alert.currentLedgerFinishedAt || alert.currentLedgerFinishedAt > result.finishedAt ||
      diff.coverage.expectedDays === null || diff.coverage.measuredDays > diff.coverage.expectedDays || diff.coverage.observationCount === null ||
      (diff.comparison.status === "comparable") !== (diff.changes !== null) || result.successful && (diff.coverage.status !== "complete" || diff.coverage.completeness === "incomplete") ||
      (diff.source === "umami") !== (diff.dimensionEncoding === "configured_event_names") || alert.stale !== "unknown" && !alert.lastGoodLedgerFinishedAt) throw new Error("AUDIT_REJECTED");
  const reasons: string[] = [];
  if (result.status === "unconfigured") reasons.push("missing_configuration");
  if (result.status === "partial") reasons.push("partial");
  if (result.status === "failed" || result.status === "unavailable") reasons.push("failed");
  if (result.status === "unknown" || alert.stale === "unknown") reasons.push("unknown");
  if (alert.stale === true) reasons.push("stale");
  if (canonical(reasons) !== canonical(alert.reasons)) throw new Error("ALERT_REASONS_MISMATCH");
  return { started, result, diff, alert };
}

export const receiptSchema = z.object({
  version: z.literal(1), idempotencyKey: hash, payloadHash: hash, mode: z.enum(["live_alert", "delivery_test_not_production_alert"]),
  status: z.enum(["pending", "acknowledged"]), createdAt: timestamp, semantics: z.literal("at-least-once"),
  acknowledgedMeans: z.literal("http_2xx_not_human_read"), httpStatus: z.number().int().min(200).max(299).nullable(),
}).strict().refine((value) => (value.status === "acknowledged") === (value.httpStatus !== null));
