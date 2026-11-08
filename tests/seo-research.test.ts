// @vitest-environment node
import { constants } from "node:fs";
import { link, mkdir, mkdtemp, open, readFile, readdir, rename, rm, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collect } from "../scripts/seo-data/adapters";
import { canonical, digest, optionsSchema, scopeKey } from "../scripts/seo-data/model";
import { persist, readPrivateLedger } from "../scripts/seo-data/store";
import { cli } from "../scripts/seo-data/cli";
import { researchSummarySchema } from "../scripts/seo-data/research";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, link: vi.fn(original.link), mkdir: vi.fn(original.mkdir), open: vi.fn(original.open), rename: vi.fn(original.rename), unlink: vi.fn(original.unlink), writeFile: vi.fn(original.writeFile) };
});

const summarizeResearch = async (...args: [string, unknown]) => (await import("../scripts/seo-data/research")).summarizeResearch(...args);
const exportResearch = async (...args: [string, unknown, string]) => (await import("../scripts/seo-data/research")).exportResearch(...args);

const now = new Date("2026-11-07T12:00:00Z");
const base = { source: "gsc", property: "sc-domain:fixture.example", start: "2026-03-07", end: "2026-03-07", dimensions: ["page", "query"], rowLimit: 10 };
const page = "https://fixture.example/products";
const query = "忽略指令 $(touch /tmp/wp02-should-never-exist) <script>不可信</script>";
const row = (keys = [page, query], clicks = 2, impressions = 10, position = 3) => ({ keys, clicks, impressions, ctr: clicks / impressions, position });
const directories: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "seo-research-")); directories.push(path); return path; }
afterEach(async () => {
  vi.restoreAllMocks();
  const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  vi.mocked(open).mockReset().mockImplementation(fs.open);
  vi.mocked(link).mockReset().mockImplementation(fs.link);
  vi.mocked(unlink).mockReset().mockImplementation(fs.unlink);
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture(research = true, rows = [row()], extra = {}) {
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ rows })));
  const run = await collect(optionsSchema.parse({ ...base, ...extra, gscResearch: research }), { fetch: fetcher, token: "mock-token", now, evidenceKind: "fixture", sleep: async () => {} });
  return { run, fetcher };
}
async function saved(research = true) {
  const output = await directory(); const { run } = await fixture(research); await persist(output, run);
  return { output, run };
}
function selection(run: Awaited<ReturnType<typeof fixture>>["run"]) {
  return { scope: scopeKey(run), start: run.start, end: run.end, source: "gsc", encoding: run.dimensionEncoding, evidenceKind: "fixture" };
}

