import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { basename, relative, sep } from "node:path";
import { z } from "zod";
import { canonical, digest } from "./model";
import { deliveryLock, privateDirectory, publishReceipt, readPrivateJson } from "./delivery-files";
import { validateDeliveryAudit } from "./delivery-schema";
import { chatIdSchema, messageIdSchema, sendNativeCard, type NativeTransportDependencies } from "./native-notify-transport";

export const NATIVE_NOTIFY_HELP = `WP02 一次性原生飞书告警 CLI（供 Hermes 显式调用，不是 worker）。
Usage: TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/native-notify.ts
  --audit-dir /private/outside-repo/runner-UUID --state-dir /private/outside-repo/native-state
  --chat-id oc_CHAT [--dry-run | --execute] [--timeout-ms 5000]
默认 help；省略 --execute 为 dry-run：零网络、零写入、不读凭据。
execute 必须显式指定三个参数；仅从 env FEISHU_APP_ID / FEISHU_APP_SECRET 获取凭据。
不加载 dotenv，不发现 profile；不支持 endpoint、raw、allow-test 或重试开关。
仅固定飞书官方 HTTPS API，无 redirect；单次总网络 deadline 10..30000ms（默认5000）。
严格复用 PR7 live_api 审计校验；fixture/未知证据/raw 拒绝，无 reasons 不发送、不判恢复。
目录预建0700、文件0600、当前用户所有、仓库外、不重叠；不修改源 alert。
pending 先原子落盘；业务 code0 + message_id + 匹配 chat_id 才 acknowledged，不代表已读。
同 payload/target 已确认则零网络；未知发送保留 pending，下次同 uuid；不自动重试。
锁/临时文件异常残留 fail-closed，必须人工复核；at-least-once，不保证 exactly-once。
恢复需先前已送达故障与同 scope/window 真实恢复证据，另行独立验收。`;

export type NativeNotifyDependencies = NativeTransportDependencies & {
  environment?: Record<string, string | undefined>;
  now?: () => Date;
};
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const receiptBase = {
  version: z.literal(1), kind: z.literal("native_feishu_alert"), idempotencyKey: hash, payloadHash: hash, targetHash: hash,
  uuid: z.string().regex(/^[a-f0-9]{32}$/), createdAt: z.string().datetime(), semantics: z.literal("at-least-once"),
  acknowledgedMeans: z.literal("platform_accepted_not_read"),
};
const nativeReceiptSchema = z.discriminatedUnion("status", [
  z.object({ ...receiptBase, status: z.literal("pending"), businessCode: z.null(), messageId: z.null(), acknowledgedAt: z.null() }).strict(),
  z.object({ ...receiptBase, status: z.literal("acknowledged"), businessCode: z.literal(0), messageId: messageIdSchema, acknowledgedAt: z.string().datetime() }).strict(),
]);
const reply = (code: number, status: string, receipt: string) => ({ code, text: JSON.stringify({ status, receipt, semantics: "at-least-once", acknowledgedMeans: "platform_accepted_not_read", recovery: "not_evaluated" }) });
const rejected = () => reply(1, "NATIVE_NOTIFY_REJECTED_MANUAL_REVIEW_DETAILS_REDACTED", "not_confirmed");

function card(audit: ReturnType<typeof validateDeliveryAudit>) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "SEO 数据告警（非恢复通知）" }, template: "red" },
    elements: [{ tag: "div", text: { tag: "plain_text", content: [
      `source: ${audit.result.source}; status: ${audit.result.status}`,
      `reasons: ${audit.alert.reasons.join(", ")}`,
      `window: ${audit.result.window.start} ~ ${audit.result.window.end}`,
      `alertId: ${audit.result.id}`, `scopeHash: ${audit.diff.scopeHash}`, `auditHash: ${digest(audit)}`,
      `coverage: ${audit.diff.coverage.status}; measuredDays: ${audit.diff.coverage.measuredDays}/${audit.diff.coverage.expectedDays}; observationCount: ${audit.diff.coverage.observationCount}`,
      "数据缺失不等于零；计数不代表真实业务零值或增长。",
      "平台接收不代表已读；不判定恢复，qualified=unknown。",
    ].join("\n") } }],
  };
}

