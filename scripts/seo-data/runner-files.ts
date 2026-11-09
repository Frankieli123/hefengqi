import { constants } from "node:fs";
import { link, lstat, mkdir, open, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { canonical } from "./model";
import { readPrivateLedger, validatePrivateResearchOutput } from "./store";

export class RunnerFailure extends Error {
  constructor(readonly reason: "INVALID_RUNNER_ARGUMENTS" | "RUNNER_LOCKED_MANUAL_REVIEW" | "COLLECTOR_LOCKED_MANUAL_REVIEW" | "RUNNER_STORE_REJECTED_MANUAL_REVIEW") { super(reason); }
}

export async function assertCollectorUnlocked(directory: string) {
  try { await lstat(join(directory, ".seo-data.lock")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  throw new RunnerFailure("COLLECTOR_LOCKED_MANUAL_REVIEW");
}

export async function readRunnerLedger(directory: string) {
  try {
    const entry = await lstat(join(directory, "ledger.json"));
    if (!entry.isFile() || entry.isSymbolicLink() || entry.uid !== process.getuid?.() || entry.nlink !== 1 || (entry.mode & 0o077) !== 0) throw new Error("PRIVATE_FILE_REQUIRED");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return readPrivateLedger(directory);
}

export async function acquireRunner(output: string, id: string, startedAt: string) {
  const directory = await validatePrivateResearchOutput(output, true);
  const path = join(directory, ".seo-runner.lock");
  let handle;
  try { handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST" || (error as NodeJS.ErrnoException).code === "ELOOP") throw new RunnerFailure("RUNNER_LOCKED_MANUAL_REVIEW");
    throw error;
  }
  const owned = await handle.stat();
  const release = async () => {
    const current = await lstat(path);
    if (current.dev !== owned.dev || current.ino !== owned.ino || !current.isFile() || current.nlink !== 1 || current.uid !== process.getuid?.() || (current.mode & 0o777) !== 0o600) throw new RunnerFailure("RUNNER_STORE_REJECTED_MANUAL_REVIEW");
    await unlink(path);
  };
  try { await handle.writeFile(`${canonical({ id, startedAt, pid: process.pid, recovery: "manual_review_only" })}\n`); await handle.sync(); }
  catch (error) { await handle.close(); await release(); throw error; }
  await handle.close();
  return { directory, release };
}

export async function createAudit(directory: string, id: string) {
  const audit = join(directory, `runner-${id}`);
  await mkdir(audit, { mode: 0o700 });
  return audit;
}

export async function publishAudit(directory: string, name: "started.json" | "result.json" | "diff.json" | "alert.json", value: unknown) {
  await validatePrivateResearchOutput(directory);
  const temporary = join(directory, `.publish-${randomUUID()}.tmp`);
  const destination = join(directory, name);
  const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  const owned = await handle.stat();
  let published = false;
  try {
    await handle.writeFile(`${canonical(value)}\n`);
    await handle.sync();
    await handle.close();
    await link(temporary, destination);
    published = true;
  } finally {
    await handle.close().catch(() => {});
    const current = await lstat(temporary);
    if (current.dev !== owned.dev || current.ino !== owned.ino || !current.isFile()) throw new RunnerFailure("RUNNER_STORE_REJECTED_MANUAL_REVIEW");
    try { await unlink(temporary); }
    catch {
      if (published) {
        const final = await lstat(destination);
        if (final.dev !== owned.dev || final.ino !== owned.ino || !final.isFile() || final.nlink < 2) throw new RunnerFailure("RUNNER_STORE_REJECTED_MANUAL_REVIEW");
        await unlink(destination);
      }
      throw new RunnerFailure("RUNNER_STORE_REJECTED_MANUAL_REVIEW");
    }
  }
}
