import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { CARD_IMAGE_WIDTHS } from "../src/lib/card-image-variants";

const root = process.env.MEDIA_ROOT;
const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : 25;
const after = process.argv.find((arg) => arg.startsWith("--after="))?.slice(8);
if (!root || !path.isAbsolute(root) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Absolute MEDIA_ROOT and --limit=1..100 required");
if (process.argv.slice(2).some((arg) => arg !== "--apply" && arg !== limitArg && arg !== `--after=${after}`)) throw new Error("Unknown argument");
const mediaRoot = root;
const db = new PrismaClient();

async function put(key: string, data: Buffer) {
  const target = path.join(mediaRoot, key);
  const dir = path.dirname(target);
  await mkdir(dir, { recursive: true });
  const temp = await mkdtemp(path.join(dir, ".card-"));
  try {
    const scratch = path.join(temp, "image.webp");
    await writeFile(scratch, data, { mode: 0o644 });
    try { await link(scratch, target); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !(await readFile(target)).equals(data)) throw error;
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
}

async function main() {
  const rows = await db.mediaAsset.findMany({
    where: { ...(after ? { id: { gt: after } } : {}), kind: "IMAGE", rightsApproved: true, scanStatus: "CLEAN", productLinks: { some: {} } },
    orderBy: { id: "asc" }, take: limit, select: { id: true, storageKey: true, variants: true },
  });
  let ready = 0, skipped = 0, updated = 0, conflicts = 0, failed = 0;
  for (const row of rows) {
    try {
      if (!row.variants || typeof row.variants !== "object" || Array.isArray(row.variants)) { skipped++; continue; }
      const variants = { ...row.variants };
      const source = [variants["1200-webp"], row.storageKey, variants["800-webp"]].find((key): key is string => typeof key === "string" && /^[a-f0-9]{2}\/[a-f0-9]{64}-\d+\.(avif|webp|jpg)$/.test(key) && key.slice(0, 2) === key.slice(3, 5));
      if (!source) { skipped++; continue; }
      if (CARD_IMAGE_WIDTHS.every((width) => typeof variants[`card-${width}-webp`] === "string")) { skipped++; continue; }
      const image = await readFile(path.join(mediaRoot, source));
      const meta = await sharp(image).metadata();
      let changed = false;
      for (const width of CARD_IMAGE_WIDTHS) {
        if (width > (meta.autoOrient?.width ?? meta.width ?? 0) || variants[`card-${width}-webp`]) continue;
        const { data, info } = await sharp(image).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 83, effort: 5 }).toBuffer({ resolveWithObject: true });
        if (info.width !== width) continue;
        const hash = createHash("sha256").update(data).digest("hex");
        const key = `${hash.slice(0, 2)}/${hash}-${width}.webp`;
        if (apply) await put(key, data);
        variants[`card-${width}-webp`] = key;
        changed = true;
      }
      if (!changed) { skipped++; continue; }
      ready++;
      if (apply) {
        const result = await db.mediaAsset.updateMany({ where: { id: row.id, storageKey: row.storageKey, variants: { equals: row.variants }, rightsApproved: true, scanStatus: "CLEAN" }, data: { variants } });
        if (result.count) updated++; else conflicts++;
      }
    } catch (error) {
      failed++;
      console.error(JSON.stringify({ id: row.id, code: (error as NodeJS.ErrnoException).code ?? "VARIANT_FAILED" }));
    }
  }
  console.log(JSON.stringify({ apply, scanned: rows.length, nextAfter: rows.at(-1)?.id ?? null, ready, skipped, updated, conflicts, failed }));
  if (failed || conflicts) process.exitCode = 1;
}

main().catch(() => { console.error("CARD_BACKFILL_FAILED"); process.exitCode = 1; }).finally(() => db.$disconnect());
