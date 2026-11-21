import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { isValidPublicMediaPath } from "@/lib/public-media-path";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.join("/");
  if (!isValidPublicMediaPath(relativePath)) return new Response("Not found", { status: 404 });
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
