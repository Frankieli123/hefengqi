import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rmdir, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { addCalendarDays, canonical, dateSchema, digest, nextDate, observationSchema, rowKey, runSchema, scopeKey, timezoneFor, type Run } from "./model";
import { validateCollectedUmami, safeBaseURL } from "./adapters";

const checkpointSchema = z.object({ scope: z.string().regex(/^[a-f0-9]{64}$/), from: dateSchema, through: dateSchema }).strict().refine((value) => value.from <= value.through);
const manifestSchema = runSchema.omit({ observations: true }).extend({ observationCount: z.number().int().nonnegative(), observationDigest: z.string().regex(/^[a-f0-9]{64}$/) });
const ledgerSchema = z.object({ version: z.literal(1), observations: z.array(observationSchema), checkpoints: z.array(checkpointSchema), runs: z.array(manifestSchema), digest: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
type Ledger = z.infer<typeof ledgerSchema>;
const blocked = new Set(["src", "public", "scripts", "docs", "tests", "prisma", "node_modules", ".git", ".next", "next-build", "current", ".releases", ".agents", ".codex"]);

export async function validateOutput(output: string, create = false): Promise<string> {
  if (!output || output.includes("\0")) throw new Error("UNSAFE_OUTPUT");
  const absolute = resolve(output);
  const segments = absolute.split(sep).filter(Boolean);
  if (segments.some((segment) => blocked.has(segment) || segment.startsWith(".env"))) throw new Error("UNSAFE_OUTPUT");
  const repository = await realpath(process.cwd());
  const inside = relative(repository, absolute);
  if (inside === "" || (!inside.startsWith(`..${sep}`) && !isAbsolute(inside) && !["evidence", ".evidence"].includes(inside.split(sep)[0]))) throw new Error("USE_EVIDENCE_DIRECTORY");
  let current: string = sep;
  for (const segment of segments) {
    current = join(current, segment);
    let stat;
    try { stat = await lstat(current); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (!create) continue;
      try { await mkdir(current, { mode: 0o700 }); } catch (failure) { if ((failure as NodeJS.ErrnoException).code !== "EEXIST") throw failure; }
      stat = await lstat(current);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("UNSAFE_OUTPUT_COMPONENT");
    if (current === absolute && (stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0)) throw new Error("OUTPUT_MUST_BE_PRIVATE_0700");
  }
  return absolute;
}

function validateRun(run: Run) {
  if (run.start > run.end || run.timezone !== timezoneFor(run.source) || run.startedAt > run.finishedAt) throw new Error("INVALID_RUN_METADATA");
  if (run.status === "complete" && (run.reason !== "none" || run.completeness === "incomplete")) throw new Error("INVALID_COMPLETENESS");
  if (run.status !== "complete" && run.completeness !== "incomplete") throw new Error("INVALID_COMPLETENESS");
  if (run.source === "gsc" ? run.dataState !== "final" || run.dimensionEncoding !== "sha256_page_query" || run.events.length > 0 : run.dataState !== "aggregate" || run.dimensionEncoding !== "configured_event_names" || run.dimensions.length > 0) throw new Error("INVALID_SOURCE_METADATA");
  if (new Set(run.dimensions).size !== run.dimensions.length || new Set(run.events).size !== run.events.length) throw new Error("INVALID_SCOPE");
  const expectedDays: string[] = [];
  for (let date = run.start; date <= run.end; date = nextDate(date)) {
    if (expectedDays.length >= 366) throw new Error("INVALID_RANGE");
    expectedDays.push(date);
  }
  if (canonical(expectedDays) !== canonical(run.days.map((day) => day.date)) || run.status === "complete" && run.days.some((day) => day.status === "unavailable")) throw new Error("INVALID_DAYS");
  if (run.source === "gsc" && run.status === "complete" && run.days.some((day) => day.status !== "measured" || !run.observations.some((row) => row.date === day.date))) throw new Error("UNCONFIRMED_FINAL_DAY");
  const keys = new Set<string>();
  for (const row of run.observations) {
    if (row.source !== run.source || row.property !== run.property || row.runId !== run.id || row.timezone !== run.timezone || row.provenance !== run.provenance || row.date < run.start || row.date > run.end || row.dataState !== run.dataState || row.dimensionEncoding !== run.dimensionEncoding || row.evidenceKind !== run.evidenceKind) throw new Error("INVALID_ROW_METADATA");
    if (run.source === "gsc" ? canonical(Object.keys(row.dimensions).sort()) !== canonical([...run.dimensions].sort()) || row.event !== null : Object.keys(row.dimensions).length > 0 || !run.events.includes(row.event!)) throw new Error("INVALID_ROW_DIMENSIONS");
    if (row.dimensions.date && row.dimensions.date !== row.date) throw new Error("INVALID_ROW_DATE");
    if ([row.dimensions.page, row.dimensions.query].some((value) => value !== undefined && !/^sha256:[a-f0-9]{64}$/.test(value))) throw new Error("RAW_SEARCH_DIMENSION_REJECTED");
    const metricKeys = Object.keys(row.metrics).sort();
    const expectedMetrics = run.source === "gsc" ? ["clicks", "ctr", "impressions", "position"] : ["contactClicks"];
    if (canonical(metricKeys) !== canonical(expectedMetrics) || Object.entries(row.metrics).some(([name, value]) => name !== "ctr" && name !== "position" && (!Number.isSafeInteger(value) || value! < 0)) || (row.metrics.ctr ?? 0) > 1 || (row.metrics.clicks ?? 0) > (row.metrics.impressions ?? 0)) throw new Error("INVALID_METRICS");
    const key = rowKey(row);
    if (keys.has(key)) throw new Error("DUPLICATE_ROW");
    keys.add(key);
  }
}

async function readLedger(path: string): Promise<Ledger> {
  let file;
  try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, observations: [], checkpoints: [], runs: [], digest: "0".repeat(64) };
    throw error;
  }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0 || stat.size > 64 * 1024 * 1024) throw new Error("LEDGER_BOUND_OR_LINK");
    const ledger = ledgerSchema.parse(JSON.parse(await file.readFile("utf8")));
    const { digest: storedDigest, ...body } = ledger;
    if (digest(body) !== storedDigest) throw new Error("LEDGER_DIGEST_MISMATCH");
    const keys = ledger.observations.map(rowKey);
    if (new Set(keys).size !== keys.length) throw new Error("CORRUPT_LEDGER_DUPLICATES");
    return ledger;
  } finally { await file.close(); }
}

