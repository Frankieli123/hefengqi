import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { addVisitorMessage, CustomerServiceError } from "@/lib/customer-service";

const messageSchema = z.object({ body: z.string().trim().min(1).max(1_000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ code: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 4_000) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    const { id } = await params;
    const token = request.headers.get("x-customer-service-token") ?? "";
    const input = messageSchema.parse(await request.json());
    const message = await addVisitorMessage(id, token, input.body);
    if (!message) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(message, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
    if (error instanceof CustomerServiceError) return NextResponse.json({ code: error.code }, { status: error.status });
    console.error("customer_service_message_create_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
