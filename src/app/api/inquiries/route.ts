import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createInquiry, createInquirySchema, InquiryError } from "@/lib/inquiries";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 32_000) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    const body = createInquirySchema.parse(await request.json());
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await createInquiry(body, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: "VALIDATION_ERROR", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
    if (error instanceof InquiryError) return NextResponse.json({ code: error.code }, { status: error.status });
    console.error("inquiry_create_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
