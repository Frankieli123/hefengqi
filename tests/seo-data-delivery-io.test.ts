// @vitest-environment node
import { link, lstat, mkdtemp, open, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliveryLock, privateDirectory, publishReceipt, readPrivateJson } from "../scripts/seo-data/delivery-files";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, link: vi.fn(original.link), open: vi.fn(original.open), lstat: vi.fn(original.lstat) };
});
const native = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
beforeEach(() => {
  vi.mocked(link).mockReset().mockImplementation(native.link);
  vi.mocked(open).mockReset().mockImplementation(native.open);
  vi.mocked(lstat).mockReset().mockImplementation(native.lstat);
});
afterEach(() => vi.restoreAllMocks());

describe("delivery private I/O fail closed", () => {
  it("rejects a directory owned by another uid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-delivery-io-"));
    vi.mocked(lstat).mockImplementation(async (...args) => {
      const entry = await native.lstat(...args);
      return String(args[0]) === directory ? Object.create(entry, { uid: { value: (process.getuid?.() ?? 0) + 1 } }) : entry;
    });
    await expect(privateDirectory(directory)).rejects.toThrow();
  });

  it("rejects a file owned by another uid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-delivery-io-"));
    const owner = await privateDirectory(directory);
    await writeFile(join(directory, "input.json"), "{}", { mode: 0o600 });
    vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await native.open(...args);
      const stat = handle.stat.bind(handle);
      handle.stat = vi.fn(async () => Object.create(await stat(), { uid: { value: (process.getuid?.() ?? 0) + 1 } }));
      return handle;
    });
    await expect(readPrivateJson(owner, "input.json")).rejects.toThrow();
  });

  it.each(["link", "sync", "replacement"])("failed atomic publication (%s) retains manual-review evidence", async (failure) => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-delivery-io-"));
    const state = await privateDirectory(directory);
    const lock = await deliveryLock(state);
    if (failure === "link") vi.mocked(link).mockRejectedValueOnce(new Error("SECRET"));
    if (failure === "sync") vi.mocked(open).mockImplementation(async (...args) => {
      const handle = await native.open(...args);
      if (String(args[0]).includes("/.delivery-")) handle.sync = vi.fn(async () => { throw new Error("SECRET"); });
      return handle;
    });
    if (failure === "replacement") vi.mocked(link).mockImplementationOnce(async (source, destination) => {
      await unlink(source);
      await writeFile(source, "replacement", { mode: 0o600 });
      await native.link(source, destination);
    });
    try {
      await expect(publishReceipt(state, "receipt.json", { status: "pending" }, lock.assert)).rejects.toThrow();
      const names = await readdir(directory);
      expect(names).toContain(".seo-delivery.lock");
      expect(names.some((name) => name.startsWith(".delivery-"))).toBe(true);
      await expect(deliveryLock(state)).rejects.toThrow();
    } finally { await lock.close(); }
  });

  it("keeps lock and evidence when an existing receipt would be overwritten", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wp02-delivery-io-"));
    const state = await privateDirectory(directory);
    const lock = await deliveryLock(state);
    await writeFile(join(directory, "receipt.json"), "original", { mode: 0o600 });
    try {
      await expect(publishReceipt(state, "receipt.json", {}, lock.assert)).rejects.toThrow();
      expect(await readFile(join(directory, "receipt.json"), "utf8")).toBe("original");
    } finally { await lock.close(); }
  });
});
