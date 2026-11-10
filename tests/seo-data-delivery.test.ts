// @vitest-environment node
import { chmod, link, mkdir, mkdtemp, readFile, readdir, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { deliveryCli } from "../scripts/seo-data/delivery";
import { runnerAlerts, runnerReport } from "../scripts/seo-data/runner-report";

async function fixture(reasons = true) {
  const root = await mkdtemp(join(tmpdir(), "wp02-delivery-"));
  const audit = join(root, "runner-00000000-0000-4000-8000-000000000001");
  const state = join(root, "state");
  await mkdir(audit, { mode: 0o700 });
  await mkdir(state, { mode: 0o700 });
  const window = { start: "2026-03-07", end: "2026-03-07" };
  const alert = { ...runnerAlerts(null, undefined, "failed", new Date()), reasons: reasons ? ["failed"] : [], stale: false, currentLedgerFinishedAt: "2026-11-10T10:00:00.000Z", lastGoodLedgerFinishedAt: "2026-11-10T10:00:00.000Z" };
  const report = { ...runnerReport(null, null, undefined, "gsc", window.start, window.end), evidenceKind: "live_api", scopeHash: "a".repeat(64), dimensionEncoding: "sha256_page_query", coverage: { status: reasons ? "unavailable" : "complete", completeness: reasons ? "incomplete" : "api_exhausted_not_property_totals", measuredDays: reasons ? 0 : 1, expectedDays: 1, observationCount: reasons ? 0 : 1 } };
  const id = "00000000-0000-4000-8000-000000000001";
  const result = { version: 1, id, status: reasons ? "failed" : "complete", reason: reasons ? "collector_or_store_rejected" : "none", executed: true, successful: !reasons, source: "gsc", window, finishedAt: "2026-11-10T10:00:01.000Z", maxHttpAttempts: 3, wholeRunAttempts: 1, report, alert, qualified: "unknown" };
  const started = { version: 1, id, source: "gsc", window, startedAt: "2026-11-10T10:00:00.000Z", status: "started", maxHttpAttempts: 3, wholeRunAttempts: 1 };
  for (const [name, value] of Object.entries({ started, result, diff: report, alert })) await writeFile(join(audit, `${name}.json`), JSON.stringify(value), { mode: 0o600 });
  const args = ["--audit-dir", audit, "--state-dir", state, "--webhook-env", "TEST_WEBHOOK", "--token-env", "TEST_TOKEN"];
  const environment = { TEST_WEBHOOK: "https://hooks.example.org/private-hook", TEST_TOKEN: "offline-secret" };
  return { root, audit, state, args, environment, result };
}
const ok = () => new Response(null, { status: 204 });
const send = (setup: Awaited<ReturnType<typeof fixture>>, fetcher: typeof fetch, options: string[] = []) => deliveryCli([...setup.args, "--execute", ...options], { environment: setup.environment, fetcher, sleep: async () => {} });

describe("manual delivery", () => {
  it("a lock replaced during DNS preflight prevents the HTTP request", async () => {
    const setup = await fixture();
    const lock = join(setup.state, ".seo-delivery.lock");
    const fetcher = vi.fn(async () => ok());
    const resolveHost = async () => {
      await unlink(lock);
      await writeFile(lock, "replacement", { mode: 0o600 });
      return ["93.184.216.34"];
    };
    expect((await deliveryCli([...setup.args, "--execute"], { environment: setup.environment, fetcher, resolveHost })).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(lock, "utf8")).toBe("replacement");
  });

  it("an in-place corrupted lock never produces ack or deletes the changed lock", async () => {
    const setup = await fixture();
    const lock = join(setup.state, ".seo-delivery.lock");
    const fetcher = vi.fn(async () => { await writeFile(lock, "corrupted"); return ok(); });
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(await readFile(lock, "utf8")).toBe("corrupted");
    expect((await readdir(setup.state)).some((name) => name.includes("acknowledged"))).toBe(false);
  });

  it.each([{ addresses: ["127.0.0.1"] }, { addresses: ["10.0.0.1"] }, { addresses: ["93.184.216.34", "192.168.1.1"] }, { addresses: ["::1"] }, { addresses: [] }])("rejects unsafe DNS answers %j without fetching", async ({ addresses }) => {
    const setup = await fixture();
    const fetcher = vi.fn();
    const resolveHost = vi.fn(async () => addresses);
    const result = await deliveryCli([...setup.args, "--execute", "--max-attempts", "3"], { environment: setup.environment, fetcher, resolveHost });
    expect(result.code).toBe(2);
    expect(resolveHost).toHaveBeenCalledOnce();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("DNS preflight is covered by the request deadline and never sends after timeout", async () => {
    const setup = await fixture();
    let finish: (addresses: string[]) => void = () => {};
    const resolveHost = () => new Promise<string[]>((resolve) => { finish = resolve; });
    const fetcher = vi.fn();
    expect((await deliveryCli([...setup.args, "--execute", "--timeout-ms", "10"], { environment: setup.environment, fetcher, resolveHost })).code).toBe(2);
    finish(["93.184.216.34"]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([null, {}, { status: "acknowledged", endpoint: "secret" }])("rejects malformed existing ack %j before sending", async (value) => {
    const setup = await fixture();
    const first = await send(setup, async () => ok());
    const key = JSON.parse(first.text).idempotencyKey;
    await writeFile(join(setup.state, `${key}.acknowledged.json`), JSON.stringify(value));
    const fetcher = vi.fn(async () => ok());
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("concurrent execution fails closed under the state lock", async () => {
    const setup = await fixture();
    let finish: (response: Response) => void = () => {};
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const first = send(setup, fetcher);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect((await send(setup, async () => { throw new Error("SECOND_REQUEST"); })).code).toBe(1);
    finish(ok());
    expect((await first).code).toBe(0);
  });

  it("real fixture CLI execute/repeat uses injected fetch only", async () => {
    const setup = await fixture();
    for (const repeat of [false, true]) {
      const { openSync, closeSync } = await import("node:fs");
      const output = join(setup.root, `execute-${repeat}`);
      const descriptor = openSync(output, "w", 0o600);
      const child = spawnSync(process.execPath, ["--import", "tsx", "tests/fixtures/seo-delivery-cli.ts", "ok", ...setup.args, "--execute", "--allow-test"], { env: { PATH: process.env.PATH, NODE_ENV: "test", TSX_DISABLE_CACHE: "1" }, stdio: ["ignore", descriptor, descriptor], timeout: 15000 });
      closeSync(descriptor);
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      const result = JSON.parse(await readFile(output, "utf8"));
      expect(result.receipt).toBe("acknowledged");
      expect(result.status).toBe(repeat ? "already_acknowledged" : "accepted");
    }
  });

  it("real CLI crash leaves pending and a lock requiring manual review", async () => {
    const setup = await fixture();
    const child = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/seo-delivery-cli.ts", "hang", ...setup.args, "--execute"], { env: { PATH: process.env.PATH, NODE_ENV: "test", TSX_DISABLE_CACHE: "1" }, stdio: "ignore" });
    const exited = new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
    try {
      await vi.waitFor(async () => expect((await readdir(setup.state)).some((name) => name.endsWith(".pending.json"))).toBe(true), { timeout: 10000 });
    } finally { child.kill("SIGKILL"); await exited; }
    const fetcher = vi.fn();
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toContain(".seo-delivery.lock");
  });

  it("help/default/dryrun never read env, fetch or write", async () => {
    const setup = await fixture();
    const environment = new Proxy({}, { get() { throw new Error("ENV_READ"); } });
    const fetcher = vi.fn();
    for (const args of [[], ["--help"], setup.args, [...setup.args, "--dry-run"]]) expect((await deliveryCli(args, { environment, fetcher })).code).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it("first/repeat: separate private receipts, stable key, no second send or alert edit", async () => {
    const setup = await fixture();
    const original = await readFile(join(setup.audit, "alert.json"), "utf8");
    const fetcher = vi.fn(async () => ok());
    const first = await send(setup, fetcher);
    expect(first.code).toBe(0);
    expect(JSON.parse(first.text).receipt).toBe("acknowledged");
    expect((await send(setup, fetcher)).code).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await readFile(join(setup.audit, "alert.json"), "utf8")).toBe(original);
    const request = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(request[1].redirect).toBe("error");
    expect(JSON.stringify(request[1].body)).not.toMatch(/property|dimensions|private-hook|offline-secret/);
    expect(first.text).not.toMatch(/response-secret|offline-secret|private-hook/);
    expect((await readdir(setup.state)).filter((name) => name.endsWith(".json"))).toHaveLength(2);
  });

  it("failure stays pending; subsequent invocation retries the same key", async () => {
    const setup = await fixture();
    const failed = vi.fn(async () => new Response("secret", { status: 503 }));
    const first = await send(setup, failed, ["--max-attempts", "2"]);
    expect(first.code).toBe(2);
    expect(failed).toHaveBeenCalledTimes(2);
    const recovered = vi.fn(async () => ok());
    const second = await send(setup, recovered);
    expect(second.code).toBe(0);
    expect(JSON.parse(first.text).idempotencyKey).toBe(JSON.parse(second.text).idempotencyKey);
  });

  it.each([401, 403, 400, 302, 501])("permanent HTTP %s is not retried or acknowledged", async (status) => {
    const setup = await fixture();
    const fetcher = vi.fn(async () => new Response("secret", { status }));
    expect((await send(setup, fetcher)).code).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await readdir(setup.state)).some((name) => name.includes("acknowledged"))).toBe(false);
  });

  it("timeout is bounded even when injected fetch ignores abort", async () => {
    const setup = await fixture();
    const started: Array<() => void> = [];
    const requests = Array.from({ length: 2 }, () => new Promise<void>((resolve) => { started.push(resolve); }));
    const fetcher = vi.fn<typeof fetch>(() => {
      started[fetcher.mock.calls.length - 1]();
      return new Promise<Response>(() => {});
    });
    const resolveHost = vi.fn(async () => ["93.184.216.34"]);
    const sleep = vi.fn(async () => {});
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const delivery = deliveryCli([...setup.args, "--execute", "--timeout-ms", "10", "--max-attempts", "2"], { environment: setup.environment, fetcher, resolveHost, sleep });
      for (const [index, request] of requests.entries()) {
        await request;
        expect(fetcher).toHaveBeenCalledTimes(index + 1);
        expect(resolveHost).toHaveBeenCalledTimes(index + 1);
        const signal = fetcher.mock.calls[index][1]?.signal;
        expect(signal?.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(9);
        expect(signal?.aborted).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(signal?.aborted).toBe(true);
      }
      const result = await delivery;
      expect(result.code).toBe(2);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(fetcher.mock.calls[0][1]?.headers).toEqual(fetcher.mock.calls[1][1]?.headers);
      expect(sleep).toHaveBeenCalledExactlyOnceWith(100);
      expect(JSON.parse(result.text).receipt).toBe("pending");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lock conflict and replaced lock fail closed without deleting replacement", async () => {
    const setup = await fixture();
    const lock = join(setup.state, ".seo-delivery.lock");
    await writeFile(lock, "crash", { mode: 0o600 });
    const fetcher = vi.fn(async () => ok());
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    await unlink(lock);
    const replaced = vi.fn(async () => {
      await unlink(lock);
      await writeFile(lock, "replacement", { mode: 0o600 });
      return ok();
    });
    expect((await send(setup, replaced)).code).toBe(1);
    expect(await readFile(lock, "utf8")).toBe("replacement");
    expect((await readdir(setup.state)).some((name) => name.includes("acknowledged"))).toBe(false);
  });

  it("response body/errors never reach output or receipt", async () => {
    const setup = await fixture();
    const response = new Response("response-secret");
    const text = vi.spyOn(response, "text");
    const result = await send(setup, async () => response);
    expect(text).not.toHaveBeenCalled();
    for (const name of await readdir(setup.state)) expect(await readFile(join(setup.state, name), "utf8")).not.toMatch(/secret|private-hook/);
    expect(result.text).not.toMatch(/secret|private-hook/);
  });

  it("empty reasons + successful skips without credentials", async () => {
    const setup = await fixture(false);
    const fetcher = vi.fn();
    const result = await deliveryCli([...setup.args, "--execute"], { environment: new Proxy({}, { get() { throw new Error("ENV_READ"); } }), fetcher });
    expect(JSON.parse(result.text).receipt).toBe("not_required");
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it.each([false, true])("fixture audit rejected even allow-test=%s", async (allowTest) => {
    const setup = await fixture();
    setup.result.report.evidenceKind = "fixture";
    await writeFile(join(setup.audit, "result.json"), JSON.stringify(setup.result));
    await writeFile(join(setup.audit, "diff.json"), JSON.stringify(setup.result.report));
    const fetcher = vi.fn();
    expect((await send(setup, fetcher, allowTest ? ["--allow-test"] : [])).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("failed result without reasons fails closed", async () => {
    const setup = await fixture(false);
    await writeFile(join(setup.audit, "result.json"), JSON.stringify({ ...setup.result, status: "failed", successful: false }));
    const fetcher = vi.fn();
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("temporary connection errors retry with the same key; secret error is never printed", async () => {
    const setup = await fixture();
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("private-hook offline-secret", { cause: Object.assign(new Error("secret"), { code: "ECONNRESET" }) }))
      .mockResolvedValueOnce(ok());
    const result = await send(setup, fetcher, ["--max-attempts", "2"]);
    expect(result.code).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual(fetcher.mock.calls[1][1]?.headers);
    expect(result.text).not.toMatch(/secret|private-hook/);
  });

  it("receipt files stay owner-only and normal completion removes its lock", async () => {
    const setup = await fixture();
    await send(setup, async () => ok());
    for (const name of await readdir(setup.state)) expect((await stat(join(setup.state, name))).mode & 0o777).toBe(0o600);
    expect(await readdir(setup.state)).not.toContain(".seo-delivery.lock");
  });

  it("accepts the PR6 complete coverage vocabulary without inspecting credentials", async () => {
    const setup = await fixture(false);
    const report = { ...setup.result.report, dimensionEncoding: "sha256_page_query", scopeHash: "a".repeat(64), coverage: { status: "complete", completeness: "api_exhausted_not_property_totals", measuredDays: 1, expectedDays: 1, observationCount: 1 }, comparison: { status: "not_comparable", reason: "no_compatible_window" } };
    await writeFile(join(setup.audit, "result.json"), JSON.stringify({ ...setup.result, report }));
    await writeFile(join(setup.audit, "diff.json"), JSON.stringify(report));
    expect((await deliveryCli(setup.args, { environment: new Proxy({}, { get() { throw new Error("ENV_READ"); } }) })).code).toBe(0);
  });

  it("does not retry non-transient fetch TypeError such as redirect rejection", async () => {
    const setup = await fixture();
    const fetcher = vi.fn(async () => { throw new TypeError("fetch failed", { cause: new Error("unexpected redirect") }); });
    expect((await send(setup, fetcher, ["--max-attempts", "3"])).code).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("explicit rehearsal labels payload and uses different idempotency scope", async () => {
    const setup = await fixture();
    const fetcher = vi.fn(async () => ok());
    const rehearsal = await send(setup, fetcher, ["--allow-test"]);
    const live = await send(setup, fetcher);
    expect(rehearsal.code).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(rehearsal.text).idempotencyKey).not.toBe(JSON.parse(live.text).idempotencyKey);
    expect(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain("delivery_test_not_production_alert");
  });

  it.each(["http://example.org/h", "https://user:pass@example.org/h", "https://example.org/h?q=x", "https://example.org/h#x", "https://127.0.0.1/h", "https://10.0.0.1/h", "https://[::1]/h", "https://localhost/h", "https://2130706433/h", "https://0177.0.0.1/h", "https://169.254.169.254/h", "https://172.16.0.1/h", "https://192.168.1.1/h", "https://100.64.0.1/h", "https://[::ffff:127.0.0.1]/h", "https://example.org/h?", "https://example.org/h#", "https://foo.local/h"]) ("rejects unsafe target %s", async (target) => {
    const setup = await fixture();
    setup.environment.TEST_WEBHOOK = target;
    const fetcher = vi.fn();
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readdir(setup.state)).toEqual([]);
  });

  it.each(["symlink", "permissions", "oversize", "schema", "state-symlink", "same-dir", "hardlink", "wide-state", "wide-audit", "missing", "nested-schema", "mismatch", "repository"]) ("rejects unsafe input %s", async (kind) => {
    const setup = await fixture();
    const path = join(setup.audit, "result.json");
    if (kind === "symlink") { await unlink(path); await symlink(join(setup.audit, "alert.json"), path); }
    if (kind === "permissions") await chmod(path, 0o644);
    if (kind === "oversize") await writeFile(path, " ".repeat(65537));
    if (kind === "schema") await writeFile(path, JSON.stringify({ ...setup.result, property: "private" }));
    if (kind === "state-symlink") { const alias = join(setup.root, "alias"); await symlink(setup.state, alias); setup.args[3] = alias; }
    if (kind === "same-dir") setup.args[3] = setup.audit;
    if (kind === "hardlink") await link(path, join(setup.root, "other-link"));
    if (kind === "wide-state") await chmod(setup.state, 0o755);
    if (kind === "wide-audit") await chmod(setup.audit, 0o755);
    if (kind === "missing") await unlink(path);
    if (kind === "nested-schema") await writeFile(path, JSON.stringify({ ...setup.result, report: { ...setup.result.report, dimensions: ["private"] } }));
    if (kind === "mismatch") await writeFile(join(setup.audit, "alert.json"), JSON.stringify({ ...setup.result.alert, stale: true }));
    if (kind === "repository") setup.args[3] = process.cwd();
    const fetcher = vi.fn();
    expect((await send(setup, fetcher)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("real CLI spawn: help, dryrun, invalid execute stay offline", async () => {
    const setup = await fixture();
    for (const args of [["--help"], setup.args, [...setup.args, "--execute"]]) {
      const stdout = join(setup.root, `stdout-${args.length}`);
      const stderr = join(setup.root, `stderr-${args.length}`);
      const { openSync, closeSync } = await import("node:fs");
      const descriptors = [openSync(stdout, "w", 0o600), openSync(stderr, "w", 0o600)];
      const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/seo-data/delivery.ts", ...args], { env: { PATH: process.env.PATH, NODE_ENV: "test", TSX_DISABLE_CACHE: "1" }, stdio: ["ignore", ...descriptors], timeout: 15000 });
      descriptors.forEach(closeSync);
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(args.includes("--execute") ? 1 : 0);
      expect(await readFile(stdout, "utf8")).not.toMatch(/offline-secret|private-hook/);
    }
    expect(await readdir(setup.state)).toEqual([]);
  });
});
