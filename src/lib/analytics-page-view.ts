import "server-only";

import { db } from "@/lib/db";
import { hashIp } from "@/lib/inquiries";
import { maskClientIp, normalizeClientIp } from "@/lib/analytics-privacy";

const RETENTION_DAYS = 90;
const PRUNE_INTERVAL_MS = 60 * 60 * 1_000;
let lastPrunedAt = 0;

export interface RecordAnalyticsPageViewInput {
  visitorId: string;
  sessionId: string;
  umamiSessionId?: string | null;
  ip: string;
  userAgent?: string | null;
  path: string;
  locale?: string | null;
  referrer?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export async function recordAnalyticsPageView(input: RecordAnalyticsPageViewInput) {
  const now = Date.now();
  const normalizedIp = normalizeClientIp(input.ip);
  await db.analyticsPageView.create({
    data: {
      visitorHash: hashIp(`analytics-visitor:${input.visitorId}`),
      sessionKey: hashIp(`analytics-session:${input.sessionId}`),
      umamiSessionId: input.umamiSessionId ?? null,
      ipHash: hashIp(`analytics-ip:${normalizedIp}`),
      ipAddress: normalizedIp === "0.0.0.0" ? null : normalizedIp,
      ipMasked: maskClientIp(normalizedIp),
      userAgent: input.userAgent?.trim().slice(0, 500) || null,
      path: input.path,
      locale: input.locale ?? null,
      referrer: input.referrer ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
    },
  });

  if (now - lastPrunedAt >= PRUNE_INTERVAL_MS) {
    lastPrunedAt = now;
    await db.analyticsPageView.deleteMany({
      where: { createdAt: { lt: new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1_000) } },
    });
  }
}