export async function nativeNotifyCli(args: string[], dependencies: NativeNotifyDependencies = {}): Promise<{ code: number; text: string }> {
  if (!args.length || args.length === 1 && args[0] === "--help") return { code: 0, text: NATIVE_NOTIFY_HELP };
  try {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
      "audit-dir": { type: "string" }, "state-dir": { type: "string" }, "chat-id": { type: "string" },
      execute: { type: "boolean" }, "dry-run": { type: "boolean" }, "timeout-ms": { type: "string" },
    } });
    const timeout = Number(values["timeout-ms"] ?? 5000);
    if (!values["audit-dir"] || !values["state-dir"] || values.execute && values["dry-run"] || !Number.isInteger(timeout) || timeout < 10 || timeout > 30000) throw new Error("ARGUMENTS_REJECTED");
    const chatId = chatIdSchema.parse(values["chat-id"]);
    const auditDirectory = await privateDirectory(values["audit-dir"]);
    const state = await privateDirectory(values["state-dir"]);
    const overlaps = (left: string, right: string) => { const path = relative(left, right); return path === "" || path !== ".." && !path.startsWith(`..${sep}`); };
    if (overlaps(auditDirectory.directory, state.directory) || overlaps(state.directory, auditDirectory.directory)) throw new Error("DIRECTORIES_OVERLAP");
    const audit = validateDeliveryAudit(...await Promise.all(["started.json", "result.json", "diff.json", "alert.json"].map((name) => readPrivateJson(auditDirectory, name))) as [unknown, unknown, unknown, unknown]);
    if (basename(auditDirectory.directory) !== `runner-${audit.result.id}` || audit.diff.dimensionEncoding === "raw_page_query_private") throw new Error("AUDIT_REJECTED");
    if (!values.execute) return { code: 0, text: JSON.stringify({ status: "planned", receipt: "not_sent", network: false, writes: false, credentialsInspected: false, recovery: "not_evaluated" }) };
    if (!audit.alert.reasons.length) return reply(0, "skipped_no_reasons", "not_required");
    const content = canonical(card(audit));
    const targetHash = digest(chatId);
    const key = digest({ kind: "native_feishu_alert", alertId: audit.result.id, targetHash });
    const uuid = key.slice(0, 32);
    const payloadHash = digest({ content, uuid, targetHash });
    const pendingName = `native-${key}.pending.json`, acknowledgedName = `native-${key}.acknowledged.json`;
    const owner = await deliveryLock(state);
    try {
      const checkReceipt = (value: unknown, status: "pending" | "acknowledged") => {
        const receipt = nativeReceiptSchema.parse(value);
        if (receipt.status !== status || receipt.idempotencyKey !== key || receipt.payloadHash !== payloadHash || receipt.targetHash !== targetHash || receipt.uuid !== uuid) throw new Error("RECEIPT_REJECTED");
        return receipt;
      };
      const pendingValue = await readPrivateJson(state, pendingName, true);
      const acknowledgedValue = await readPrivateJson(state, acknowledgedName, true);
      const pending = pendingValue === undefined ? null : checkReceipt(pendingValue, "pending");
      if (acknowledgedValue !== undefined) {
        const acknowledged = checkReceipt(acknowledgedValue, "acknowledged");
        if (!pending || pending.createdAt !== acknowledged.createdAt || !acknowledged.acknowledgedAt || acknowledged.acknowledgedAt < pending.createdAt) throw new Error("RECEIPT_REJECTED");
        await owner.release();
        return reply(0, "already_acknowledged", "acknowledged");
      }
      const environment = dependencies.environment ?? process.env;
      const appId = environment.FEISHU_APP_ID, appSecret = environment.FEISHU_APP_SECRET;
      if (!appId || !/^cli_[A-Za-z0-9_-]{1,128}$/.test(appId) || !appSecret || !/^[\x21-\x7e]{1,4096}$/.test(appSecret)) {
        await owner.release();
        return rejected();
      }
      const base = { version: 1 as const, kind: "native_feishu_alert" as const, idempotencyKey: key, payloadHash, targetHash, uuid, createdAt: pending?.createdAt ?? (dependencies.now ?? (() => new Date()))().toISOString(), semantics: "at-least-once" as const, acknowledgedMeans: "platform_accepted_not_read" as const };
      if (!pending) await publishReceipt(state, pendingName, nativeReceiptSchema.parse({ ...base, status: "pending", businessCode: null, messageId: null, acknowledgedAt: null }), owner.assert);
      const confirmation = await sendNativeCard({ appId, appSecret, chatId, uuid, content, timeout, assertLock: owner.assert }, dependencies);
      await owner.assert();
      if (confirmation) {
        const acknowledgedAt = (dependencies.now ?? (() => new Date()))().toISOString();
        if (acknowledgedAt < base.createdAt) throw new Error("CLOCK_REJECTED");
        await publishReceipt(state, acknowledgedName, nativeReceiptSchema.parse({ ...base, status: "acknowledged", ...confirmation, acknowledgedAt }), owner.assert);
      }
      await owner.release();
      return reply(confirmation ? 0 : 2, confirmation ? "platform_accepted" : "not_acknowledged", confirmation ? "acknowledged" : "pending");
    } finally { await owner.close(); }
  } catch {
    return rejected();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void nativeNotifyCli(process.argv.slice(2)).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
}
