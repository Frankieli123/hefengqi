import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { addCalendarDays, dateRange, dayBounds, sourceDate, timezoneFor } from "./model";

export const HELP = `只读调度计划预演（未启用，不执行采集/网络/shell/写文件/cron，不读取环境或凭据）
用法: TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/schedule-plan.ts --dry-run --now UTC_ISO --start YYYY-MM-DD --end YYYY-MM-DD --source gsc|umami --review-start YYYY-MM-DD --review-end YYYY-MM-DD [--configured] [--coverage unknown|partial|complete]
--help 仅帮助；其他调用必须显式 --dry-run 与全部时间窗口。
--configured 仅操作者声明配置已具备，不检查/使用配置，不代表 live 验收。
--coverage 仅操作者声明已有证据覆盖（默认 unknown），不代表读取了账本。
start/end 与 review-start/review-end 均为来源时区完整日的闭区间。
GSC: America/Los_Angeles，成熟阈值 3 PT 日；每个来源日 +7 PT 日复查，非最终性保证。
Umami: Asia/Shanghai，只计划完整日，事件精确性仍须现有 live probes。
日采集/显式回补/周报告警只给接入建议；无任务入队、无持续运行声明。`;
export function planCli(args: string[]): { code: number; text: string } {
  try {
    if (args.length === 1 && args[0] === "--help") return { code: 0, text: HELP };
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: { "dry-run": { type: "boolean" }, now: { type: "string" }, start: { type: "string" }, end: { type: "string" }, source: { type: "string" }, "review-start": { type: "string" }, "review-end": { type: "string" }, configured: { type: "boolean" }, coverage: { type: "string" } } });
    if (!values["dry-run"] || !values.now || !values.start || !values.end || !values.source || !values["review-start"] || !values["review-end"] || !["gsc", "umami"].includes(values.source)) throw new Error("EXPLICIT_DRY_RUN_OPTIONS_REQUIRED");
    const now = new Date(z.iso.datetime().parse(values.now));
    const source = values.source as "gsc" | "umami"; const timezone = timezoneFor(source); const dates = dateRange(values.start, values.end, timezone, now);
    const reviewDates = dateRange(values["review-start"], values["review-end"], timezone, now);
    const coverage = z.enum(["unknown", "partial", "complete"]).parse(values.coverage ?? "unknown");
    const today = sourceDate(now, timezone);
    const matureThrough = addCalendarDays(today, source === "gsc" ? -3 : -1);
    const bounds = (date: string) => {
      const [start, end] = dayBounds(date, timezone);
      return { startUtc: new Date(start).toISOString(), endUtc: new Date(end).toISOString() };
    };
    const days = dates.map((date) => ({ date, ...bounds(date), eligibility: date <= matureThrough ? "eligible" : "maturity_pending", collection: !values.configured ? "blocked_missing_configuration" : date <= matureThrough ? "planned_only" : "blocked_maturity", ...(source === "gsc" ? { recheckOn: addCalendarDays(date, 7) } : {}) }));
    const reviews = reviewDates.map((date) => ({ date, ...bounds(date), ...(source === "gsc" ? { recheckOn: addCalendarDays(date, 7), due: addCalendarDays(date, 7) <= today } : { policy: "rerun_requires_fresh_exactness_probes" }) }));
    return { code: 0, text: JSON.stringify({ executed: false, enabled: false, researchReady: false, now: now.toISOString(), source, timezone, range: { start: values.start, end: values.end }, reviewWindow: { start: values["review-start"], end: values["review-end"] }, matureThrough, maturityIsFinality: false, configuration: values.configured ? "operator_asserted_not_verified" : "missing", coverage, partialPolicy: "block_complete_claims_and_alert", completeClaimsAllowed: false, days, reviews, taskQueueHandoff: { registered: false, daily: "authorized runner calls existing collector with explicit range", backfill: "explicit overlapping range; preserve partial and deduplicate existing ledger", weekly: "authorized runner summarizes reviewed evidence; alert missing configuration, partial/unavailable data and stale runs" } }, null, 2) };
  } catch { return { code: 1, text: "INVALID_PLAN: 显式选项/UTC时间/完整来源日窗口或覆盖声明无效；未执行任何任务。" }; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { const result = planCli(process.argv.slice(2)); process.stdout.write(`${result.text}\n`); process.exitCode = result.code; }
