import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Locale } from "@prisma/client";

const localizedText = z.object({ zh: z.string().trim().min(1).max(500), en: z.string().trim().min(1).max(500), ru: z.string().trim().min(1).max(500), fr: z.string().trim().min(1).max(500), de: z.string().trim().min(1).max(500), es: z.string().trim().min(1).max(500), ar: z.string().trim().min(1).max(500) });
const defaultWelcomeMessage = {
  zh: "您好，欢迎联系 RICEWIND。请告诉我们您需要哪方面的帮助。",
  en: "Hello, welcome to RICEWIND. Tell us how we can help.",
  ru: "Здравствуйте, добро пожаловать в RICEWIND. Расскажите, чем мы можем помочь.",
  fr: "Bonjour, bienvenue chez RICEWIND. Comment pouvons-nous vous aider ?",
  de: "Hallo, willkommen bei RICEWIND. Wie können wir Ihnen helfen?",
  es: "Hola, bienvenido a RICEWIND. ¿Cómo podemos ayudarle?",
  ar: "مرحبًا بكم في RICEWIND. كيف يمكننا مساعدتكم؟",
};
const defaultOfflineMessage = {
  zh: "当前客服暂时离线，您可以留言，我们上线后会回复；也可以直接通过 WhatsApp 联系我们。",
  en: "Our support team is currently offline. Leave a message and we will reply when we are back, or contact us on WhatsApp.",
  ru: "Сейчас специалисты офлайн. Оставьте сообщение — мы ответим позже или свяжитесь с нами в WhatsApp.",
  fr: "Notre équipe est actuellement hors ligne. Laissez un message et nous vous répondrons ou contactez-nous sur WhatsApp.",
  de: "Unser Support-Team ist derzeit offline. Hinterlassen Sie eine Nachricht oder kontaktieren Sie uns über WhatsApp.",
  es: "Nuestro equipo está desconectado. Deje un mensaje o contáctenos por WhatsApp.",
  ar: "فريق الدعم غير متصل حاليًا. اترك رسالة أو تواصل معنا عبر WhatsApp.",
};
function isPrivateWebhookHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (isIP(host) === 6) return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
  return false;
}

const optionalWebhookUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    const localDevelopment = env.NODE_ENV !== "production" && isPrivateWebhookHost(url.hostname);
    return (url.protocol === "https:" && !isPrivateWebhookHost(url.hostname)) || (localDevelopment && url.protocol === "http:");
  } catch {
    return false;
  }
}, "Webhook 必须使用 HTTPS（开发环境可使用 localhost）");

export const customerServiceSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  operatorOnline: z.boolean().default(true),
  email: z.string().email().default("lee@ricewind.com"),
  senderName: z.string().trim().min(1).max(100).default("RICEWIND"),
  senderEmail: z.string().email().default("lee@ricewind.com"),
  phone: z.string().trim().min(3).max(40).default("+86 17621197907"),
  whatsapp: z.string().trim().min(5).max(40).default("8617621197907"),
  webhookEnabled: z.boolean().default(false),
  webhookUrl: optionalWebhookUrl.default(""),
  webhookSecret: z.string().trim().max(200).default(""),
  welcomeMessage: localizedText.default(defaultWelcomeMessage),
  offlineMessage: localizedText.default(defaultOfflineMessage),
}).superRefine((value, context) => {
  if (!value.webhookEnabled) return;
  if (!value.webhookUrl) context.addIssue({ code: "custom", path: ["webhookUrl"], message: "启用 Webhook 时必须填写 URL" });
  if (value.webhookSecret.length < 16) context.addIssue({ code: "custom", path: ["webhookSecret"], message: "Webhook 签名密钥至少需要 16 个字符" });
});

export type CustomerServiceSettings = z.infer<typeof customerServiceSettingsSchema>;

const defaultSettings = customerServiceSettingsSchema.parse({});

export function parseCustomerServiceSettings(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const welcome = record.welcomeMessage && typeof record.welcomeMessage === "object" && !Array.isArray(record.welcomeMessage) ? record.welcomeMessage as Record<string, unknown> : {};
  const offline = record.offlineMessage && typeof record.offlineMessage === "object" && !Array.isArray(record.offlineMessage) ? record.offlineMessage as Record<string, unknown> : {};
  return customerServiceSettingsSchema.safeParse({ ...record, welcomeMessage: { ...defaultWelcomeMessage, ...welcome }, offlineMessage: { ...defaultOfflineMessage, ...offline } });
}

export async function getCustomerServiceSettings(): Promise<CustomerServiceSettings> {
  const setting = await db.siteSetting.findUnique({ where: { key: "customerService" }, select: { value: true } });
  const parsed = parseCustomerServiceSettings(setting?.value);
  return parsed.success ? parsed.data : defaultSettings;
}

export function hashVisitorToken(token: string) {
  return createHmac("sha256", env.IP_HASH_SECRET).update(token).digest("hex");
}

export function createVisitorToken() {
  return randomBytes(32).toString("hex");
}

function localeText(value: CustomerServiceSettings["welcomeMessage"], locale: Locale) {
  return value[locale] ?? value.en;
}

