import { Resend } from "resend";
import type { EmailOutbox, Locale } from "@prisma/client";
import { db } from "@/lib/db-core";
import { env } from "@/lib/env";

function receipt(locale: Locale, payload: Record<string, unknown>) {
  const reference = String(payload.referenceId ?? ""); const name = String(payload.name ?? "");
  const text = locale === "zh" ? { subject: `询价已受理 ${reference}`, title: `${name}，您好`, body: "我们已收到您的询价。销售人员将在核对需求后与您联系。本邮件仅确认受理，不包含报价或营销内容。" } : locale === "ru" ? { subject: `Запрос получен ${reference}`, title: `Здравствуйте, ${name}`, body: "Мы получили ваш запрос. Представитель отдела продаж свяжется с вами после проверки требований. Это только подтверждение, без цены и маркетинговых материалов." } : { subject: `Inquiry received ${reference}`, title: `Hello ${name}`, body: "We received your inquiry. A sales representative will follow up after reviewing the requirements. This receipt contains no quotation or marketing content." };
  return { subject: text.subject, html: `<h1>${escapeHtml(text.title)}</h1><p>${escapeHtml(text.body)}</p><p><strong>${escapeHtml(reference)}</strong></p>` };
}

function sales(payload: Record<string, unknown>) {
  const keys = ["referenceId", "name", "company", "email", "phoneOrWhatsapp", "country", "quantity", "requirements", "productId"];
  return { subject: `New HEFENGQI inquiry ${String(payload.referenceId ?? "")}`, html: `<h1>New inquiry</h1>${keys.map((key) => `<p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(payload[key] ?? "—"))}</p>`).join("")}` };
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

async function lease(workerId: string) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<EmailOutbox[]>`SELECT * FROM "EmailOutbox" WHERE (status = 'PENDING' OR (status = 'SENDING' AND "lockedAt" < NOW() - INTERVAL '10 minutes')) AND "nextAttemptAt" <= NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 5`;
    if (!rows.length) return [];
    await tx.emailOutbox.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { status: "SENDING", lockedAt: new Date(), lockedBy: workerId } });
    return rows;
  });
}

export async function processEmailBatch(workerId: string) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return 0;
  const resend = new Resend(env.RESEND_API_KEY); const jobs = await lease(workerId);
  for (const job of jobs) {
    try {
      const payload = job.payload as Record<string, unknown>; const message = job.templateKey === "customer-receipt" ? receipt(job.locale, payload) : sales(payload);
      const result = await resend.emails.send({ from: env.RESEND_FROM_EMAIL, to: job.toAddress, subject: message.subject, html: message.html });
      if (result.error) throw new Error(result.error.message);
      await db.emailOutbox.update({ where: { id: job.id }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lockedAt: null, lockedBy: null, lastError: null } });
    } catch (error) {
      const attempts = job.attempts + 1; const dead = attempts >= job.maxAttempts; const delayMinutes = Math.min(360, 2 ** attempts);
      await db.emailOutbox.update({ where: { id: job.id }, data: { status: dead ? "DEAD" : "PENDING", attempts, nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000), lockedAt: null, lockedBy: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "unknown" } });
    }
  }
  return jobs.length;
}
