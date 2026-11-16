import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

const publicVariantPattern = /^[a-f0-9]{2}\/[a-f0-9]{64}-(?:480|800|1200|1600|1920|2560|3840)\.(?:avif|webp|jpg)$/;
const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.join("/");
  if (!publicVariantPattern.test(relativePath)) return new Response("Not found", { status: 404 });
  const mediaRoot = path.resolve(env.MEDIA_ROOT);
  const filePath = path.resolve(mediaRoot, relativePath);
  if (!filePath.startsWith(`${mediaRoot}${path.sep}`)) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export const dynamic = "force-dynamic";
