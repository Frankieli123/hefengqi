// @vitest-environment node
import { link, mkdtemp, open, readFile, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishAudit } from "../scripts/seo-data/runner-files";
import { runnerCli } from "../scripts/seo-data/runner";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, link: vi.fn(original.link), open: vi.fn(original.open), unlink: vi.fn(original.unlink) };
});

const native = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
beforeEach(() => {
  vi.mocked(link).mockReset().mockImplementation(native.link);
  vi.mocked(open).mockReset().mockImplementation(native.open);
  vi.mocked(unlink).mockReset().mockImplementation(native.unlink);
});
afterEach(() => vi.restoreAllMocks());

describe("runner private audit I/O failures", () => {
  it("cleans only its own temporary file after failed atomic publication", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-runner-io-"));
    const foreign = join(directory, ".publish-other.tmp");
    await native.writeFile(foreign, "other-owner", { mode: 0o600 });
    vi.mocked(link).mockRejectedValueOnce(new Error("fixture-secret"));
    await expect(publishAudit(directory, "result.json", { status: "failed" })).rejects.toThrow();
    expect(await readdir(directory)).toEqual([".publish-other.tmp"]);
    expect(await readFile(foreign, "utf8")).toBe("other-owner");
  });

  it("does not publish a partially written or unsynced audit file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-runner-io-"));
    vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
      const handle = await native.open(path, flags, mode);
      vi.spyOn(handle, "sync").mockRejectedValueOnce(new Error("fixture-secret"));
      return handle;
    });
    await expect(publishAudit(directory, "result.json", { status: "failed" })).rejects.toThrow();
    expect(await readdir(directory)).toEqual([]);
    expect(link).not.toHaveBeenCalled();
  });

  it("does not delete a temporary file that it did not create when exclusive open conflicts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-runner-io-"));
    vi.mocked(open).mockImplementationOnce(async (path) => {
      await native.writeFile(path, "other-owner", { mode: 0o600 });
      throw Object.assign(new Error("conflict"), { code: "EEXIST" });
    });
    await expect(publishAudit(directory, "result.json", { status: "failed" })).rejects.toThrow();
    const names = await readdir(directory);
    expect(names).toHaveLength(1);
    expect(await readFile(join(directory, names[0]), "utf8")).toBe("other-owner");
  });

  it("removes its own uncommitted publication if temporary-link cleanup fails, never exposing a valid success record", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-runner-io-"));
    vi.mocked(unlink).mockImplementation(async (path) => {
      if (String(path).includes(".publish-")) throw new Error("fixture-secret");
      return native.unlink(path);
    });
    await expect(publishAudit(directory, "result.json", { status: "complete" })).rejects.toThrow();
    await expect(stat(join(directory, "result.json"))).rejects.toThrow();
    expect((await readdir(directory)).every((name) => name.startsWith(".publish-"))).toBe(true);
  });

  it("fails redacted and releases its own lock when the initial audit cannot be published", async () => {
    const directory = join(await mkdtemp(join(tmpdir(), "wp02-runner-io-")), "evidence");
    vi.mocked(link).mockRejectedValueOnce(new Error("fixture-secret"));
    const fetcher = vi.fn();
    const result = await runnerCli(["--source", "gsc", "--start", "2026-03-07", "--end", "2026-03-07", "--output", directory, "--execute"], {}, fetcher, new Date("2026-11-09T12:00:00Z"));
    expect(result.code).toBe(1);
    expect(result.text).not.toContain("fixture-secret");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(stat(join(directory, ".seo-runner.lock"))).rejects.toThrow();
  });
});