export function serializeMessage(message: { id: string; senderType: string; body: string; createdAt: Date }) {
  return { id: message.id, senderType: message.senderType, body: message.body, createdAt: message.createdAt.toISOString() };
}

export async function createConversation(locale: Locale) {
  const settings = await getCustomerServiceSettings();
  if (!settings.enabled) throw new CustomerServiceError("DISABLED", 404);
  const token = createVisitorToken();
  const conversation = await db.customerServiceConversation.create({
    data: {
      visitorTokenHash: hashVisitorToken(token),
      locale,
      messages: {
        create: [{ senderType: "SYSTEM", body: localeText(settings.welcomeMessage, locale) }],
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return {
    id: conversation.id,
    visitorToken: token,
    status: conversation.status,
    operatorOnline: settings.enabled && settings.operatorOnline,
    email: settings.email,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    offlineMessage: localeText(settings.offlineMessage, locale),
    messages: conversation.messages.map(serializeMessage),
  };
}

export async function findConversationForVisitor(id: string, token: string) {
  if (!id || !token || token.length > 160) return null;
  return db.customerServiceConversation.findFirst({ where: { id, visitorTokenHash: hashVisitorToken(token) } });
}

export async function getConversationForVisitor(id: string, token: string) {
  const conversation = await findConversationForVisitor(id, token);
  if (!conversation) return null;
  const settings = await getCustomerServiceSettings();
  const messages = await db.customerServiceMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 100 });
  return {
    id: conversation.id,
    status: conversation.status,
    operatorOnline: settings.enabled && settings.operatorOnline,
    email: settings.email,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    offlineMessage: localeText(settings.offlineMessage, conversation.locale),
    messages: messages.map(serializeMessage),
  };
}

export async function addVisitorMessage(id: string, token: string, body: string) {
  const conversation = await findConversationForVisitor(id, token);
  if (!conversation) return null;
  if (conversation.status === "CLOSED") throw new CustomerServiceError("CONVERSATION_CLOSED", 409);
  const recentCount = await db.customerServiceMessage.count({ where: { conversationId: id, senderType: "VISITOR", createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
  if (recentCount >= 30) throw new CustomerServiceError("RATE_LIMITED", 429);
  const message = body.trim();
  if (!message) throw new CustomerServiceError("MESSAGE_REQUIRED", 400);
  const created = await db.$transaction(async (tx) => {
    const item = await tx.customerServiceMessage.create({ data: { conversationId: id, senderType: "VISITOR", body: message } });
    await tx.customerServiceConversation.update({ where: { id }, data: { lastMessageAt: item.createdAt } });
    return item;
  });
  void notifyCustomerServiceWebhook({ conversationId: id, locale: conversation.locale, status: conversation.status, messageId: created.id, senderType: "VISITOR", body: created.body, createdAt: created.createdAt });
  return serializeMessage(created);
}

export async function notifyCustomerServiceWebhook(input: { conversationId: string; locale: Locale; status: string; messageId: string; senderType: "VISITOR" | "ADMIN"; body: string; createdAt: Date }) {
  try {
    const settings = await getCustomerServiceSettings();
    if (!settings.webhookEnabled || !settings.webhookUrl) return;
    const payload = {
      event: "customer_service.message.created",
      sentAt: new Date().toISOString(),
      conversation: { id: input.conversationId, locale: input.locale, status: input.status },
      message: { id: input.messageId, senderType: input.senderType, body: input.body, createdAt: input.createdAt.toISOString() },
    };
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", settings.webhookSecret || env.IP_HASH_SECRET).update(body).digest("hex");
    const response = await fetch(settings.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "RICEWIND-Customer-Service/1.0", "X-RICEWIND-Event": payload.event, "X-RICEWIND-Signature": `sha256=${signature}` }, body, signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!response.ok) console.error("customer_service_webhook_rejected", { status: response.status });
  } catch (error) {
    console.error("customer_service_webhook_failed", { error: error instanceof Error ? error.message : "unknown" });
  }
}

export async function notifyInquiryWebhook(input: {
  referenceId: string;
  name: string;
  email: string;
  phoneOrWhatsapp?: string | null;
  country: string;
  interestedCategory: string;
  requirements: string;
  productId?: string | null;
  locale: Locale;
  createdAt: Date;
}) {
  try {
    const settings = await getCustomerServiceSettings();
    if (!settings.webhookEnabled || !settings.webhookUrl) return;
    const payload = {
      event: "inquiry.created",
      sentAt: new Date().toISOString(),
      inquiry: {
        referenceId: input.referenceId,
        locale: input.locale,
        name: input.name,
        email: input.email,
        phoneOrWhatsapp: input.phoneOrWhatsapp,
        country: input.country,
        interestedCategory: input.interestedCategory,
        productId: input.productId,
        requirements: input.requirements,
        createdAt: input.createdAt.toISOString(),
      },
    };
    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", settings.webhookSecret || env.IP_HASH_SECRET).update(body).digest("hex");
    await fetch(settings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "RICEWIND-Inquiry-Service/1.0",
        "X-RICEWIND-Event": payload.event,
        "X-RICEWIND-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("inquiry_webhook_failed", { error: error instanceof Error ? error.message : "unknown" });
  }
}

export class CustomerServiceError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
