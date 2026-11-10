import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { basename, relative, sep } from "node:path";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { canonical, digest } from "./model";
import { deliveryLock, privateDirectory, publishReceipt, readPrivateJson } from "./delivery-files";
import { receiptSchema, validateDeliveryAudit } from "./delivery-schema";

export const DELIVERY_HELP = `WP02 人工、单次 webhook 交接（不是 Hermes/飞书接入）。
Usage: TSX_DISABLE_CACHE=1 node --import tsx scripts/seo-data/delivery.ts
  --audit-dir /private/outside-repo/runner-UUID --state-dir /private/outside-repo/delivery
  --webhook-env WEBHOOK_ENV_NAME [--token-env TOKEN_ENV_NAME] [--dry-run | --execute [--allow-test]]
默认 help / dry-run：无网络、无写入、不读环境凭据，不读取 config 或 .env。
目录必须预先存在且 owner-only 0700，审计/receipt 为0600；拒绝 symlink、仓库内和意外 schema。
仅接受可确认 live_api 的 PR6 审计；fixture/未知证据始终拒绝，包括 --allow-test。
--execute 才从显式指定 env 名读取 HTTPS endpoint / 可选 Bearer token；禁止 argv token。
--allow-test 必须配 --execute，将送达演练明确标为 delivery_test_not_production_alert。
--timeout-ms 10..30000（默认5000）；--max-attempts 1..3（默认1），仅临时错误重试。
无重定向；仅公网 IPv4 / 域名（生产 DNS 检查所有地址，保守拒绝 IPv6）；不担保 DNS 重绑定。
独立 pending / acknowledged receipt，2xx 仅表示 HTTP 接收，不表示人已读。
稳定 Idempotency-Key，at-least-once，不保证 exactly-once；重复 ack 不再发。
锁/临时文件崩溃残留或所有权变化 fail-closed，必须人工复核；不自动清锁。
不改 alert.json；无恢复通知、cron、队列、后台 worker 或生产验收声明。`;

