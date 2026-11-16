import { NextResponse } from "next/server";
import { getConversationForVisitor } from "@/lib/customer-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get("x-customer-service-token") ?? "";
  const conversation = await getConversationForVisitor(id, token);
  if (!conversation) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(conversation, { headers: { "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";
