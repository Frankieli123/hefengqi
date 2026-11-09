import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { cli } from "./cli";
import { dateRange, timezoneFor } from "./model";
import { validatePrivateResearchOutput } from "./store";
import { acquireRunner, assertCollectorUnlocked, createAudit, publishAudit, readRunnerLedger, RunnerFailure } from "./runner-files";
import { runnerAlerts, runnerReport } from "./runner-report";

const stringOptions = ["dimensions", "events", "row-limit", "max-pages", "gsc-min-age-days", "gsc-recheck-after-days", "umami-version", "umami-image", "probe-event", "probe-date", "umami-tunnel-port"] as const;
const booleanOptions = ["gsc-research", "umami-tunnel-local"] as const;
type CollectorOptions = Partial<Record<typeof stringOptions[number], string> & Record<typeof booleanOptions[number], boolean>>;
type Input = { source: "gsc" | "umami"; start: string; end: string; output: string; execute?: boolean; dryRun?: boolean; collectorOptions?: CollectorOptions; maxHttpAttempts?: number; environment?: Record<string, string | undefined>; fetcher?: typeof fetch; now?: Date; sleep?: (milliseconds: number) => Promise<void> };
type RunnerLedger = NonNullable<Awaited<ReturnType<typeof readRunnerLedger>>>;

export const RUNNER_HELP = `手动、单次、有界的只读 SEO 采集执行器；不注册 cron、不启动 worker、不发送通知。
Usage: TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/runner.ts --source gsc|umami --start YYYY-MM-DD --end YYYY-MM-DD --output /absolute/private/outside-git --dry-run|--execute
--help / --dry-run: 无网络、无写入、不读取环境或发现凭据；完整来源日最多366天。
必须显式 --execute 才调用现有 cli.ts，token 只取进程 env；无 dotenv、无 argv token。
复用 collector 的 --dimensions --events --row-limit --max-pages --gsc-min-age-days --gsc-recheck-after-days
--umami-version --umami-image --probe-event --probe-date --umami-tunnel-local --umami-tunnel-port。
--gsc-research 仅显式 GSC 私有原始账本；diff/stdout 始终只有范围、coverage、计数和哈希，不导出 raw。
--max-http-attempts 1..3 (默认3): collector 内置 HTTP 临时错误重试的总预算，不再重试整个采集；不相乘。
GSC env: GSC_SITE_URL, GSC_ACCESS_TOKEN；Umami env: UMAMI_API_URL, UMAMI_WEBSITE_ID, UMAMI_ACCESS_TOKEN。
输出目录必须绝对路径、仓库外、owner-only 0700；锁和审计文件0600，不覆盖审计文件。
.seo-runner.lock 冲突/崩溃残留必须人工核查，不自动删除他人锁；无目录断电持久性保证。
每次执行产生 runner-UUID/{started,result,diff,alert}.json；alert delivery=pending/transport=not_sent。
失败/partial/unconfigured/unknown 退出非0，保留原 collector last-good；fixture 不是 live；qualified=unknown。
runner 可运行 ≠ 持续运行 ≠ production accepted。真实授权 GSC 仅由宿主另行手动运行。`;

