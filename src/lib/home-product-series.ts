import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import { categoryDescendantIds } from "@/lib/category-tree";
import type { Locale, ProductImageView } from "@/types/domain";

export const homeProductSeries = [
  { key: "cabinetAir", categoryKey: "cabinet-air-conditioning" },
  { key: "precisionAir", categoryKey: "precision-air-conditioning" },
  { key: "dcPower", categoryKey: "dc-power-systems" },
  { key: "upsPower", categoryKey: "battery" },
  { key: "indoorPower", categoryKey: "indoor-power-systems" },
  { key: "siteEnergy", categoryKey: "site-energy-systems" },
] as const;

type HomeProduct = {
  id: string;
  categoryId: string;
  primaryImageId: string | null;
  status: string;
  brand: { archivedAt: Date | null; rightsConfirmed: boolean };
  translations: Array<{ name: string }>;
  media: Array<{ assetId: string; alt: unknown; asset: { kind: string; scanStatus: string; rightsApproved: boolean; storageKey: string; width: number | null; height: number | null } }>;
};

const homeProductSelect = (locale: Locale) => ({
  id: true,
  categoryId: true,
  primaryImageId: true,
  status: true,
  brand: { select: { archivedAt: true, rightsConfirmed: true } },
  translations: { where: { locale, published: true }, select: { name: true } },
  media: {
    where: { asset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true } },
    select: { assetId: true, alt: true, asset: { select: { kind: true, scanStatus: true, rightsApproved: true, storageKey: true, width: true, height: true } } },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ProductSelect);

function localizedAlt(value: unknown, locale: Locale, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const alt = (value as Record<string, unknown>)[locale];
  return typeof alt === "string" && alt.trim() ? alt.trim() : fallback;
}

function productImage(product: HomeProduct, locale: Locale): ProductImageView | undefined {
  if (product.status !== "PUBLISHED" || product.brand.archivedAt || !product.brand.rightsConfirmed || !product.primaryImageId) return undefined;
  const media = product.media.find((item) => item.assetId === product.primaryImageId);
  if (!media?.asset.width || !media.asset.height || media.asset.kind !== "IMAGE" || media.asset.scanStatus !== "CLEAN" || !media.asset.rightsApproved) return undefined;
  const fallback = product.translations[0]?.name ?? "HEFENGQI product";
  return { src: `/media/${media.asset.storageKey}`, alt: localizedAlt(media.alt, locale, fallback), width: media.asset.width, height: media.asset.height };
}

export const getHomeProductSeriesImages = cache(async (locale: Locale): Promise<Record<string, ProductImageView | undefined>> => {
  const empty = Object.fromEntries(homeProductSeries.map((item) => [item.categoryKey, undefined])) as Record<string, ProductImageView | undefined>;
  if (isDemoMode && !env.DATABASE_URL) return empty;

  const categories = await db.category.findMany({
    where: { status: "PUBLISHED", key: { in: homeProductSeries.map((item) => item.categoryKey) } },
    select: { id: true, key: true, parentId: true, status: true, homeFeaturedProductId: true },
  });
  const allCategories = await db.category.findMany({ select: { id: true, key: true, parentId: true, level: true, sortOrder: true, status: true } });
  const categoryByKey = new Map(categories.map((item) => [item.key, item]));
  const configuredIds = categories.map((item) => item.homeFeaturedProductId).filter((id): id is string => Boolean(id));
  const categoryProductIds = new Map<string, Set<string>>();
  const candidateCategoryIds = new Set<string>();
  for (const item of homeProductSeries) {
    const category = categoryByKey.get(item.categoryKey);
    if (!category) continue;
    const descendants = categoryDescendantIds(allCategories, category.id);
    const ids = new Set([...descendants].filter((id) => allCategories.find((node) => node.id === id)?.status === "PUBLISHED"));
    categoryProductIds.set(item.categoryKey, ids);
    ids.forEach((id) => candidateCategoryIds.add(id));
  }
  const configuredProducts = configuredIds.length ? await db.product.findMany({
    where: {
      id: { in: configuredIds },
      categoryId: { in: [...candidateCategoryIds] },
      status: "PUBLISHED",
      brand: { archivedAt: null, rightsConfirmed: true },
      translations: { some: { locale, published: true } },
    },
    select: homeProductSelect(locale),
  }) : [];
  const byId = new Map(configuredProducts.map((product) => [product.id, product]));
  const fallbackProducts = await Promise.all(homeProductSeries.map(async (item) => {
    const ids = categoryProductIds.get(item.categoryKey);
    const category = categoryByKey.get(item.categoryKey);
    const configured = category?.homeFeaturedProductId ? byId.get(category.homeFeaturedProductId) : undefined;
    if (configured && ids?.has(configured.categoryId) && productImage(configured, locale)) return configured;
    if (!ids?.size) return undefined;
    const candidates = await db.product.findMany({
      where: {
        categoryId: { in: [...ids] },
        status: "PUBLISHED",
        brand: { archivedAt: null, rightsConfirmed: true },
        translations: { some: { locale, published: true } },
        primaryImageId: { not: null },
      },
      select: homeProductSelect(locale),
      orderBy: [{ publishedAt: "desc" }, { model: "asc" }],
      take: 12,
    });
    return candidates.find((product) => Boolean(productImage(product, locale)));
  }));
  const result = { ...empty };
  for (const [index, item] of homeProductSeries.entries()) {
    const selected = fallbackProducts[index];
    result[item.categoryKey] = selected ? productImage(selected, locale) : undefined;
  }
  return result;
});
