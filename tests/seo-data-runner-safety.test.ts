import { chmod, link, lstat, mkdir, mkdtemp, open, readFile, readdir, rename, stat, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { runnerCli, runBounded } from "../scripts/seo-data/runner";
import { publishAudit } from "../scripts/seo-data/runner-files";
import { readPrivateLedger } from "../scripts/seo-data/store";
import { dayBounds, umamiImage } from "../scripts/seo-data/model";

const now = new Date("2026-11-09T12:00:00Z");
const environment = { GSC_SITE_URL: "sc-domain:fixture.example", GSC_ACCESS_TOKEN: "offline-fixture-secret" };
const childEnvironment = { PATH: process.env.PATH, TSX_DISABLE_CACHE: "1", COREPACK_ENABLE_NETWORK: "0", NODE_ENV: "test" as const };
async function executeFile(executable: string, parameters: string[], options: { env: NodeJS.ProcessEnv }) {
  const directory = await mkdtemp(join(tmpdir(), "wp02-runner-child-"));
  const stdoutFile = join(directory, "stdout.log");
  const stderrFile = join(directory, "stderr.log");
  const stdoutHandle = await open(stdoutFile, "wx", 0o600);
  const stderrHandle = await open(stderrFile, "wx", 0o600);
  let code: number;
  try {
    const child = spawn(executable, parameters, { env: options.env, stdio: ["ignore", stdoutHandle.fd, stderrHandle.fd] });
    code = await new Promise<number>((resolve, reject) => { child.once("error", reject); child.once("close", (status) => resolve(status ?? 1)); });
  } finally { await stdoutHandle.close(); await stderrHandle.close(); }
  const result = { code, stdout: await readFile(stdoutFile, "utf8"), stderr: await readFile(stderrFile, "utf8") };
  if (code !== 0) throw Object.assign(new Error("FIXTURE_CLI_FAILED"), result);
  return result;
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const output = async () => join(await mkdtemp(join(tmpdir(), "wp02-runner-safety-")), "evidence");
const input = (directory: string) => ({ source: "gsc" as const, start: "2026-03-07", end: "2026-03-07", output: directory, execute: true, environment, now, sleep: async () => {} });
const good: typeof fetch = async (_url, init) => {
  const request = JSON.parse(String(init?.body));
  return response({ rows: [{ keys: [request.startDate], clicks: 2, impressions: 10, ctr: 0.2, position: 3 }] });
};
const args = (directory: string) => ["--source", "gsc", "--start", "2026-03-07", "--end", "2026-03-07", "--output", directory];

describe("runner side-effect and retry boundaries", () => {
  it("does not even read env getters on help/dry-run, or execute without consent", async () => {
    const directory = await output();
    const forbidden = new Proxy({}, { get() { throw new Error("ENV_MUST_NOT_BE_READ"); } });
    const fetcher = vi.fn();
    expect((await runnerCli(["--help"], forbidden, fetcher, now)).code).toBe(0);
    expect((await runnerCli([...args(directory), "--dry-run"], forbidden, fetcher, now)).code).toBe(0);
    expect((await runnerCli(args(directory), forbidden, fetcher, now)).code).toBe(1);
    expect((await runnerCli([...args(directory), "--dry-run", "--execute"], forbidden, fetcher, now)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(stat(directory)).rejects.toThrow();
  });

  it.each(["--token", "--configured", "--command", "--raw", "--provider"])("rejects unknown %s without echoing input", async (option) => {
    const directory = await output();
    const result = await runnerCli([...args(directory), "--execute", option, "TOP_SECRET"], environment, vi.fn(), now);
    expect(result.code).toBe(1);
    expect(result.text).not.toContain("TOP_SECRET");
    await expect(stat(directory)).rejects.toThrow();
  });

  it.each([0, 4, 1.5, NaN])("rejects HTTP retry budget %s before creating state", async (maxHttpAttempts) => {
    const directory = await output();
    await expect(runBounded({ ...input(directory), maxHttpAttempts, fetcher: good })).rejects.toThrow();
    await expect(stat(directory)).rejects.toThrow();
  });

  it.each([1, 2, 3])("shares the built-in HTTP total attempt budget %s, no outer retries", async (maxHttpAttempts) => {
    const fetcher = vi.fn(async () => response({}, 503));
    const result = await runBounded({ ...input(await output()), maxHttpAttempts, fetcher });
    expect(result.status).not.toBe("complete");
    expect(fetcher).toHaveBeenCalledTimes(maxHttpAttempts);
  });

  it("recovers from transient HTTP responses and only allowlisted transport failures", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({}, 429)).mockResolvedValueOnce(response({}, 503)).mockImplementation(good);
    expect((await runBounded({ ...input(await output()), fetcher })).status).toBe("complete");
    expect(fetcher).toHaveBeenCalledTimes(3);
    const transport = vi.fn().mockRejectedValueOnce(Object.assign(new TypeError("redacted"), { cause: { code: "ECONNRESET" } })).mockImplementation(good);
    expect((await runBounded({ ...input(await output()), fetcher: transport })).status).toBe("complete");
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404, 501, 505])("never retries permanent HTTP %s", async (status) => {
    const fetcher = vi.fn(async () => response({ private: "offline-fixture-secret" }, status));
    const result = await runBounded({ ...input(await output()), fetcher });
    expect(result.status).not.toBe("complete");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("offline-fixture-secret");
  });

  it("does not retry unknown throws or invalid payloads; releases only owned locks", async () => {
    for (const fetcher of [vi.fn(async () => { throw new Error("offline-fixture-secret"); }), vi.fn(async () => response({ raw: "private-label" }))]) {
      const directory = await output();
      const result = await runBounded({ ...input(directory), fetcher });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toMatch(/offline-fixture-secret|private-label/);
      expect((await readdir(directory)).filter((name) => name.includes("lock") || name.endsWith(".tmp"))).toEqual([]);
      const audit = (await readdir(directory)).find((name) => name.startsWith("runner-"))!;
      expect(await readdir(join(directory, audit))).toEqual(["alert.json", "diff.json", "result.json", "started.json"]);
      for (const filename of await readdir(join(directory, audit))) expect((await stat(join(directory, audit, filename))).mode & 0o777).toBe(0o600);
      const alert = JSON.parse(await readFile(join(directory, audit, "alert.json"), "utf8"));
      expect(alert).toMatchObject({ delivery: "pending", transport: "not_sent", sent: false });
    }
  });
});

describe("last-good, coverage, compatible hash-only differences", () => {
  it("deduplicates twice through the same runner path and compares content without run IDs", async () => {
    const directory = await output();
    await runBounded({ ...input(directory), fetcher: good });
    const result = await runBounded({ ...input(directory), fetcher: good });
    expect(result).toHaveProperty("report.comparison.status", "comparable");
    expect(result).toHaveProperty("report.changes", { addedRows: 0, missingRows: 0, changedRows: 0, commonRows: 1 });
    const ledger = await readPrivateLedger(directory);
    expect(ledger.observations).toHaveLength(1);
    expect(ledger.runs).toHaveLength(2);
    expect(ledger.checkpoints).toHaveLength(1);
  });

  it("does not compare incompatible windows; overlap backfill deduplicates and later partial preserves good rows", async () => {
    const directory = await output();
    await runBounded({ ...input(directory), fetcher: good });
    const overlap = await runBounded({ ...input(directory), end: "2026-03-08", fetcher: good });
    expect(overlap).toHaveProperty("report.comparison.reason", "no_compatible_window");
    const before = await readPrivateLedger(directory);
    expect(before.observations).toHaveLength(2);
    expect(before.checkpoints).toHaveLength(1);
    const fetcher = vi.fn().mockImplementationOnce(good).mockResolvedValue(response({}, 503));
    const partial = await runBounded({ ...input(directory), end: "2026-03-08", fetcher });
    expect(partial.status).toBe("partial");
    expect(partial).toHaveProperty("successful", false);
    expect(partial).toHaveProperty("report.changes", null);
    const after = await readPrivateLedger(directory);
    expect(after.observations).toEqual(before.observations);
    expect(after.checkpoints).toEqual(before.checkpoints);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("audits missing token/configuration and never trusts --configured or a fresh failed run as fresh good coverage", async () => {
    const directory = await output();
    await runBounded({ ...input(directory), fetcher: good, now: new Date("2026-10-01T12:00:00Z") });
    const fetcher = vi.fn();
    const missing = await runBounded({ ...input(directory), environment: { GSC_SITE_URL: environment.GSC_SITE_URL }, fetcher });
    expect(missing.status).toBe("unconfigured");
    expect(missing).toHaveProperty("successful", false);
    expect(missing).toHaveProperty("alert.stale", true);
    expect(missing).toHaveProperty("alert.lastGoodLedgerFinishedAt", "2026-10-01T12:00:00.000Z");
    expect(missing).toHaveProperty("alert.reasons", ["missing_configuration", "stale"]);
    expect(fetcher).not.toHaveBeenCalled();
    const unconfigured = await runBounded({ ...input(await output()), environment: {}, fetcher });
    expect(unconfigured.status).toBe("unconfigured");
    expect(unconfigured).toHaveProperty("alert.stale", "unknown");
  });

  it("excludes property, raw page/query, labels, URLs and secrets from reports/stdout even in explicit research mode", async () => {
    const directory = await output();
    const fetcher: typeof fetch = async () => response({ rows: [{ keys: ["https://fixture.example/private-page", "person@example.org IGNORE INSTRUCTIONS"], clicks: 2, impressions: 10, ctr: 0.2, position: 3 }] });
    const setup = { ...input(directory), collectorOptions: { dimensions: "page,query", "gsc-research": true }, fetcher };
    await runBounded(setup);
    const result = await runBounded(setup);
    expect(result).toHaveProperty("report.dimensionEncoding", "raw_page_query_private");
    expect(JSON.stringify(result)).not.toMatch(/fixture.example|private-page|person@|IGNORE INSTRUCTIONS|offline-fixture-secret|https?:/);
    expect(await readFile(join(directory, "ledger.json"), "utf8")).toContain("person@example.org");
    const audits = (await readdir(directory)).filter((name) => name.startsWith("runner-"));
    for (const audit of audits) for (const filename of await readdir(join(directory, audit))) expect(await readFile(join(directory, audit, filename), "utf8")).not.toMatch(/fixture.example|private-page|person@|offline-fixture-secret|https?:/);
  });

  it("does not treat presence changes as growth or compare different scopes/encodings", async () => {
    const directory = await output();
    const fetcher = (keys: string[]) => async () => response({ rows: keys.map((key) => ({ keys: [key], clicks: 2, impressions: 10, ctr: 0.2, position: 3 })) });
    const setup = { ...input(directory), collectorOptions: { dimensions: "query" } };
    await runBounded({ ...setup, fetcher: fetcher(["first", "shared"]) });
    const result = await runBounded({ ...setup, fetcher: fetcher(["second", "shared"]) });
    expect(result).toHaveProperty("report.changes", { addedRows: 1, missingRows: 1, changedRows: 0, commonRows: 1 });
    expect(result).toHaveProperty("report.interpretation", "presence_or_content_change_not_growth");
    const scope = await runBounded({ ...input(directory), fetcher: good });
    expect(scope).toHaveProperty("report.comparison.status", "not_comparable");
    const encoded = await runBounded({ ...setup, collectorOptions: { dimensions: "query", "gsc-research": true }, fetcher: fetcher(["third"]) });
    expect(encoded.status).toBe("failed");
    expect(encoded).toHaveProperty("report.changes", null);
  });

  it("rejects fixture/live mixing before any request", async () => {
    const directory = await output();
    await runBounded({ ...input(directory), fetcher: good });
    const result = await runBounded({ ...input(directory), environment: {} });
    expect(result.status).toBe("failed");
    expect((await readPrivateLedger(directory)).runs).toHaveLength(1);
  });

  it("keeps Umami unknown identity partial and exact identity requires fresh probes each execution", async () => {
    const directory = await output();
    const setup = { ...input(directory), source: "umami" as const, environment: { UMAMI_API_URL: "https://analytics.fixture.example", UMAMI_WEBSITE_ID: "fixture-site", UMAMI_ACCESS_TOKEN: "offline-fixture-secret" }, collectorOptions: { events: "inquiry-click" } };
    const partial = await runBounded({ ...setup, fetcher: async () => response([{ x: "inquiry-click", y: 5 }]) });
    expect(partial.status).toBe("partial");
    expect(partial).toHaveProperty("successful", false);
    expect(partial).toHaveProperty("report.changes", null);
    const exactOutput = await output();
    const exact = { ...setup, output: exactOutput, collectorOptions: { events: "inquiry-click", "probe-event": "inquiry-click", "umami-version": "3.4.0", "umami-image": umamiImage } };
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const event = new URL(String(url)).searchParams.get("event")!.slice(3);
      return response(event.startsWith("wp02-control-") ? [] : [{ x: event, y: 5 }]);
    });
    expect((await runBounded({ ...exact, fetcher })).status).toBe("complete");
    expect((await runBounded({ ...exact, fetcher })).status).toBe("complete");
    expect(fetcher).toHaveBeenCalledTimes(6);
  });
});

describe("private state, mutual exclusion and failure cleanup", () => {
  it("does not claim success or remove a replaced lock when ownership is lost during collection", async () => {
    const directory = await output();
    const result = await runBounded({ ...input(directory), fetcher: async (...parameters) => {
      await rename(join(directory, ".seo-runner.lock"), join(directory, "original-owner.lock"));
      await writeFile(join(directory, ".seo-runner.lock"), "another-owner", { mode: 0o600, flag: "wx" });
      return good(...parameters);
    } });
    expect(result.status).toBe("failed");
    expect(result).toHaveProperty("successful", false);
    expect(result).toHaveProperty("reason", "RUNNER_STORE_REJECTED_MANUAL_REVIEW");
    expect(await readFile(join(directory, ".seo-runner.lock"), "utf8")).toBe("another-owner");
  });

  it("audits a residual collector lock as manual-review failure before requests", async () => {
    const directory = await output();
    await mkdir(directory, { mode: 0o700 });
    await mkdir(join(directory, ".seo-data.lock"), { mode: 0o700 });
    const fetcher = vi.fn();
    const result = await runBounded({ ...input(directory), fetcher });
    expect(result.status).toBe("failed");
    expect(result).toHaveProperty("reason", "COLLECTOR_LOCKED_MANUAL_REVIEW");
    expect(fetcher).not.toHaveBeenCalled();
    expect((await stat(join(directory, ".seo-data.lock"))).isDirectory()).toBe(true);
    await expect(stat(join(directory, ".seo-runner.lock"))).rejects.toThrow();
  });

  it("fails closed on competing lock and never removes another lock", async () => {
    const directory = await output();
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    let resume!: () => void;
    const pause = new Promise<void>((resolve) => { resume = resolve; });
    const first = runBounded({ ...input(directory), fetcher: async (...parameters) => { entered(); await pause; return good(...parameters); } });
    await started;
    expect((await stat(join(directory, ".seo-runner.lock"))).mode & 0o777).toBe(0o600);
    const prior = await readFile(join(directory, ".seo-runner.lock"), "utf8");
    const second = await runnerCli([...args(directory), "--execute"], environment, good, now);
    expect(second.code).toBe(1);
    expect(second.text).toContain("RUNNER_LOCKED_MANUAL_REVIEW");
    expect(await readFile(join(directory, ".seo-runner.lock"), "utf8")).toBe(prior);
    resume();
    expect((await first).status).toBe("complete");
  });

  it.each(["file", "directory", "symlink"])("leaves a residual %s lock untouched for manual review", async (kind) => {
    const directory = await output();
    await mkdir(directory, { mode: 0o700 });
    const lock = join(directory, ".seo-runner.lock");
    if (kind === "directory") await mkdir(lock);
    else if (kind === "symlink") await symlink("missing-target", lock);
    else await writeFile(lock, "crashed-owner", { mode: 0o600 });
    const before = await lstat(lock);
    const result = await runnerCli([...args(directory), "--execute"], environment, good, now);
    expect(result.text).toContain("RUNNER_LOCKED_MANUAL_REVIEW");
    expect((await lstat(lock)).ino).toBe(before.ino);
  });

  it("rejects inside-repository, symlink and wide output paths before fetching", async () => {
    const root = await mkdtemp(join(tmpdir(), "wp02-runner-paths-"));
    const wide = join(root, "wide");
    await mkdir(wide, { mode: 0o755 });
    await chmod(wide, 0o755);
    const linked = join(root, "linked");
    await symlink(wide, linked);
    const fetcher = vi.fn();
    for (const directory of [wide, linked, resolve("evidence/runner-forbidden")]) expect((await runnerCli([...args(directory), "--execute"], environment, fetcher, now)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["wide", "symlink", "hardlink"])("audits and refuses %s ledger without overwriting it", async (kind) => {
    const directory = await output();
    await mkdir(directory, { mode: 0o700 });
    const ledger = join(directory, "ledger.json");
    if (kind === "wide") { await writeFile(ledger, "sentinel", { mode: 0o644 }); await chmod(ledger, 0o644); }
    else {
      const target = join(directory, "sentinel");
      await writeFile(target, "sentinel", { mode: 0o600 });
      if (kind === "symlink") await symlink(target, ledger);
      else await link(target, ledger);
    }
    const fetcher = vi.fn();
    const result = await runBounded({ ...input(directory), fetcher });
    expect(result.status).toBe("failed");
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(ledger, "utf8")).toBe("sentinel");
    await expect(stat(join(directory, ".seo-runner.lock"))).rejects.toThrow();
  });

  it("publishes audit files exclusively and cleans only its own temporary files", async () => {
    const directory = await output();
    await mkdir(directory, { mode: 0o700 });
    await publishAudit(directory, "started.json", { status: "original" });
    await expect(publishAudit(directory, "started.json", { status: "overwrite" })).rejects.toThrow();
    expect(JSON.parse(await readFile(join(directory, "started.json"), "utf8"))).toEqual({ status: "original" });
    await symlink("started.json", join(directory, "result.json"));
    await expect(publishAudit(directory, "result.json", { status: "overwrite" })).rejects.toThrow();
    expect((await readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});

describe("calendar and real subprocess entrypoints", () => {
  it("uses source calendars across DST and rejects invalid/incomplete/oversize ranges without writes", async () => {
    expect(dayBounds("2026-03-08", "America/Los_Angeles")[1] - dayBounds("2026-03-08", "America/Los_Angeles")[0]).toBe(23 * 3600000);
    expect(dayBounds("2026-11-01", "America/Los_Angeles")[1] - dayBounds("2026-11-01", "America/Los_Angeles")[0]).toBe(25 * 3600000);
    const forbidden = new Proxy({}, { get() { throw new Error("NO_ENV"); } });
    for (const date of ["2026-03-08", "2026-11-01"]) expect((await runnerCli(["--source", "gsc", "--start", date, "--end", date, "--output", await output(), "--dry-run"], forbidden, vi.fn(), now)).code).toBe(0);
    for (const [start, end] of [["2026-02-30", "2026-03-01"], ["2026-11-09", "2026-11-09"], ["2025-01-01", "2026-03-01"], ["2026-03-08", "2026-03-07"]]) {
      const directory = await output();
      expect((await runnerCli(["--source", "gsc", "--start", start, "--end", end, "--output", directory, "--dry-run"], forbidden, vi.fn(), now)).code).toBe(1);
      await expect(stat(directory)).rejects.toThrow();
    }
    const fetcher = vi.fn();
    expect((await runBounded({ ...input(await output()), start: "2026-11-08", end: "2026-11-08", fetcher })).status).toBe("partial");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("spawns the real help/dry-run/missing-token CLI and the same injected HTTP fixture runner twice", async () => {
    const realCli = "scripts/seo-data/runner.ts";
    const help = await executeFile(process.execPath, ["--import", "tsx", realCli, "--help"], { env: childEnvironment });
    expect(help.stdout).toContain("runner 可运行 ≠ 持续运行 ≠ production accepted");
    const dryOutput = await output();
    const dry = await executeFile(process.execPath, ["--import", "tsx", realCli, ...args(dryOutput), "--dry-run"], { env: childEnvironment });
    expect(JSON.parse(dry.stdout)).toMatchObject({ executed: false, credentialsInspected: false });
    await expect(stat(dryOutput)).rejects.toThrow();
    const missingOutput = await output();
    await expect(executeFile(process.execPath, ["--import", "tsx", realCli, ...args(missingOutput), "--execute"], { env: { ...childEnvironment, GSC_SITE_URL: environment.GSC_SITE_URL } })).rejects.toMatchObject({ code: 2, stdout: expect.stringContaining('"status":"unconfigured"') });
    expect((await readdir(missingOutput)).some((name) => name.startsWith("runner-"))).toBe(true);
    const directory = await output();
    for (let iteration = 0; iteration < 2; iteration++) {
      const result = await executeFile(process.execPath, ["--import", "tsx", "tests/fixtures/seo-runner-cli.ts", ...args(directory), "--execute"], { env: childEnvironment });
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toMatchObject({ status: "complete", report: { evidenceKind: "fixture" }, qualified: "unknown" });
      expect(result.stdout).not.toMatch(/offline-fixture-secret|fixture.example|https?:/);
      expect(result.stderr).toBe("");
    }
    expect((await readPrivateLedger(directory)).observations).toHaveLength(1);
  }, 15000);

  it("leaves crash locks for manual review instead of silently recovering or deleting them", async () => {
    const directory = await output();
    const child = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/seo-runner-crash.ts", ...args(directory), "--execute"], { env: childEnvironment, stdio: ["ignore", "pipe", "pipe"] });
    try {
      await vi.waitFor(async () => {
        const audit = (await readdir(directory)).find((name) => name.startsWith("runner-"));
        expect(audit).toBeDefined();
        expect(await stat(join(directory, audit!, "started.json"))).not.toBeNull();
      }, { timeout: 10000, interval: 50 });
      child.kill("SIGKILL");
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
      const lock = await readFile(join(directory, ".seo-runner.lock"), "utf8");
      const result = await runnerCli([...args(directory), "--execute"], environment, good, now);
      expect(result.text).toContain("RUNNER_LOCKED_MANUAL_REVIEW");
      expect(await readFile(join(directory, ".seo-runner.lock"), "utf8")).toBe(lock);
      const audit = (await readdir(directory)).find((name) => name.startsWith("runner-"))!;
      expect(await readdir(join(directory, audit))).toEqual(["started.json"]);
    } finally { child.kill("SIGKILL"); }
  }, 15000);
});
