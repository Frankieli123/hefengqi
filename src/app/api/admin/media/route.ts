import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { secureUpload } from "@/lib/uploads";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await authenticateApi(request);
  if (!auth.ok) return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });

  const url = new URL(request.url);
  const query = z.object({
    q: z.string().trim().max(120).catch(""),
    kind: z.enum(["IMAGE", "DOCUMENT", "ARCHIVE"]).optional().catch(undefined),
    page: z.coerce.number().int().min(1).catch(1),
    pageSize: z.coerce.number().int().min(1).max(50).catch(20),
    scanStatus: z.enum(["QUARANTINED", "CLEAN", "REJECTED"]).optional().catch(undefined),
    rightsApproved: z.enum(["true", "false"]).optional().catch(undefined),
  }).parse(Object.fromEntries(url.searchParams));

  const where: Prisma.MediaAssetWhereInput = {
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.q ? { originalName: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.scanStatus ? { scanStatus: query.scanStatus } : {}),
    ...(query.rightsApproved ? { rightsApproved: query.rightsApproved === "true" } : {}),
  };

  const [items, total] = await Promise.all([
    db.mediaAsset.findMany({
      where,
      select: {
        id: true, originalName: true, storageKey: true, kind: true, mimeType: true, width: true, height: true,
        variants: true, scanStatus: true, rightsApproved: true, rightsNote: true, sourceUrl: true, createdAt: true,
        _count: { select: { productLinks: true, heroDesktopUses: true, heroMobileUses: true, newsCoverUses: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.mediaAsset.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      url: `/media/${item.storageKey}`,
      createdAt: item.createdAt.toISOString(),
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApi(request);
  if (!auth.ok) return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });

  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > 101 * 1024 * 1024) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ code: "FILE_REQUIRED" }, { status: 400 });

    const productValue = data.get("productId");
    const productId = z.string().min(1).optional().parse(typeof productValue === "string" && productValue ? productValue : undefined);
    const product = productId ? await db.product.findUnique({ where: { id: productId }, select: { id: true, primaryImageId: true, _count: { select: { media: true } } } }) : undefined;
    if (productId && !product) return NextResponse.json({ code: "PRODUCT_NOT_FOUND" }, { status: 404 });

    const isProductImage = Boolean(productId && /\.(?:jpe?g|png|webp|avif)$/i.test(file.name));
    const asset = await secureUpload(file, { malwareScan: !isProductImage });
    if (!productId && asset.kind !== "IMAGE") {
      return NextResponse.json({ code: "MEDIA_LIBRARY_MUST_BE_IMAGE" }, { status: 400 });
    }
    if (asset.kind !== "IMAGE" && asset.kind !== "DOCUMENT") {
      return NextResponse.json({ code: "UNSUPPORTED_MEDIA_KIND" }, { status: 400 });
    }

    await db.$transaction([
      ...(productId && product ? [
        db.productMedia.upsert({
          where: { productId_assetId: { productId, assetId: asset.id } },
          update: {},
          create: {
            productId,
            assetId: asset.id,
            sortOrder: product._count.media,
            alt: { zh: file.name, en: file.name, ru: file.name },
          },
        }),
        ...(product.primaryImageId || asset.kind !== "IMAGE" ? [] : [
          db.product.update({ where: { id: productId }, data: { primaryImageId: asset.id, status: "DRAFT" } }),
        ]),
      ] : []),
      db.auditLog.create({
        data: {
          actorId: auth.actorId,
          actorType: auth.actorType,
          action: "MEDIA_UPLOAD",
          entityType: "MediaAsset",
          entityId: asset.id,
          details: { productId: productId ?? null, libraryOnly: !productId, kind: asset.kind },
        },
      }),
    ]);

    return NextResponse.json({
      id: asset.id,
      kind: asset.kind,
      originalName: asset.originalName,
      storageKey: asset.storageKey,
      url: `/media/${asset.storageKey}`,
      scanStatus: asset.scanStatus,
      rightsApproved: asset.rightsApproved,
    }, { status: 201 });
  } catch (error) {
    console.error("media_upload_rejected", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ code: error instanceof Error ? error.message : "UPLOAD_REJECTED" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
