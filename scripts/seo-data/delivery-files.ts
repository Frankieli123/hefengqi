import { constants, type Stats } from "node:fs";
import { link, lstat, open, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { canonical } from "./model";
import { validatePrivateResearchOutput } from "./store";

const rejected = () => new Error("DELIVERY_FILES_MANUAL_REVIEW");
const same = (left: Stats, right: Stats) => left.dev === right.dev && left.ino === right.ino;
function privateFile(entry: Stats) {
  if (!entry.isFile() || entry.uid !== process.getuid?.() || entry.nlink !== 1 || (entry.mode & 0o777) !== 0o600 || entry.size > 65536) throw rejected();
}

export async function privateDirectory(path: string) {
  const directory = await validatePrivateResearchOutput(path);
  const owned = await lstat(directory);
  const assert = async () => {
    await validatePrivateResearchOutput(directory);
    const current = await lstat(directory);
    if (!same(owned, current) || !current.isDirectory() || current.uid !== process.getuid?.() || (current.mode & 0o777) !== 0o700) throw rejected();
  };
  await assert();
  return { directory, assert };
}
export type PrivateDirectory = Awaited<ReturnType<typeof privateDirectory>>;

export async function readPrivateJson(owner: PrivateDirectory, name: string, optional = false): Promise<unknown> {
  await owner.assert();
  const path = join(owner.directory, name);
  let handle;
  try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if (optional && (error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
  try {
    const before = await handle.stat();
    privateFile(before);
    const buffer = Buffer.alloc(65537);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat();
    privateFile(after);
    if (bytesRead !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || !same(after, await lstat(path))) throw rejected();
    await owner.assert();
    return JSON.parse(buffer.subarray(0, bytesRead).toString("utf8"));
  } finally { await handle.close(); }
}

export async function deliveryLock(owner: PrivateDirectory) {
  await owner.assert();
  if ((await readdir(owner.directory)).some((name) => name.startsWith(".delivery-"))) throw rejected();
  const path = join(owner.directory, ".seo-delivery.lock");
  const handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  const owned = await handle.stat();
  const identity = { version: 1, id: randomUUID(), pid: process.pid, recovery: "manual_review_only" };
  const assert = async () => {
    await owner.assert();
    const current = await lstat(path);
    privateFile(current);
    if (!same(owned, current)) throw rejected();
    if (canonical(await readPrivateJson(owner, ".seo-delivery.lock")) !== canonical(identity)) throw rejected();
  };
  try { await handle.writeFile(`${canonical(identity)}\n`); await handle.sync(); }
  catch (error) { await handle.close(); throw error; }
  return { assert, close: () => handle.close(), release: async () => { await assert(); await unlink(path); } };
}

export async function publishReceipt(owner: PrivateDirectory, name: string, value: unknown, assertLock: () => Promise<void>) {
  await assertLock();
  const temporary = join(owner.directory, `.delivery-${randomUUID()}.tmp`);
  const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
  const owned = await handle.stat();
  try {
    await handle.writeFile(`${canonical(value)}\n`);
    await handle.sync();
    await assertLock();
    const current = await lstat(temporary);
    privateFile(current);
    if (!same(owned, current)) throw rejected();
    const destination = join(owner.directory, name);
    await link(temporary, destination);
    const published = await lstat(destination);
    const linked = await lstat(temporary);
    if (!same(owned, published) || !same(owned, linked) || published.nlink !== 2 || linked.nlink !== 2) throw rejected();
    await unlink(temporary);
    const directory = await open(owner.directory, constants.O_RDONLY | constants.O_NOFOLLOW);
    try { await directory.sync(); } finally { await directory.close(); }
    await assertLock();
  } finally { await handle.close(); }
}
