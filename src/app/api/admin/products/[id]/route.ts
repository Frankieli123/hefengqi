import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApi } from "@/lib/api-auth";
import { archiveProduct, getProductDetailForApi, updateProductPartial } from "@/lib/product-ingest";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const product = await getProductDetailForApi(id);
  if (!product) {
    return NextResponse.json({ code: "PRODUCT_NOT_FOUND", message: `Product ${id} not found.` }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const rawBody = await request.json();
    const result = await updateProductPartial(id, rawBody, {
      actorId: auth.actorId,
      actorType: auth.actorType,
    });

    if (!result) {
      return NextResponse.json({ code: "PRODUCT_NOT_FOUND", message: `Product ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ code: "VALIDATION_ERROR", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const result = await archiveProduct(id, {
    actorId: auth.actorId,
    actorType: auth.actorType,
  });

  if (!result) {
    return NextResponse.json({ code: "PRODUCT_NOT_FOUND", message: `Product ${id} not found.` }, { status: 404 });
  }

  return NextResponse.json({ success: true, archived: true, id });
}

export const dynamic = "force-dynamic";