type Dependencies = { environment?: Record<string, string | undefined>; fetcher?: typeof fetch; resolveHost?: (hostname: string) => Promise<string[]>; sleep?: (milliseconds: number) => Promise<void> };
const envName = /^[A-Z][A-Z0-9_]{0,127}$/;
function publicIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [first, second, third] = address.split(".").map(Number);
  return !(first === 0 || first === 10 || first === 127 || first >= 224 || first === 100 && second >= 64 && second <= 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && (second === 168 || second === 0 || second === 88 && third === 99) || first === 198 && (second === 18 || second === 19 || second === 51 && third === 100) || first === 203 && second === 0 && third === 113);
}
function endpoint(value: string | undefined) {
  if (!value || value.length > 4096 || value !== value.trim() || /[\s\\?#]/.test(value)) throw new Error("TARGET_REJECTED");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.port && url.port !== "443") throw new Error("TARGET_REJECTED");
  if (isIP(url.hostname) ? !publicIPv4(url.hostname) : !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname) || /\.(?:localhost|local|internal|test|invalid|home|lan)$/.test(url.hostname)) throw new Error("TARGET_REJECTED");
  return url;
}

async function boundedRequest(url: URL, init: RequestInit, timeout: number, fetcher: typeof fetch, assertLock: () => Promise<void>, resolveHost?: Dependencies["resolveHost"]) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error("TIMEOUT")); }, timeout);
  });
  try {
    return await Promise.race([deadline, (async () => {
      if (resolveHost) {
        const addresses = await resolveHost(url.hostname);
        if (!addresses.length || addresses.some((address) => !publicIPv4(address))) throw new Error("TARGET_REJECTED");
      }
      await assertLock();
      if (controller.signal.aborted) throw new Error("TIMEOUT");
      const response = await fetcher(url.href, { ...init, signal: controller.signal });
      if (timedOut) { void response.body?.cancel().catch(() => {}); throw new Error("TIMEOUT"); }
      return response;
    })()]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function deliveryCli(args: string[], dependencies: Dependencies = {}): Promise<{ code: number; text: string }> {
  if (!args.length || args.length === 1 && args[0] === "--help") return { code: 0, text: DELIVERY_HELP };
  try {
    const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
      "audit-dir": { type: "string" }, "state-dir": { type: "string" }, "webhook-env": { type: "string" }, "token-env": { type: "string" },
      execute: { type: "boolean" }, "dry-run": { type: "boolean" }, "allow-test": { type: "boolean" }, "timeout-ms": { type: "string" }, "max-attempts": { type: "string" },
    } });
    const attempts = Number(values["max-attempts"] ?? 1);
    const timeout = Number(values["timeout-ms"] ?? 5000);
    if (!values["audit-dir"] || !values["state-dir"] || !values["webhook-env"] || !envName.test(values["webhook-env"]) || values["token-env"] && !envName.test(values["token-env"]) ||
        values.execute && values["dry-run"] || values["allow-test"] && !values.execute || !Number.isInteger(attempts) || attempts < 1 || attempts > 3 || !Number.isInteger(timeout) || timeout < 10 || timeout > 30000) throw new Error("ARGUMENTS_REJECTED");
    const audit = await privateDirectory(values["audit-dir"]);
    const state = await privateDirectory(values["state-dir"]);
    const overlaps = (left: string, right: string) => { const path = relative(left, right); return path === "" || path !== ".." && !path.startsWith(`..${sep}`); };
    if (overlaps(audit.directory, state.directory) || overlaps(state.directory, audit.directory)) throw new Error("DIRECTORIES_OVERLAP");
    const validated = validateDeliveryAudit(...await Promise.all(["started.json", "result.json", "diff.json", "alert.json"].map((name) => readPrivateJson(audit, name))) as [unknown, unknown, unknown, unknown]);
    if (basename(audit.directory) !== `runner-${validated.result.id}`) throw new Error("AUDIT_ID_MISMATCH");
    const mode = values["allow-test"] ? "delivery_test_not_production_alert" as const : "live_alert" as const;
    if (!values.execute) return { code: 0, text: JSON.stringify({ status: "planned", receipt: "not_sent", mode, network: false, writes: false, credentialsInspected: false, reasons: validated.alert.reasons, semantics: "at-least-once" }) };
    if (!validated.alert.reasons.length) return { code: 0, text: JSON.stringify({ status: "skipped", receipt: "not_required", semantics: "at-least-once" }) };
    const environment = dependencies.environment ?? process.env;
    const url = endpoint(environment[values["webhook-env"]]);
    const token = values["token-env"] ? environment[values["token-env"]] : undefined;
    if (values["token-env"] && (!token || !/^[\x21-\x7e]{1,4096}$/.test(token))) throw new Error("AUTH_REJECTED");
    const payload = { version: 1, mode, source: validated.result.source, window: validated.result.window, status: validated.result.status, reasons: validated.alert.reasons, semantics: "at-least-once", qualified: "unknown" };
    const payloadHash = digest(payload);
    const key = digest({ version: 1, audit: digest(validated), target: digest(url.href), mode });
    const pendingName = `${key}.pending.json`;
    const acknowledgedName = `${key}.acknowledged.json`;
    const owner = await deliveryLock(state);
    try {
      const pendingValue = await readPrivateJson(state, pendingName, true);
      const acknowledgedValue = await readPrivateJson(state, acknowledgedName, true);
      const validateReceipt = (value: unknown, status: "pending" | "acknowledged") => {
        const receipt = receiptSchema.parse(value);
        if (receipt.idempotencyKey !== key || receipt.payloadHash !== payloadHash || receipt.mode !== mode || receipt.status !== status) throw new Error("RECEIPT_REJECTED");
        return receipt;
      };
      const pending = pendingValue === undefined ? null : validateReceipt(pendingValue, "pending");
      if (acknowledgedValue !== undefined) {
        if (!pending) throw new Error("RECEIPT_REJECTED");
        validateReceipt(acknowledgedValue, "acknowledged");
        await owner.release();
        return { code: 0, text: JSON.stringify({ status: "already_acknowledged", receipt: "acknowledged", idempotencyKey: key, semantics: "at-least-once" }) };
      }
      const base = { version: 1 as const, idempotencyKey: key, payloadHash, mode, createdAt: new Date().toISOString(), semantics: "at-least-once" as const, acknowledgedMeans: "http_2xx_not_human_read" as const };
      if (!pending) await publishReceipt(state, pendingName, { ...base, status: "pending", httpStatus: null }, owner.assert);
      let httpStatus: number | null = null;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        await owner.assert();
        let retry = false;
        try {
          const resolveHost = dependencies.resolveHost ?? ((!dependencies.fetcher || dependencies.fetcher === fetch) ? async (hostname: string) => (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address) : undefined);
          const response = await boundedRequest(url, { method: "POST", redirect: "error", credentials: "omit", headers: { "Content-Type": "application/json", "Idempotency-Key": key, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: canonical({ ...payload, idempotencyKey: key }) }, timeout, dependencies.fetcher ?? fetch, owner.assert, resolveHost);
          const status = response.status;
          void response.body?.cancel().catch(() => {});
          if (status >= 200 && status < 300) httpStatus = status;
          retry = [408, 425, 429, 500, 502, 503, 504].includes(status);
        } catch (error) {
          const temporaryCodes = ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"];
          const cause = error instanceof Error ? error.cause as NodeJS.ErrnoException | undefined : undefined;
          retry = error instanceof Error && (error.message === "TIMEOUT" || temporaryCodes.includes((error as NodeJS.ErrnoException).code ?? "") || temporaryCodes.includes(cause?.code ?? ""));
        }
        await owner.assert();
        if (httpStatus !== null || !retry || attempt === attempts) break;
        await (dependencies.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))))(100 * attempt);
      }
      if (httpStatus !== null) await publishReceipt(state, acknowledgedName, { ...base, status: "acknowledged", httpStatus }, owner.assert);
      await owner.release();
      return { code: httpStatus !== null ? 0 : 2, text: JSON.stringify({ status: httpStatus !== null ? "accepted" : "not_acknowledged", receipt: httpStatus !== null ? "acknowledged" : "pending", mode, idempotencyKey: key, semantics: "at-least-once", acknowledgedMeans: "http_2xx_not_human_read" }) };
    } finally { await owner.close(); }
  } catch {
    return { code: 1, text: JSON.stringify({ status: "rejected", reason: "DELIVERY_REJECTED_MANUAL_REVIEW_DETAILS_REDACTED", receipt: "not_confirmed", semantics: "at-least-once" }) };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void deliveryCli(process.argv.slice(2)).then((result) => { process.stdout.write(`${result.text}\n`); process.exitCode = result.code; });
}
