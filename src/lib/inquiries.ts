import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import type { CreateInquiryInput } from "@/lib/inquiry-schema";
import { getCustomerServiceSettings, notifyInquiryWebhook } from "@/lib/customer-service";

export { createInquirySchema } from "@/lib/inquiry-schema";

export function hashIp(ip: string) {
  return createHmac("sha256", env.IP_HASH_SECRET).update(ip).digest("hex");
}

async function verifyTurnstile(token: string, remoteip: string) {
  // If no Turnstile secret key is configured, pass validation gracefully while still relying on IP rate-limiting & Zod schema checks
  if (!env.TURNSTILE_SECRET_KEY) return true;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

function referenceId(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `HFQ-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createInquiry(input: CreateInquiryInput, context: { ip: string; userAgent?: string }) {
  if (isDemoMode) return { referenceId: referenceId(), submittedAt: new Date().toISOString() };

  const ipHash = hashIp(context.ip);
  // A caller may have persisted the inquiry but lost the response. Check the
  // idempotency key before consuming a one-time Turnstile token on a retry.
  const existing = await db.inquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { referenceId: true, createdAt: true } });
  if (existing) return { referenceId: existing.referenceId, submittedAt: existing.createdAt.toISOString() };

  const interestedCategory = await db.category.findFirst({
    where: { id: input.interestedCategoryId, parentId: null, level: 1, status: "PUBLISHED" },
    include: { translations: { where: { locale: input.locale } } },
  });
  if (!interestedCategory) throw new InquiryError("INVALID_CATEGORY", 400);

  const validHuman = await verifyTurnstile(input.turnstileToken, context.ip);
  if (!validHuman) throw new InquiryError("TURNSTILE_FAILED", 400);

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.inquiry.count({ where: { ipHash, createdAt: { gte: since } } });
  if (recent >= 5) throw new InquiryError("RATE_LIMITED", 429);

  const customerService = await getCustomerServiceSettings();
  const salesEmail = customerService.email || env.SALES_EMAIL;
  if (!salesEmail) throw new Error("SALES_EMAIL is required outside demo mode");
  const created = await db.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.create({
      data: {
        referenceId: referenceId(), idempotencyKey: input.idempotencyKey, locale: input.locale,
        productId: input.productId, interestedCategoryId: input.interestedCategoryId, name: input.name, email: input.email,
        phoneOrWhatsapp: input.phoneOrWhatsapp || null, country: input.country,
        requirements: input.requirements, privacyConsentAt: new Date(), ipHash, userAgent: context.userAgent?.slice(0, 500),
      },
    });
    await tx.emailOutbox.createMany({ data: [
      { inquiryId: inquiry.id, toAddress: salesEmail, templateKey: "sales-inquiry", locale: input.locale, payload: { referenceId: inquiry.referenceId, name: input.name, email: input.email, phoneOrWhatsapp: input.phoneOrWhatsapp, country: input.country, interestedCategory: interestedCategory.translations[0]?.name ?? interestedCategory.key, requirements: input.requirements, productId: input.productId } },
      { inquiryId: inquiry.id, toAddress: input.email, templateKey: "customer-receipt", locale: input.locale, payload: { referenceId: inquiry.referenceId, name: input.name } },
    ] });
    return inquiry;
  });
  void notifyInquiryWebhook({
    referenceId: created.referenceId,
    name: input.name,
    email: input.email,
    phoneOrWhatsapp: input.phoneOrWhatsapp,
    country: input.country,
    interestedCategory: interestedCategory.translations[0]?.name ?? interestedCategory.key,
    requirements: input.requirements,
    productId: input.productId,
    locale: input.locale,
    createdAt: created.createdAt,
  });

  return { referenceId: created.referenceId, submittedAt: created.createdAt.toISOString() };
}

export class InquiryError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
