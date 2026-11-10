// @vitest-environment node
import { chmod, link, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { closeSync, openSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nativeNotifyCli } from "../scripts/seo-data/native-notify";
import { runnerAlerts, runnerReport } from "../scripts/seo-data/runner-report";

const roots: string[] = [];
afterEach(async () => { vi.useRealTimers(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
async function fixture(reasons = true) {
  const root = await mkdtemp(join(tmpdir(), "native-notify-"));
  roots.push(root);
  const id = "00000000-0000-4000-8000-000000000001";
  const audit = join(root, `runner-${id}`), state = join(root, "state");
  await mkdir(audit, { mode: 0o700 });
  await mkdir(state, { mode: 0o700 });
  const window = { start: "2026-03-07", end: "2026-03-07" };
  const alert = { ...runnerAlerts(null, undefined, "failed", new Date()), reasons: reasons ? ["failed"] : [], stale: false, currentLedgerFinishedAt: "2026-11-10T10:00:00.000Z", lastGoodLedgerFinishedAt: "2026-11-10T10:00:00.000Z" };
  const report = { ...runnerReport(null, null, undefined, "gsc", window.start, window.end), evidenceKind: "live_api", scopeHash: "a".repeat(64), dimensionEncoding: "sha256_page_query", coverage: { status: reasons ? "unavailable" : "complete", completeness: reasons ? "incomplete" : "api_exhausted_not_property_totals", measuredDays: reasons ? 0 : 1, expectedDays: 1, observationCount: reasons ? 0 : 1 } };
  const result = { version: 1, id, status: reasons ? "failed" : "complete", reason: reasons ? "collector_or_store_rejected" : "none", executed: true, successful: !reasons, source: "gsc", window, finishedAt: "2026-11-10T10:00:01.000Z", maxHttpAttempts: 3, wholeRunAttempts: 1, report, alert, qualified: "unknown" };
  const started = { version: 1, id, source: "gsc", window, startedAt: "2026-11-10T10:00:00.000Z", status: "started", maxHttpAttempts: 3, wholeRunAttempts: 1 };
  const save = async () => { for (const [name, value] of Object.entries({ started, result, diff: report, alert })) await writeFile(join(audit, `${name}.json`), JSON.stringify(value), { mode: 0o600 }); };
  await save();
  return { root, audit, state, report, save, args: ["--audit-dir", audit, "--state-dir", state, "--chat-id", "oc_target"] };
}
const environment = { FEISHU_APP_ID: "cli_fake", FEISHU_APP_SECRET: "credential-secret" };
const now = () => new Date("2026-11-10T11:00:00.000Z");
const resolveHost = async () => ["93.184.216.34"];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const token = () => json({ code: 0, tenant_access_token: "token-secret" });
const accepted = () => json({ code: 0, data: { message_id: "om_message", chat_id: "oc_target" } });
function transport(send: () => Response | Promise<Response> = accepted) {
  return vi.fn<typeof fetch>(async (_url, init) => init?.headers && "Authorization" in init.headers ? send() : token());
}
const execute = (setup: Awaited<ReturnType<typeof fixture>>, fetcher: typeof fetch, extra: string[] = []) => nativeNotifyCli([...setup.args, "--execute", ...extra], { environment, fetcher, resolveHost, now });
async function receipts(state: string) {
  return Promise.all((await readdir(state)).filter((name) => name.endsWith(".json")).map(async (name) => JSON.parse(await readFile(join(state, name), "utf8"))));
}

describe("bounded native Feishu notification", () => {
  it("success confirms business code and platform id; duplicate is credentials-free/offline", async () => {
    const setup = await fixture();
    const original = await readFile(join(setup.audit, "alert.json"), "utf8");
    const fetcher = transport(async () => { expect((await receipts(setup.state)).map((value) => value.status)).toEqual(["pending"]); return accepted(); });
    expect((await execute(setup, fetcher)).code).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id"]);
    for (const [, init] of fetcher.mock.calls) expect(init).toMatchObject({ redirect: "error", credentials: "omit", method: "POST" });
    const message = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(message).toMatchObject({ receive_id: "oc_target", msg_type: "interactive" });
    expect(message.uuid).toMatch(/^[a-f0-9]{32}$/);
    for (const text of ["failed", "gsc", "2026-03-07", "a".repeat(64), "数据缺失不等于零", "不代表已读"]) expect(message.content).toContain(text);
    const stored = await receipts(setup.state);
    expect(stored.find((value) => value.status === "acknowledged")).toMatchObject({ messageId: "om_message", businessCode: 0, acknowledgedMeans: "platform_accepted_not_read" });
    expect(JSON.stringify(stored)).not.toMatch(/credential-secret|token-secret|open.feishu|数据缺失/);
    const offline = vi.fn();
    expect(await nativeNotifyCli([...setup.args, "--execute"], { fetcher: offline, environment: new Proxy({}, { get() { throw new Error("ENV_ACCESSED"); } }) })).toMatchObject({ code: 0, text: expect.stringContaining("already_acknowledged") });
    expect(offline).not.toHaveBeenCalled();
    expect(await readFile(join(setup.audit, "alert.json"), "utf8")).toBe(original);
  });

  it.each([
    ["business", () => json({ code: 230001, msg: "response-secret" })],
    ["http", () => json({ code: 0 }, 503)],
    ["bad-json", () => new Response("response-secret")],
    ["no-id", () => json({ code: 0, data: { chat_id: "oc_target" } })],
    ["wrong-chat", () => json({ code: 0, data: { message_id: "om_message", chat_id: "oc_other" } })],
    ["wrong-code-type", () => json({ code: "0", data: { message_id: "om_message", chat_id: "oc_target" } })],
    ["network", () => { throw new Error("response-secret credential-secret token-secret"); }],
    ["oversize", () => new Response("response-secret".repeat(10000))],
  ])("%s never acknowledges or retries", async (_label, response) => {
    const setup = await fixture(), fetcher = transport(response);
    const result = await execute(setup, fetcher);
    expect(result.code).toBe(2);
    expect(result.text).not.toMatch(/response-secret|credential-secret|token-secret/);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((await receipts(setup.state)).map((value) => value.status)).toEqual(["pending"]);
    expect(await readdir(setup.state)).not.toContain(".seo-delivery.lock");
    const retry = transport();
    expect((await execute(setup, retry)).code).toBe(0);
    expect(JSON.parse(String(retry.mock.calls[1][1]?.body)).uuid).toBe(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).uuid);
  });

  it.each([() => json({ code: 1, tenant_access_token: "response-secret" }), () => json({ code: 0, tenant_access_token: "" }), () => json({ code: 0 }), () => json({ code: 0, tenant_access_token: "response-secret" }, 401), () => new Response("response-secret")])("token failure never sends", async (response) => {
    const setup = await fixture(), fetcher = vi.fn(async () => response());
    expect((await execute(setup, fetcher)).code).toBe(2);
    expect(fetcher).toHaveBeenCalledOnce();
    expect((await receipts(setup.state)).map((value) => value.status)).toEqual(["pending"]);
  });

  it.each(["fixture", null, "unknown", "raw"])("rejects %s evidence/encoding offline", async (kind) => {
    const setup = await fixture();
    if (kind === "raw") setup.report.dimensionEncoding = "raw_page_query_private";
    else Object.assign(setup.report, { evidenceKind: kind });
    await setup.save();
    const fetcher = transport();
    expect((await execute(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it("no reasons skips without recovery claims", async () => {
    const setup = await fixture(false), fetcher = transport();
    expect(await execute(setup, fetcher)).toMatchObject({ code: 0, text: expect.stringContaining("skipped_no_reasons") });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it("different target isolates uuid and receipt", async () => {
    const setup = await fixture(), first = transport();
    expect((await execute(setup, first)).code).toBe(0);
    setup.args[5] = "oc_second";
    const second = transport(() => json({ code: 0, data: { message_id: "om_second", chat_id: "oc_second" } }));
    expect((await execute(setup, second)).code).toBe(0);
    expect(JSON.parse(String(first.mock.calls[1][1]?.body)).uuid).not.toBe(JSON.parse(String(second.mock.calls[1][1]?.body)).uuid);
    expect(await receipts(setup.state)).toHaveLength(4);
  });

  it("changed payload under same alert id is fail-closed", async () => {
    const setup = await fixture();
    await execute(setup, transport());
    setup.report.scopeHash = "b".repeat(64);
    await setup.save();
    const fetcher = transport();
    expect((await execute(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["replace", "corrupt"])("%s lock during resolver prevents network", async (mode) => {
    const setup = await fixture(), fetcher = transport();
    const lock = join(setup.state, ".seo-delivery.lock");
    const resolver = async () => {
      if (mode === "replace") await rename(lock, join(setup.state, "old-lock"));
      await writeFile(lock, "changed", { mode: 0o600 });
      return ["93.184.216.34"];
    };
    expect((await nativeNotifyCli([...setup.args, "--execute"], { environment, fetcher, resolveHost: resolver })).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(lock, "utf8")).toBe("changed");
  });

  it("deadline includes resolver, prevents late send", async () => {
    const setup = await fixture();
    let finish!: (addresses: string[]) => void;
    const resolver = () => new Promise<string[]>((resolve) => { finish = resolve; });
    const fetcher = transport();
    expect((await nativeNotifyCli([...setup.args, "--execute", "--timeout-ms", "20"], { environment, fetcher, resolveHost: resolver })).code).toBe(2);
    finish(["93.184.216.34"]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["fetch", "body"])("bounds hanging %s ignoring abort", async (stage) => {
    const setup = await fixture();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      signal = init?.signal ?? undefined;
      entered();
      if (stage === "fetch") return new Promise<Response>(() => {});
      return new Response(new ReadableStream({ start() {} }));
    });
    const result = execute(setup, fetcher, ["--timeout-ms", "100"]);
    await ready;
    await vi.advanceTimersByTimeAsync(99);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).code).toBe(2);
    expect(signal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("help and dryrun do not inspect credentials or resolver", async () => {
    const setup = await fixture();
    const dependencies = { environment: new Proxy({}, { get() { throw new Error("ENV_ACCESSED"); } }), fetcher: vi.fn(), resolveHost: vi.fn() };
    for (const args of [[], ["--help"], setup.args, [...setup.args, "--dry-run"]]) expect((await nativeNotifyCli(args, dependencies)).code).toBe(0);
    expect(dependencies.fetcher).not.toHaveBeenCalled();
    expect(dependencies.resolveHost).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it("real CLI help/dryrun/missing credentials stay offline", async () => {
    const setup = await fixture();
    for (const args of [[], setup.args, [...setup.args, "--execute"], [...setup.args, "--endpoint", "https://evil.invalid"], [...setup.args, "--allow-test"]]) {
      const stdout = join(setup.root, "stdout"), stderr = join(setup.root, "stderr");
      const descriptors = [openSync(stdout, "w", 0o600), openSync(stderr, "w", 0o600)];
      const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/seo-data/native-notify.ts", ...args], { env: { PATH: process.env.PATH, NODE_ENV: "test", TSX_DISABLE_CACHE: "1" }, timeout: 15000, stdio: ["ignore", ...descriptors] });
      descriptors.forEach(closeSync);
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(args.includes("--execute") || args.includes("--endpoint") || args.includes("--allow-test") ? 1 : 0);
      expect(await readFile(stdout, "utf8") + await readFile(stderr, "utf8")).not.toMatch(/credential-secret|token-secret/);
    }
    expect(await readdir(setup.state)).toEqual([]);
  });

  it.each(["permissions", "symlink", "hardlink", "residue", "lock", "overlap", "audit-name", "owner"])("rejects unsafe %s without HTTP", async (kind) => {
    const setup = await fixture(), fetcher = transport();
    if (kind === "permissions") await chmod(setup.state, 0o755);
    if (kind === "symlink") { await rm(setup.state, { recursive: true }); await symlink(setup.audit, setup.state); }
    if (kind === "hardlink") await link(join(setup.audit, "alert.json"), join(setup.root, "alert-link"));
    if (kind === "residue") await writeFile(join(setup.state, ".delivery-orphan.tmp"), "orphan", { mode: 0o600 });
    if (kind === "lock") await writeFile(join(setup.state, ".seo-delivery.lock"), "orphan", { mode: 0o600 });
    if (kind === "overlap") setup.args[3] = setup.audit;
    if (kind === "audit-name") { const moved = join(setup.root, "wrong"); await rename(setup.audit, moved); setup.args[1] = moved; }
    const originalUid = process.getuid;
    if (kind === "owner") process.getuid = () => (originalUid?.() ?? 0) + 1;
    try { expect((await execute(setup, fetcher)).code).toBe(1); }
    finally { process.getuid = originalUid; }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["pending-schema", "orphan-ack", "ack-business", "ack-content", "ack-permissions"])("rejects %s receipt without HTTP", async (kind) => {
    const setup = await fixture();
    expect((await execute(setup, transport())).code).toBe(0);
    const names = await readdir(setup.state);
    const pending = join(setup.state, names.find((name) => name.includes(".pending."))!);
    const ack = join(setup.state, names.find((name) => name.includes(".acknowledged."))!);
    expect((await stat(pending)).mode & 0o777).toBe(0o600);
    expect((await stat(ack)).mode & 0o777).toBe(0o600);
    if (kind === "pending-schema") await writeFile(pending, JSON.stringify({ secret: "response-secret" }));
    if (kind === "orphan-ack") await rm(pending);
    if (kind === "ack-business") await writeFile(ack, JSON.stringify({ ...JSON.parse(await readFile(ack, "utf8")), businessCode: 1 }));
    if (kind === "ack-content") await writeFile(ack, JSON.stringify({ ...JSON.parse(await readFile(ack, "utf8")), messageContent: "response-secret" }));
    if (kind === "ack-permissions") await chmod(ack, 0o644);
    const fetcher = transport();
    const result = await execute(setup, fetcher);
    expect(result.code).toBe(1);
    expect(result.text).not.toContain("response-secret");
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toContain(".seo-delivery.lock");
  });

  it.each([{ addresses: [] }, { addresses: ["127.0.0.1"] }, { addresses: ["93.184.216.34", "10.0.0.1"] }, { addresses: ["::1"] }])("rejects unsafe DNS %j", async ({ addresses }) => {
    const setup = await fixture(), fetcher = transport();
    expect((await nativeNotifyCli([...setup.args, "--execute"], { environment, fetcher, resolveHost: async () => addresses })).code).toBe(2);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("real CLI fixture execute uses only fake transport, including secret-bearing failures", async () => {
    const setup = await fixture();
    for (const behavior of ["failure", "success", "duplicate"]) {
      const stdout = join(setup.root, "stdout"), stderr = join(setup.root, "stderr");
      const descriptors = [openSync(stdout, "w", 0o600), openSync(stderr, "w", 0o600)];
      const child = spawnSync(process.execPath, ["--import", "tsx", "tests/fixtures/seo-native-notify-cli.ts", behavior, ...setup.args, "--execute"], { env: { PATH: process.env.PATH, NODE_ENV: "test", TSX_DISABLE_CACHE: "1" }, timeout: 15000, stdio: ["ignore", ...descriptors] });
      descriptors.forEach(closeSync);
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(behavior === "failure" ? 2 : 0);
      expect(await readFile(stdout, "utf8") + await readFile(stderr, "utf8")).not.toMatch(/credential-secret|token-secret|response-secret|open.feishu|数据缺失/);
    }
    expect(await receipts(setup.state)).toHaveLength(2);
  });

  it("one shared deadline bounds token plus unknown send; subsequent retry uses same uuid", async () => {
    const setup = await fixture();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let tokenEntered!: () => void, sendEntered!: () => void, finishToken!: (response: Response) => void;
    const tokenReady = new Promise<void>((resolve) => { tokenEntered = resolve; });
    const sendReady = new Promise<void>((resolve) => { sendEntered = resolve; });
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      signal = init?.signal ?? undefined;
      if (init?.headers && "Authorization" in init.headers) { sendEntered(); return new Promise<Response>(() => {}); }
      tokenEntered();
      return new Promise<Response>((resolve) => { finishToken = resolve; });
    });
    const result = execute(setup, fetcher, ["--timeout-ms", "100"]);
    await tokenReady;
    await vi.advanceTimersByTimeAsync(80);
    finishToken(token());
    await sendReady;
    await vi.advanceTimersByTimeAsync(19);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).code).toBe(2);
    expect(signal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((await receipts(setup.state)).map((value) => value.status)).toEqual(["pending"]);
    vi.useRealTimers();
    const retry = transport();
    expect((await execute(setup, retry)).code).toBe(0);
    expect(JSON.parse(String(retry.mock.calls[1][1]?.body)).uuid).toBe(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).uuid);
  });

  it("ack publication collision leaves pending/lock/temp and blocks the next invocation", async () => {
    const setup = await fixture();
    const fetcher = transport(async () => {
      const pending = (await readdir(setup.state)).find((name) => name.includes(".pending."))!;
      await mkdir(join(setup.state, pending.replace(".pending.", ".acknowledged.")), { mode: 0o700 });
      return accepted();
    });
    expect((await execute(setup, fetcher)).code).toBe(1);
    const files = await readdir(setup.state);
    expect(files).toContain(".seo-delivery.lock");
    expect(files.some((name) => name.startsWith(".delivery-"))).toBe(true);
    expect(files.some((name) => name.includes(".pending."))).toBe(true);
    const retry = transport();
    expect((await execute(setup, retry)).code).toBe(1);
    expect(retry).not.toHaveBeenCalled();
  });

  it("directory ownership identity is rechecked after send", async () => {
    const setup = await fixture();
    const fetcher = transport(async () => {
      await rename(setup.state, join(setup.root, "old-state"));
      await mkdir(setup.state, { mode: 0o700 });
      return accepted();
    });
    expect((await execute(setup, fetcher)).code).toBe(1);
    expect(await readdir(setup.state)).toEqual([]);
    expect((await receipts(join(setup.root, "old-state"))).map((value) => value.status)).toEqual(["pending"]);
  });
});
