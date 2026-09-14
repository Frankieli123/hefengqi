import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createConversation, CustomerServiceError } from "@/lib/customer-service";
import { locales } from "@/types/domain";

const createSchema = z.object({ locale: z.enum(locales) });

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 2_000) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    const input = createSchema.parse(await request.json());
    const conversation = await createConversation(input.locale);
    return NextResponse.json(conversation, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
    if (error instanceof CustomerServiceError) return NextResponse.json({ code: error.code }, { status: error.status });
    console.error("customer_service_conversation_create_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