export async function persist(output: string, input: Run): Promise<{ digest: string; path: string }> {
  if (input.source === "umami" && input.status === "complete") {
    validateCollectedUmami(input);
    safeBaseURL(input.umamiCapability!.origin, input.umamiCapability!);
  }
  const run = runSchema.parse(input);
  validateRun(run);
  const directory = await validateOutput(output, true);
  const lock = join(directory, ".seo-data.lock");
  await mkdir(lock, { mode: 0o700 });
  const temporary = join(directory, `.ledger-${randomUUID()}.tmp`);
  try {
    const path = join(directory, "ledger.json");
    const ledger = await readLedger(path);
    if (ledger.runs.some((prior) => prior.evidenceKind !== run.evidenceKind)) throw new Error("FIXTURE_LIVE_MIX_REJECTED");
    if (ledger.runs.some((prior) => prior.source === run.source && prior.property === run.property && prior.provenance !== run.provenance)) throw new Error("PROPERTY_ENDPOINT_MISMATCH");
    if (run.status === "complete") {
      const scope = scopeKey(run);
      const overlappingScopes = new Set(ledger.runs.filter((prior) => prior.source === run.source && prior.property === run.property && canonical([...prior.dimensions].sort()) === canonical([...run.dimensions].sort()) && (run.source === "gsc" || prior.events.some((event) => run.events.includes(event)))).map(scopeKey));
      ledger.checkpoints = ledger.checkpoints.flatMap((checkpoint) => {
        if (checkpoint.scope === scope || !overlappingScopes.has(checkpoint.scope) || checkpoint.through < run.start || checkpoint.from > run.end) return [checkpoint];
        const retained: Ledger["checkpoints"] = [];
        if (checkpoint.from < run.start) retained.push({ ...checkpoint, through: addCalendarDays(run.start, -1) });
        if (checkpoint.through > run.end) retained.push({ ...checkpoint, from: nextDate(run.end) });
        return retained;
      });
      const rows = new Map(ledger.observations.map((row) => [rowKey(row), row]));
      for (const row of ledger.observations) {
        if (row.source === run.source && row.property === run.property && row.date >= run.start && row.date <= run.end && canonical(Object.keys(row.dimensions).sort()) === canonical([...run.dimensions].sort()) && (run.source === "gsc" || run.events.includes(row.event!))) rows.delete(rowKey(row));
      }
      for (const row of run.observations) rows.set(rowKey(row), row);
      ledger.observations = [...rows.values()].sort((left, right) => rowKey(left) < rowKey(right) ? -1 : 1);
      const intervals = [...ledger.checkpoints.filter((checkpoint) => checkpoint.scope === scope), { scope, from: run.start, through: run.end }].sort((left, right) => left.from.localeCompare(right.from));
      const merged: Ledger["checkpoints"] = [];
      for (const interval of intervals) {
        const previous = merged.at(-1);
        if (previous && interval.from <= nextDate(previous.through)) previous.through = previous.through > interval.through ? previous.through : interval.through;
        else merged.push({ ...interval });
      }
      ledger.checkpoints = [...ledger.checkpoints.filter((checkpoint) => checkpoint.scope !== scope), ...merged].sort((left, right) => canonical(left).localeCompare(canonical(right)));
    }
    const { observations, ...manifest } = run;
    ledger.runs.push({ ...manifest, observationCount: observations.length, observationDigest: digest(observations) });
    const { digest: previousDigest, ...body } = ledger;
    void previousDigest;
    ledger.digest = digest(body);
    const serialized = `${canonical(ledger)}\n`;
    if (Buffer.byteLength(serialized) > 64 * 1024 * 1024) throw new Error("LEDGER_BOUND");
    const file = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    try { await file.writeFile(serialized); await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
    const directoryHandle = await open(dirname(path), constants.O_RDONLY);
    try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    return { digest: ledger.digest, path };
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(lock);
  }
}
