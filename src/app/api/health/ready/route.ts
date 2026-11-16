import { access, constants } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";

export async function GET() {
  if (isDemoMode) return NextResponse.json({ status: "ready", mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
  try {
    await Promise.all([db.$queryRaw`SELECT 1`, access(env.MEDIA_ROOT, constants.R_OK | constants.W_OK), db.crawlJob.count({ where: { status: { in: ["PENDING", "RUNNING"] } } })]);
    return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("readiness_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const dynamic = "force-dynamic";