export async function runBounded(input: Input) {
  const now = input.now ?? new Date();
  if (!["gsc", "umami"].includes(input.source) || !isAbsolute(input.output) || input.execute === input.dryRun || (!input.execute && !input.dryRun)) throw new RunnerFailure("INVALID_RUNNER_ARGUMENTS");
  const maxHttpAttempts = input.maxHttpAttempts ?? 3;
  if (!Number.isInteger(maxHttpAttempts) || maxHttpAttempts < 1 || maxHttpAttempts > 3) throw new RunnerFailure("INVALID_RUNNER_ARGUMENTS");
  dateRange(input.start, input.end, timezoneFor(input.source), now);
  await validatePrivateResearchOutput(input.output);
  const args = ["--source", input.source, "--start", input.start, "--end", input.end, "--output", input.output];
  for (const [name, value] of Object.entries(input.collectorOptions ?? {})) {
    if (stringOptions.some((option) => option === name) && typeof value === "string") args.push(`--${name}`, value);
    else if (booleanOptions.some((option) => option === name) && value === true) args.push(`--${name}`);
    else throw new RunnerFailure("INVALID_RUNNER_ARGUMENTS");
  }
  const placeholder = { GSC_SITE_URL: "sc-domain:dry-run.example", UMAMI_WEBSITE_ID: "dry-run", UMAMI_API_URL: input.collectorOptions?.["umami-tunnel-local"] ? `http://127.0.0.1:${input.collectorOptions["umami-tunnel-port"]}` : "https://dry-run.example.org" };
  const preflight = await cli([...args, "--dry-run"], placeholder, async () => { throw new Error("DRY_RUN_NETWORK_REJECTED"); }, now);
  if (preflight.code !== 0) throw new RunnerFailure("INVALID_RUNNER_ARGUMENTS");
  if (input.dryRun) return { status: "planned", executed: false, source: input.source, window: { start: input.start, end: input.end }, maxHttpAttempts, network: false, writes: false, credentialsInspected: false, qualified: "unknown" };
  const id = randomUUID();
  const owner = await acquireRunner(input.output, id, now.toISOString());
  let releaseAttempted = false;
  try {
    const audit = await createAudit(owner.directory, id);
    await publishAudit(audit, "started.json", { version: 1, id, source: input.source, window: { start: input.start, end: input.end }, startedAt: now.toISOString(), status: "started", maxHttpAttempts, wholeRunAttempts: 1 });
    let before: Awaited<ReturnType<typeof readRunnerLedger>> = null;
    let after: Awaited<ReturnType<typeof readRunnerLedger>> = null;
    let current: RunnerLedger["runs"][number] | undefined;
    let status = "failed";
    let reason = "collector_or_store_rejected";
    try {
      await assertCollectorUnlocked(owner.directory);
      before = await readRunnerLedger(owner.directory);
      const evidenceKind = !input.fetcher || input.fetcher === fetch ? "live_api" : "fixture";
      if (before?.runs.some((run) => run.evidenceKind !== evidenceKind)) throw new Error("FIXTURE_LIVE_MIX_REJECTED");
      const result = await cli(args, input.environment ?? process.env, input.fetcher ?? fetch, now, { maxHttpAttempts, sleep: input.sleep });
      const summary = result.text.startsWith("{") ? JSON.parse(result.text) : null;
      after = await readRunnerLedger(owner.directory);
      const candidate = after?.runs.find((run) => run.id === summary?.runId);
      if (candidate && candidate.source === input.source && candidate.start === input.start && candidate.end === input.end && candidate.evidenceKind === evidenceKind && !before?.runs.some((run) => run.id === candidate.id)) current = candidate;
      status = result.code === 0 && current?.status === "complete" ? "complete" : current?.status ?? (summary?.status === "unconfigured" ? "unconfigured" : "failed");
      reason = current?.reason ?? (status === "unconfigured" ? "missing_configuration" : "collector_or_store_rejected");
    } catch (error) { status = "failed"; reason = error instanceof RunnerFailure ? error.reason : "collector_or_store_rejected"; }
    try { await owner.release(); }
    catch { status = "failed"; reason = "RUNNER_STORE_REJECTED_MANUAL_REVIEW"; }
    finally { releaseAttempted = true; }
    const report = runnerReport(before, after, current, input.source, input.start, input.end);
    const alert = runnerAlerts(after ?? before, current, status, now);
    await publishAudit(audit, "diff.json", report);
    await publishAudit(audit, "alert.json", alert);
    const result = { version: 1, id, status, reason, executed: true, successful: status === "complete", source: input.source, window: { start: input.start, end: input.end }, finishedAt: new Date().toISOString(), maxHttpAttempts, wholeRunAttempts: 1, report, alert, qualified: "unknown" };
    await publishAudit(audit, "result.json", result);
    return result;
  } finally { if (!releaseAttempted) await owner.release(); }
}

export async function runnerCli(args: string[], environment?: Record<string, string | undefined>, fetcher?: typeof fetch, now?: Date): Promise<{ code: number; text: string }> {
  if (args.length === 1 && args[0] === "--help") return { code: 0, text: RUNNER_HELP };
  try {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
      source: { type: "string" }, start: { type: "string" }, end: { type: "string" }, output: { type: "string" }, execute: { type: "boolean" }, "dry-run": { type: "boolean" }, "max-http-attempts": { type: "string" },
      ...Object.fromEntries(stringOptions.map((name) => [name, { type: "string" as const }])), ...Object.fromEntries(booleanOptions.map((name) => [name, { type: "boolean" as const }])),
    } });
    if (!values.source || !values.start || !values.end || !values.output) throw new RunnerFailure("INVALID_RUNNER_ARGUMENTS");
    const parsed: Record<string, string | boolean | undefined> = values;
    const collectorOptions = Object.fromEntries([...stringOptions, ...booleanOptions].filter((name) => parsed[name] !== undefined).map((name) => [name, parsed[name]])) as CollectorOptions;
    const result = await runBounded({ source: values.source as Input["source"], start: values.start as string, end: values.end as string, output: values.output as string, execute: values.execute as boolean | undefined, dryRun: values["dry-run"] as boolean | undefined, maxHttpAttempts: values["max-http-attempts"] === undefined ? 3 : Number(values["max-http-attempts"]), collectorOptions, environment, fetcher, now });
    return { code: result.status === "complete" || result.status === "planned" ? 0 : 2, text: JSON.stringify(result) };
  } catch (error) {
    return { code: 1, text: JSON.stringify({ status: "failed", reason: error instanceof RunnerFailure ? error.reason : "RUNNER_REJECTED_DETAILS_REDACTED", successful: false, qualified: "unknown" }) };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runnerCli(process.argv.slice(2)).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
}