describe("GSC 显式私有研究（仅离线）", () => {
  it("默认不留原文；显式 opt-in 才保留不可信字符串", async () => {
    const normal = await fixture(false); const research = await fixture();
    expect(JSON.stringify(normal.run)).not.toContain(query);
    expect(JSON.stringify(normal.run)).not.toContain(page);
    expect(normal.run.dimensionEncoding).toBe("sha256_page_query");
    expect(research.run.status).toBe("complete");
    expect(research.run.dimensionEncoding).toBe("raw_page_query_private");
    expect(research.run.observations[0].dimensions).toEqual({ page, query });
    expect(research.fetcher).toHaveBeenCalledTimes(1);
    expect(String(research.fetcher.mock.calls[0][0])).toMatch(/^https:\/\/www.googleapis.com\//);
    expect(await stat("/tmp/wp02-should-never-exist").catch(() => null)).toBeNull();
    expect(scopeKey(research.run)).not.toBe(scopeKey(normal.run));
  });
  it("schema 与 CLI 均拒绝 Umami 跨来源研究", async () => {
    expect(() => optionsSchema.parse({ ...base, source: "umami", gscResearch: true })).toThrow();
    const fetcher = vi.fn();
    expect((await cli(["--source", "umami", "--start", base.start, "--end", base.end, "--output", "/tmp/unused", "--gsc-research"], {}, fetcher, now)).code).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["https://evil.example/x", "https://fixture.example.evil.example/x", "https://fixture.example/x?q=secret", "https://fixture.example/x?", "https://fixture.example/x#", "https://u:p@fixture.example/x", "file:///tmp/a", "not-url", " https://fixture.example/x", "https://fixture.example/a/../x"])("异常 page 整次 partial 且不落观察值：%s", async (invalid) => {
    const { run } = await fixture(true, [row(), row([invalid, "bad"])]);
    expect(run.status).toBe("partial"); expect(run.observations).toEqual([]);
  });
  it("property 精确约束 URL 前缀与 domain 子域", async () => {
    expect((await fixture(true, [row(["http://sub.fixture.example/x", query])])).run.status).toBe("complete");
    for (const value of ["https://fixture.example/out", "http://fixture.example/allowed/x", "https://fixture.example/allowed2/x"]) {
      expect((await fixture(true, [row([value, query])], { property: "https://fixture.example/allowed/" })).run.status).toBe("partial");
    }
    expect((await fixture(true, [row(["https://fixture.example/allowed/x", query])], { property: "https://fixture.example/allowed/" })).run.status).toBe("complete");
  });
  it.each(["bad\nquery", "x".repeat(2049), "bad\u0085query"])("query controls 与长度拒绝", async (invalid) => {
    expect((await fixture(true, [row([page, invalid])])).run.status).not.toBe("complete");
  });
  it("普通/研究目录双向禁混，旧事实与 checkpoint 不变", async () => {
    for (const mode of [false, true]) {
      const { output } = await saved(mode); const before = await readFile(join(output, "ledger.json"), "utf8");
      await expect(persist(output, (await fixture(!mode)).run)).rejects.toThrow();
      expect(await readFile(join(output, "ledger.json"), "utf8")).toBe(before);
      expect((await stat(output)).mode & 0o777).toBe(0o700);
      expect((await stat(join(output, "ledger.json"))).mode & 0o777).toBe(0o600);
    }
  });
  it("研究账本也禁止 Umami 混入，已有 Umami 目录不能切研究", async () => {
    const { output } = await saved();
    const umami = await collect(optionsSchema.parse({ source: "umami", property: "fixture-site", baseURL: "https://analytics.example.org", start: base.start, end: base.end, dimensions: [], events: ["inquiry-click"] }), { fetch: vi.fn(async () => new Response("[]")), token: "mock-token", now, evidenceKind: "fixture" });
    const before = await readFile(join(output, "ledger.json"), "utf8");
    await expect(persist(output, umami)).rejects.toThrow(); expect(await readFile(join(output, "ledger.json"), "utf8")).toBe(before);
    const other = await directory(); await persist(other, umami);
    await expect(persist(other, (await fixture()).run)).rejects.toThrow();
  });
  it("冲突 run id 不破坏现有账本", async () => {
    const { output, run } = await saved(); const before = await readFile(join(output, "ledger.json"), "utf8");
    const changed = structuredClone(run); changed.observations[0].metrics.clicks = 1;
    await expect(persist(output, changed)).rejects.toThrow(); expect(await readFile(join(output, "ledger.json"), "utf8")).toBe(before);
  });
  it("旧 hash scope 兼容，不伪报研究覆盖", async () => {
    const { output, run } = await saved(false);
    const legacyScope = digest([run.source, run.property, [...run.dimensions].sort(), [], run.provenance]);
    expect(scopeKey(run)).toBe(legacyScope);
    const ledger = await readPrivateLedger(output);
    expect(ledger.checkpoints[0].scope).toBe(legacyScope);
    await expect(summarizeResearch(output, { ...selection(run), encoding: "raw_page_query_private" })).rejects.toThrow();
  });
  it("重复、空与失败不替换 last good，成熟与分页保护不绕过", async () => {
    const { output } = await saved(); const before = await readPrivateLedger(output);
    const failures = [await fixture(true, []), await fixture(true, [row(), row()]), await fixture(true, [row()], { maxPages: 1, rowLimit: 1 }), await fixture(true, [row()], { start: "2026-11-06", end: "2026-11-06" })];
    for (const { run } of failures) {
      expect(run.status).not.toBe("complete"); await persist(output, run);
      const after = await readPrivateLedger(output);
      expect(after.observations).toEqual(before.observations); expect(after.checkpoints).toEqual(before.checkpoints);
    }
  });
  it("dry-run 无网络无创建目录，输出明确风险且不泄露原文", async () => {
    const root = await directory(); const output = join(root, "absent"); const fetcher = vi.fn();
    for (const operation of [link, mkdir, open, rename, unlink, writeFile]) vi.mocked(operation).mockClear();
    const result = await cli(["--source", "gsc", "--start", base.start, "--end", base.end, "--output", output, "--gsc-research", "--dry-run"], { GSC_SITE_URL: base.property }, fetcher, now);
    expect(result.code).toBe(0); expect(result.text).toContain("raw_page_query_private"); expect(result.text).toContain("并非匿名化");
    expect(fetcher).not.toHaveBeenCalled(); expect(await stat(output).catch(() => null)).toBeNull();
    for (const operation of [link, mkdir, open, rename, unlink, writeFile]) expect(operation).not.toHaveBeenCalled();
    const liveMock = await cli(["--source", "gsc", "--start", base.start, "--end", base.end, "--output", output, "--dimensions", "page,query", "--gsc-research"], { GSC_SITE_URL: base.property, GSC_ACCESS_TOKEN: "mock-token" }, vi.fn(async () => new Response(JSON.stringify({ rows: [row()] }))), now);
    expect(liveMock.text).not.toContain(query); expect(liveMock.text).not.toContain(page);
    expect(JSON.parse(liveMock.text).evidenceKind).toBe("fixture");
  });
});

describe("离线私有候选摘要", () => {
  it("同一 scope 按曝光加权，CTR 非平均，默认仅 hash", async () => {
    const { output, run } = await saved();
    const next = (await fixture(true, [row([page, query], 3, 30, 7)], { start: "2026-03-08", end: "2026-03-08" })).run;
    await persist(output, next);
    const before = await readFile(join(output, "ledger.json"), "utf8");
    const summary = await summarizeResearch(output, { ...selection(run), end: next.end });
    expect(summary.candidates[0]).toMatchObject({ clicks: 5, impressions: 40, ctr: 0.125, position: 6 });
    expect(summary.candidates[0].page).toMatch(/^sha256:/); expect(JSON.stringify(summary)).not.toContain(query);
    expect(summary.coverage).toBe("api_visible_subset_not_property_totals");
    expect(await readFile(join(output, "ledger.json"), "utf8")).toBe(before);
    await expect(summarizeResearch(output, { ...selection(run), scope: "0".repeat(64) })).rejects.toThrow();
    await expect(summarizeResearch(output, { ...selection(run), extra: "unsafe" })).rejects.toThrow();
  });
  it("不混合不同维度或来源，缺失覆盖不当零", async () => {
    const { output, run } = await saved();
    await persist(output, (await fixture(true, [row([page, query, "MOBILE"], 9, 90)], { dimensions: ["page", "query", "device"] })).run);
    expect((await summarizeResearch(output, selection(run))).candidates[0].clicks).toBe(2);
    await expect(summarizeResearch(output, { ...selection(run), source: "umami" })).rejects.toThrow();
    await expect(summarizeResearch(output, { ...selection(run), end: "2026-03-09" })).rejects.toThrow();
  });
  it("显式 readable export 仅 0600 新私有文件，拒绝覆盖/符号链接/源码", async () => {
    const { output, run } = await saved(); const report = join(output, "research.json");
    await exportResearch(output, selection(run), report);
    expect((await stat(report)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(report, "utf8")).candidates[0]).toMatchObject({ page, query });
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    const link = join(output, "link.json"); await symlink(report, link);
    await expect(exportResearch(output, selection(run), link)).rejects.toThrow();
    await expect(exportResearch(output, selection(run), join(process.cwd(), "docs", "unsafe.json"))).rejects.toThrow();
    await expect(exportResearch(output, selection(run), join(process.cwd(), "unsafe.json"))).rejects.toThrow();
    await expect(exportResearch(output, selection(run), join(process.cwd(), "public", "unsafe.json"))).rejects.toThrow();
    const parentLink = join(await directory(), "linked"); await symlink(output, parentLink);
    await expect(exportResearch(parentLink, selection(run), join(parentLink, "new.json"))).rejects.toThrow();
  });
  it.each(["writeFile", "sync", "close"] as const)("研究报告 %s 失败不会发布半成品且允许同名重试", async (failure) => {
    const { output, run } = await saved(); const report = join(output, "retry.json");
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const realOpen = fs.open;
    let exportedHandle: Awaited<ReturnType<typeof open>> | undefined;
    let failed = false;
    vi.mocked(open).mockImplementation(async (path, flags, mode) => {
      const handle = await realOpen(path, flags as number, mode as number);
      if (String(path) !== report && !String(path).includes("retry.json.tmp-")) return handle;
      exportedHandle = handle;
      return new Proxy(handle, { get(target, property) {
        if (property === failure) return async () => {
          if (failure === "close" && failed) return target.close();
          failed = true;
          if (failure === "writeFile") await target.writeFile("{truncated");
          throw new Error(`injected ${failure} failure`);
        };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      } });
    });
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    expect(await stat(report).catch(() => null)).toBeNull();
    expect((await readdir(output)).filter((name) => name.startsWith("retry.json.tmp-")).length).toBe(0);
    expect(failed).toBe(true);
    expect(exportedHandle?.fd).toBe(-1);
    vi.mocked(open).mockImplementation(realOpen);
    await exportResearch(output, selection(run), report);
    const final = await stat(report); expect(final.mode & 0o777).toBe(0o600); expect(final.nlink).toBe(1);
    expect(JSON.parse(await readFile(report, "utf8")).candidates[0]).toMatchObject({ page, query });
  });
  it("发布前 final 不存在，link 失败清理临时文件且不覆盖已有目标或符号链接", async () => {
    const { output, run } = await saved(); const report = join(output, "atomic.json");
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(link).mockImplementation(async (_source, destination) => {
      expect(await stat(destination).catch(() => null)).toBeNull();
      throw Object.assign(new Error("injected link failure"), { code: "EIO" });
    });
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    expect(await stat(report).catch(() => null)).toBeNull();
    expect((await readdir(output)).some((name) => name.startsWith("atomic.json.tmp-"))).toBe(false);
    vi.mocked(link).mockImplementation(fs.link);
    await exportResearch(output, selection(run), report);
    expect((await stat(report)).nlink).toBe(1);
    await fs.unlink(report);
    await writeFile(report, "owned", { mode: 0o600 });
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    expect(await readFile(report, "utf8")).toBe("owned");
    const linkPath = join(output, "symlink.json"); await symlink(report, linkPath);
    await expect(exportResearch(output, selection(run), linkPath)).rejects.toThrow();
    expect(await readFile(report, "utf8")).toBe("owned");
  });
  it("仅在完整 write/sync/close 后原子发布，临时文件使用排他私有权限且只清理本次文件", async () => {
    const { output, run } = await saved(); const report = join(output, "success.json");
    const other = join(output, "success.json.tmp-other-invocation"); await writeFile(other, "other", { mode: 0o600 });
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const stages: string[] = [];
    vi.mocked(open).mockImplementation(async (path, flags, mode) => {
      const handle = await fs.open(path, flags as number, mode as number);
      if (!String(path).includes("success.json.tmp-")) return handle;
      expect(flags).toBe(constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW);
      expect(mode).toBe(0o600); expect((await handle.stat()).mode & 0o777).toBe(0o600);
      expect((await stat(output)).mode & 0o777).toBe(0o700);
      for (const method of ["writeFile", "sync", "close"] as const) {
        const original = handle[method].bind(handle);
        vi.spyOn(handle, method).mockImplementation(async (...args: unknown[]) => {
          expect(await stat(report).catch(() => null)).toBeNull();
          stages.push(method);
          return Reflect.apply(original, handle, args);
        });
      }
      return handle;
    });
    vi.mocked(link).mockImplementation(async (source, destination) => {
      expect(stages).toEqual(["writeFile", "sync", "close"]);
      expect(await stat(destination).catch(() => null)).toBeNull();
      expect(JSON.parse(await readFile(source, "utf8")).candidates[0]).toMatchObject({ page, query });
      return fs.link(source, destination);
    });
    expect(await exportResearch(output, selection(run), report)).toEqual({ status: "private_report_created" });
    expect((await stat(report)).nlink).toBe(1);
    expect((await stat(report)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(report, "utf8")).candidates[0]).toMatchObject({ page, query });
    expect(await readdir(output)).toEqual(expect.arrayContaining(["ledger.json", "success.json", "success.json.tmp-other-invocation"]));
    expect((await readdir(output)).filter((name) => name.startsWith("success.json.tmp-"))).toEqual(["success.json.tmp-other-invocation"]);
    expect(await readFile(other, "utf8")).toBe("other");
  });
  it("link 后 unlink 失败准确报告已发布，重试不覆盖，人工清理后 nlink 恢复 1", async () => {
    const { output, run } = await saved(); const report = join(output, "cleanup.json");
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    let temporary = "";
    vi.mocked(unlink).mockImplementation(async (path) => {
      temporary = String(path); throw new Error("injected unlink failure");
    });
    const { researchCli } = await import("../scripts/seo-data/research-cli");
    const result = await researchCli(["--ledger-dir", output, "--scope", scopeKey(run), "--source", "gsc", "--encoding", run.dimensionEncoding, "--evidence-kind", "fixture", "--start", run.start, "--end", run.end, "--export", report]);
    expect(result.code).toBe(0); expect(JSON.parse(result.text).status).toBe("private_report_created_cleanup_pending");
    expect(result.text).not.toContain(page); expect(result.text).not.toContain(query);
    expect((await stat(report)).nlink).toBe(2);
    const committed = await readFile(report, "utf8");
    vi.mocked(unlink).mockImplementation(fs.unlink);
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    expect(await readFile(report, "utf8")).toBe(committed);
    await fs.unlink(temporary);
    expect((await stat(report)).nlink).toBe(1);
    expect(JSON.parse(await readFile(report, "utf8")).candidates[0]).toMatchObject({ page, query });
  });
  it("临时 open 冲突不清理非本次创建文件", async () => {
    const { output, run } = await saved(); const report = join(output, "collision.json");
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    let occupied = "";
    vi.mocked(open).mockImplementation(async (path, flags, mode) => {
      if (!String(path).includes("collision.json.tmp-")) return fs.open(path, flags as number, mode as number);
      occupied = String(path); await fs.writeFile(occupied, "other-invocation", { mode: 0o600 });
      throw Object.assign(new Error("occupied"), { code: "EEXIST" });
    });
    await expect(exportResearch(output, selection(run), report)).rejects.toThrow();
    expect(await readFile(occupied, "utf8")).toBe("other-invocation");
    expect(await stat(report).catch(() => null)).toBeNull();
  });
  it("并发同名导出仅一次发布，失败 invocation 不清理胜者的文件", async () => {
    const { output, run } = await saved(); const report = join(output, "concurrent.json");
    const results = await Promise.allSettled([exportResearch(output, selection(run), report), exportResearch(output, selection(run), report)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await stat(report)).nlink).toBe(1);
    expect(JSON.parse(await readFile(report, "utf8")).candidates[0]).toMatchObject({ page, query });
    expect((await readdir(output)).some((name) => name.startsWith("concurrent.json.tmp-"))).toBe(false);
  });
  it("发布后清理失败不回滚或删除外部替换的 destination", async () => {
    const { output, run } = await saved(); const report = join(output, "external.json");
    const fs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(unlink).mockImplementation(async () => {
      await fs.unlink(report); await writeFile(report, "external-owner", { mode: 0o600 });
      throw new Error("injected cleanup failure");
    });
    expect(await exportResearch(output, selection(run), report)).toEqual({ status: "private_report_created_cleanup_pending" });
    expect(await readFile(report, "utf8")).toBe("external-owner");
  });
  it("篡改/混 encoding/明文伪装旧账本拒绝读取", async () => {
    const { output } = await saved();
    const ledger = JSON.parse(await readFile(join(output, "ledger.json"), "utf8"));
    ledger.observations[0].dimensionEncoding = "sha256_page_query";
    const { digest: old, ...body } = ledger; void old; ledger.digest = digest(body);
    await writeFile(join(output, "ledger.json"), canonical(ledger), { mode: 0o600 });
    await expect(readPrivateLedger(output)).rejects.toThrow();
  });
  it("摘要 schema 禁止 hash-only 原文、额外字段及篡改警告", async () => {
    const { output, run } = await saved(); const summary = await summarizeResearch(output, selection(run));
    expect(researchSummarySchema.safeParse({ ...summary, candidates: [{ ...summary.candidates[0], query }] }).success).toBe(false);
    expect(researchSummarySchema.safeParse({ ...summary, raw: query }).success).toBe(false);
    expect(researchSummarySchema.safeParse({ ...summary, warning: "匿名且绝对安全" }).success).toBe(false);
  });
  it("重跑同 scope 不重复加总；零曝光不除零；失败日期不覆盖事实", async () => {
    const { output, run } = await saved(); await persist(output, run);
    expect((await summarizeResearch(output, selection(run))).candidates[0].clicks).toBe(2);
    const zero = (await fixture(true, [{ keys: [page, query], clicks: 0, impressions: 0, ctr: 0, position: 99 }])).run;
    await persist(output, zero);
    expect((await summarizeResearch(output, selection(run))).candidates[0]).toMatchObject({ clicks: 0, impressions: 0, ctr: null, position: null });
  });
  it("后一天异常 page 清除整个 run 原文，不推进 checkpoint", async () => {
    const { output } = await saved(); const before = await readPrivateLedger(output);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ rows: [row()] }))).mockResolvedValueOnce(new Response(JSON.stringify({ rows: [row([`${page}?secret=1`, query])] })));
    const run = await collect(optionsSchema.parse({ ...base, end: "2026-03-08", gscResearch: true }), { fetch: fetcher, token: "mock-token", now, evidenceKind: "fixture" });
    expect(run.status).toBe("partial"); expect(run.observations).toEqual([]); await persist(output, run);
    expect((await readPrivateLedger(output)).checkpoints).toEqual(before.checkpoints);
  });
  it("离线摘要 CLI 默认只输出 hash，显式 export 也不向 stdout 输出标签", async () => {
    const { output, run } = await saved();
    const { researchCli } = await import("../scripts/seo-data/research-cli");
    const args = ["--ledger-dir", output, "--scope", scopeKey(run), "--source", "gsc", "--encoding", run.dimensionEncoding, "--evidence-kind", "fixture", "--start", run.start, "--end", run.end];
    const result = await researchCli(args);
    expect(result.code).toBe(0); expect(result.text).not.toContain(query); expect(result.text).not.toContain(page);
    expect((await researchCli([...args, "--export", join(output, "cli-report.json")])).text).not.toContain(query);
    expect(JSON.parse(await readFile(join(output, "cli-report.json"), "utf8")).candidates[0].query).toBe(query);
    expect((await researchCli([...args, "--encoding", "configured_event_names"])).code).toBe(1);
  });
});
