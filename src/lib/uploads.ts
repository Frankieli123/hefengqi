import "server-only";

import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";
import yauzl from "yauzl";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const privateExtensions = new Set([".pdf", ".docx", ".xlsx", ".csv", ".zip"]);
const forbiddenExtensions = new Set([".exe", ".dll", ".sh", ".bat", ".cmd", ".com", ".js", ".mjs", ".svg", ".docm", ".xlsm", ".pptm"]);

function cleanName(value: string) { const base = path.basename(value.normalize("NFC")); return base.replaceAll(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 180); }
function starts(buffer: Buffer, bytes: number[]) { return bytes.every((byte, index) => buffer[index] === byte); }
function validMagic(buffer: Buffer, ext: string) {
  if (ext === ".jpg" || ext === ".jpeg") return starts(buffer, [0xff, 0xd8, 0xff]);
  if (ext === ".png") return starts(buffer, [0x89, 0x50, 0x4e, 0x47]);
  if (ext === ".webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (ext === ".avif") return buffer.subarray(4, 12).toString().includes("ftyp");
  if (ext === ".pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if ([".docx", ".xlsx", ".zip"].includes(ext)) return starts(buffer, [0x50, 0x4b]);
  if (ext === ".csv") return !buffer.subarray(0, 1024).includes(0);
  return false;
}

async function inspectZip(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, archive) => { if (error || !archive) return reject(error ?? new Error("ZIP_OPEN_FAILED")); let entries = 0; let total = 0; archive.readEntry(); archive.on("entry", (entry) => { entries += 1; total += entry.uncompressedSize; const unsafe = entry.fileName.startsWith("/") || entry.fileName.includes("../") || entry.fileName.includes("\\..\\"); const ratio = entry.compressedSize ? entry.uncompressedSize / entry.compressedSize : entry.uncompressedSize; if (unsafe || entries > 5000 || total > 500 * 1024 * 1024 || ratio > 100) { archive.close(); return reject(new Error("UNSAFE_ARCHIVE")); } archive.readEntry(); }); archive.on("end", resolve); archive.on("error", reject); }));
}

async function scanWithClamAv(buffer: Buffer) {
  const host = process.env.CLAMAV_HOST ?? "clamav"; const port = Number(process.env.CLAMAV_PORT ?? "3310");
  const result = await new Promise<string>((resolve, reject) => { const socket = net.createConnection({ host, port }); const chunks: Buffer[] = []; const timer = setTimeout(() => socket.destroy(new Error("CLAMAV_TIMEOUT")), 60_000); socket.on("connect", () => { socket.write("zINSTREAM\0"); for (let offset = 0; offset < buffer.length; offset += 64 * 1024) { const chunk = buffer.subarray(offset, offset + 64 * 1024); const length = Buffer.alloc(4); length.writeUInt32BE(chunk.length); socket.write(length); socket.write(chunk); } socket.end(Buffer.alloc(4)); }); socket.on("data", (chunk) => chunks.push(chunk)); socket.on("end", () => { clearTimeout(timer); resolve(Buffer.concat(chunks).toString()); }); socket.on("error", reject); });
  if (!result.includes("OK")) throw new Error(result.includes("FOUND") ? "MALWARE_FOUND" : "CLAMAV_FAILED");
}

export async function secureUpload(file: File) {
  const name = cleanName(file.name); const ext = path.extname(name).toLowerCase(); const max = imageExtensions.has(ext) ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
  if (forbiddenExtensions.has(ext) || (!imageExtensions.has(ext) && !privateExtensions.has(ext))) throw new Error("FILE_TYPE_NOT_ALLOWED"); if (!file.size || file.size > max) throw new Error("FILE_SIZE_INVALID");
  const buffer = Buffer.from(await file.arrayBuffer()); if (buffer.length !== file.size || !validMagic(buffer, ext)) throw new Error("MIME_MISMATCH"); if ([".docx", ".xlsx", ".zip"].includes(ext)) await inspectZip(buffer);
  const hash = createHash("sha256").update(buffer).digest("hex"); const existing = await db.mediaAsset.findUnique({ where: { contentHash: hash } }); if (existing) return existing;
  await mkdir(env.PRIVATE_UPLOAD_ROOT, { recursive: true }); const quarantine = path.join(env.PRIVATE_UPLOAD_ROOT, `quarantine-${hash}`); await writeFile(quarantine, buffer, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  try {
    await scanWithClamAv(buffer);
    if (imageExtensions.has(ext)) {
      const directory = path.join(env.MEDIA_ROOT, hash.slice(0, 2)); await mkdir(directory, { recursive: true }); const metadata = await sharp(buffer, { failOn: "error" }).metadata(); if (!metadata.width || !metadata.height) throw new Error("IMAGE_DIMENSIONS_MISSING"); const variants: Record<string, string> = {};
      for (const width of [480, 800, 1200, 1600, 1920]) { if (width > metadata.width * 1.5) continue; for (const format of ["avif", "webp", "jpeg"] as const) { const filename = `${hash}-${width}.${format === "jpeg" ? "jpg" : format}`; await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).toFormat(format, format === "jpeg" ? { quality: 86 } : { quality: 78 }).toFile(path.join(directory, filename)); variants[`${width}-${format}`] = `${hash.slice(0, 2)}/${filename}`; } }
      const storageKey = variants["800-webp"] ?? Object.values(variants)[0]; if (!storageKey) throw new Error("IMAGE_VARIANT_FAILED"); return await db.mediaAsset.create({ data: { kind: "IMAGE", originalName: name, storageKey, contentHash: hash, mimeType: file.type || `image/${ext.slice(1)}`, bytes: BigInt(buffer.length), width: metadata.width, height: metadata.height, variants, scanStatus: "CLEAN", rightsApproved: false } });
    }
    const cleanDirectory = path.join(env.PRIVATE_UPLOAD_ROOT, "clean"); await mkdir(cleanDirectory, { recursive: true }); const storageKey = `${hash}${ext}`; await rename(quarantine, path.join(cleanDirectory, storageKey)); return await db.mediaAsset.create({ data: { kind: ext === ".zip" ? "ARCHIVE" : "DOCUMENT", originalName: name, storageKey, contentHash: hash, mimeType: file.type || "application/octet-stream", bytes: BigInt(buffer.length), scanStatus: "CLEAN", rightsApproved: false } });
  } finally { await rm(quarantine, { force: true }).catch(() => undefined); }
}
