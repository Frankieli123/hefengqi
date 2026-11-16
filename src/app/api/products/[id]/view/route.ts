import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VIEW_DEDUPE_TTL_MS = 15 * 60 * 1000; // 15分钟去重窗口
const recentViews = new Map<string, number>();

function shouldCountView(ip: string, productId: string): boolean {
  const key = `${ip}:${productId}`;
  const now = Date.now();
  const lastSeen = recentViews.get(key);
  if (lastSeen && now - lastSeen < VIEW_DEDUPE_TTL_MS) {
    return false;
  }
  if (recentViews.size > 20000) {
    for (const [k, time] of recentViews.entries()) {
      if (now - time > VIEW_DEDUPE_TTL_MS) recentViews.delete(k);
    }
  }
  recentViews.set(key, now);
  return true;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ code: "BAD_REQUEST" }, { status: 400 });
    }

    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";

    if (!shouldCountView(ip, id)) {
      return NextResponse.json(
        { ok: true, counted: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    await db.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, counted: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    // 若找不到该产品或数据库错误，静默返回不影响前台
    return NextResponse.json(
      { ok: false },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const dynamic = "force-dynamic";
