import "server-only";
import { cache } from "react";
import type { Locale } from "@/types/domain";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
export type GuideLink = { id: string; slug: string; title: string; summary: string };
export const getProductGuides = cache(async (locale: Locale, productId: string): Promise<GuideLink[]> => {
  if (isDemoMode) return [];
  const rows = await db.newsArticleTranslation.findMany({
    where: { locale, published: true, article: { status: "PUBLISHED", relatedProducts: { some: { productId } } } },
    select: { articleId: true, slug: true, title: true, summary: true },
    orderBy: [{ article: { publishedAt: "desc" } }, { articleId: "asc" }], take: 3,
  });
  return rows.map(({ articleId, ...row }) => ({ id: articleId, ...row }));
});

const featuredKeys = [
 "huawei-r4850g2-rectifier-selection-buyers-guide-2026",
 "zte-zxd3000-rectifier-selection-buyers-guide-2026",
 "eltek-flatpack2-48-3000-he-rectifier-selection-buyers-guide-2026",
 "huawei-r4850g2-pinout-standalone-wiring-guide-2026",
];
export const getFeaturedGuides = cache(async (locale: Locale): Promise<GuideLink[]> => {
 if (isDemoMode) return [];
 const rows = await db.newsArticleTranslation.findMany({
  where: { locale, published: true, article: { status: "PUBLISHED", key: { in: featuredKeys } } },
  select: { articleId: true, slug: true, title: true, summary: true },
  orderBy: [{ article: { publishedAt: "desc" } }, { articleId: "asc" }], take: 4,
 });
 return rows.map(({ articleId, ...row }) => ({ id: articleId, ...row }));
});
