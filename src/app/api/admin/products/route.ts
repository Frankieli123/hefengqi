import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { authenticateApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ingestProductsPayload } from "@/lib/product-ingest";

export async function GET(request: Request) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const querySchema = z.object({
    q: z.string().trim().max(120).catch(""),
    brand: z.string().trim().optional().catch(undefined),
    category: z.string().trim().optional().catch(undefined),
    status: z.enum(["DRAFT", "NEEDS_REVIEW", "READY", "PUBLISHED", "ARCHIVED"]).optional().catch(undefined),
    origin: z.enum(["AI", "MANUAL", "LOCAL_IMPORT", "WEB_SOURCE"]).optional().catch(undefined),
    page: z.coerce.number().int().min(1).catch(1),
    pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  });

  const query = querySchema.parse(Object.fromEntries(url.searchParams));

  const where: Prisma.ProductWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.origin ? { origin: query.origin } : {}),
    ...(query.brand ? {
      OR: [
        { brandId: query.brand },
        { brand: { slug: query.brand.toLowerCase() } },
        { brand: { name: { contains: query.brand, mode: "insensitive" } } },
      ],
    } : {}),
    ...(query.category ? {
      OR: [
        { categoryId: query.category },
        { category: { key: query.category } },
      ],
    } : {}),
    ...(query.q ? {
      OR: [
        { model: { contains: query.q, mode: "insensitive" } },
        { sku: { contains: query.q, mode: "insensitive" } },
        { translations: { some: { name: { contains: query.q, mode: "insensitive" } } } },
      ],
    } : {}),
  };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, slug: true, localizedNames: true } },
        category: {
          select: {
            id: true,
            key: true,
            translations: { where: { locale: "zh" }, select: { name: true } },
          },
        },
        translations: {
          select: { locale: true, name: true, slug: true, published: true },
        },
        _count: { select: { attributes: true, media: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      normalizedId: p.normalizedId,
      model: p.model,
      sku: p.sku,
      status: p.status,
      origin: p.origin,
      brand: {
        id: p.brand.id,
        name: p.brand.name,
        slug: p.brand.slug,
        names: Object.fromEntries(Object.entries(p.brand.localizedNames as Record<string, string>)),
      },
      category: {
        id: p.category.id,
        key: p.category.key,
        name: p.category.translations[0]?.name ?? p.category.key,
      },
      translations: p.translations,
      attributesCount: p._count.attributes,
      mediaCount: p._count.media,
      updatedAt: p.updatedAt.toISOString(),
      links: {
        admin: `/admin/products/${p.id}`,
        api: `/api/admin/products/${p.id}`,
      },
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  try {
    const rawBody = await request.json();
    const result = await ingestProductsPayload(rawBody, {
      actorId: auth.actorId,
      actorType: auth.actorType,
    });

    const isSingle = result.total === 1;
    const singleItem = result.items[0];

    if (isSingle && singleItem) {
      if (!singleItem.success) {
        return NextResponse.json(
          { code: "INGEST_FAILED", error: singleItem.error, model: singleItem.model },
          { status: 400 },
        );
      }
      return NextResponse.json(singleItem, { status: 201 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
