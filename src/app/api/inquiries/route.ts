import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createInquiry, createInquirySchema, InquiryError } from "@/lib/inquiries";

const validationMessages = {
  zh: { name: "请输入姓名。", email: "请输入有效的邮箱地址。", country: "请输入国家或地区。", interestedCategoryId: "请选择感兴趣的产品。", requirements: "请输入至少 10 个字符的需求说明。", privacyConsent: "请同意隐私政策。" },
  en: { name: "Please enter your name.", email: "Please enter a valid email address.", country: "Please enter your country or region.", interestedCategoryId: "Please select a product of interest.", requirements: "Please enter at least 10 characters describing your requirements.", privacyConsent: "Please agree to the privacy policy." },
  ru: { name: "Введите имя.", email: "Введите действительный адрес электронной почты.", country: "Введите страну или регион.", interestedCategoryId: "Выберите интересующий товар.", requirements: "Опишите требования минимум в 10 символах.", privacyConsent: "Согласитесь с политикой конфиденциальности." },
} as const;

function getBodyLocale(body: unknown): keyof typeof validationMessages {
  if (body && typeof body === "object" && "locale" in body && (body.locale === "zh" || body.locale === "ru")) return body.locale;
  return "en";
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let outcome = "internal_error";
  let rawBody: unknown;
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 32_000) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    rawBody = await request.json();
    const body = createInquirySchema.parse(rawBody);
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await createInquiry(body, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
    outcome = "created";
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store", "Server-Timing": `inquiry;dur=${(performance.now() - startedAt).toFixed(1)}` } });
  } catch (error) {
    if (error instanceof ZodError) {
      outcome = "validation_error";
      const locale = getBodyLocale(rawBody);
      const messages = validationMessages[locale];
      const fieldErrors = Object.fromEntries([...new Set(error.issues.map((issue) => String(issue.path[0] ?? "form")))].flatMap((field) => messages[field as keyof typeof messages] ? [[field, [messages[field as keyof typeof messages]]]] : []));
      return NextResponse.json({ code: "VALIDATION_ERROR", fieldErrors }, { status: 400 });
    }
    if (error instanceof InquiryError) {
      outcome = error.code.toLowerCase();
      return NextResponse.json({ code: error.code, ...(error.code === "INVALID_CATEGORY" ? { fieldErrors: { interestedCategoryId: [validationMessages[getBodyLocale(rawBody)].interestedCategoryId] } } : {}) }, { status: error.status });
    }
    console.error("inquiry_create_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  } finally {
    console.info("inquiry_request", { outcome, durationMs: Math.round(performance.now() - startedAt) });
  }
}

export const dynamic = "force-dynamic";
