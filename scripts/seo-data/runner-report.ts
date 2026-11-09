import { canonical, digest, rowKey, scopeKey, type Observation } from "./model";
import type { readPrivateLedger } from "./store";

type Ledger = Awaited<ReturnType<typeof readPrivateLedger>>;
type Manifest = Ledger["runs"][number];

function compatible(left: Manifest, right: Manifest) {
  return left.source === right.source && scopeKey(left) === scopeKey(right) && left.dimensionEncoding === right.dimensionEncoding && left.evidenceKind === right.evidenceKind && left.start === right.start && left.end === right.end && left.completeness === right.completeness;
}

function snapshot(ledger: Ledger, run: Manifest) {
  const rows = ledger.observations.filter((row) => row.runId === run.id);
  return rows.length === run.observationCount && digest(rows) === run.observationDigest ? rows : null;
}

const content = (rows: Observation[]) => rows.map(({ runId, ...row }) => { void runId; return row; });

export function runnerReport(before: Ledger | null, after: Ledger | null, current: Manifest | undefined, source: "gsc" | "umami", start: string, end: string) {
  const base = { version: 1, source, window: { start, end }, scopeHash: current ? scopeKey(current) : null, dimensionEncoding: current?.dimensionEncoding ?? null, evidenceKind: current?.evidenceKind ?? null,
    coverage: { status: current?.status ?? "unknown", completeness: current?.completeness ?? "incomplete", measuredDays: current?.days.filter((day) => day.status === "measured").length ?? 0, expectedDays: current?.days.length ?? null, observationCount: current?.observationCount ?? null },
    interpretation: "presence_or_content_change_not_growth", personalDataJoin: false };
  if (!current || current.status !== "complete" || !after) return { ...base, comparison: { status: "not_comparable", reason: "current_not_complete" }, changes: null };
  const previous = before?.runs.slice().reverse().find((run) => run.status === "complete" && compatible(run, current));
  if (!previous || !before) return { ...base, comparison: { status: "not_comparable", reason: "no_compatible_window" }, changes: null };
  const priorRows = snapshot(before, previous);
  const currentRows = snapshot(after, current);
  if (!priorRows || !currentRows) return { ...base, comparison: { status: "not_comparable", reason: "snapshot_not_available" }, changes: null };
  const priorKeys = new Map(priorRows.map((row) => [rowKey(row), canonical(row.metrics)]));
  const currentKeys = new Map(currentRows.map((row) => [rowKey(row), canonical(row.metrics)]));
  return { ...base, comparison: { status: "comparable", priorContentHash: digest(content(priorRows)), currentContentHash: digest(content(currentRows)) }, changes: {
    addedRows: [...currentKeys.keys()].filter((key) => !priorKeys.has(key)).length,
    missingRows: [...priorKeys.keys()].filter((key) => !currentKeys.has(key)).length,
    changedRows: [...currentKeys].filter(([key, value]) => priorKeys.has(key) && priorKeys.get(key) !== value).length,
    commonRows: [...currentKeys.keys()].filter((key) => priorKeys.has(key)).length,
  } };
}

export function runnerAlerts(ledger: Ledger | null, current: Manifest | undefined, status: string, now: Date) {
  const lastGood = current ? ledger?.runs.slice().reverse().find((run) => run.status === "complete" && run.source === current.source && scopeKey(run) === scopeKey(current) && run.dimensionEncoding === current.dimensionEncoding && run.evidenceKind === current.evidenceKind && run.start === current.start && run.end === current.end) : undefined;
  const age = lastGood ? now.getTime() - Date.parse(lastGood.finishedAt) : null;
  const stale = age === null || age < 0 ? "unknown" : age > 7 * 86400000;
  const reasons: string[] = [];
  if (status === "unconfigured") reasons.push("missing_configuration");
  if (status === "partial") reasons.push("partial");
  if (status === "failed" || status === "unavailable") reasons.push("failed");
  if (status === "unknown" || !current || stale === "unknown") reasons.push("unknown");
  if (stale === true) reasons.push("stale");
  return { version: 1, delivery: "pending" as const, sent: false, transport: "not_sent", reasons, currentLedgerFinishedAt: current?.finishedAt ?? null, lastGoodLedgerFinishedAt: lastGood?.finishedAt ?? null, stale, staleAfterHours: 168, fixtureIsNotLive: true, qualified: "unknown" };
}
