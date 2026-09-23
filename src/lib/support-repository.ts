import "server-only";

import { cache } from "react";
import { getCategories, getProductSupportCatalog, getProductSupportCatalogPage, getProductSupportFacets } from "@/lib/content-repository";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getDemoEditorial } from "@/content/demo-data";
import type { EditorialItem, Locale } from "@/types/domain";

export const getSupportArticles = cache(async (locale: Locale): Promise<EditorialItem[]> => {
  if (isDemoMode) return getDemoEditorial(locale, "news").filter((article) => article.newsCategory === "TUTORIAL_GUIDE" || article.newsCategory === "BUYING_GUIDE");
  const items = await db.newsArticleTranslation.findMany({
    where: {
      locale,
      published: true,
      article: { status: "PUBLISHED", category: { in: ["TUTORIAL_GUIDE", "BUYING_GUIDE"] } },
    },
    select: {
      articleId: true,
      slug: true,
      title: true,
      summary: true,
      article: {
        select: {
          category: true,
          authorName: true,
          publishedAt: true,
          updatedAt: true,
          relatedProducts: { select: { productId: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
          coverImage: { select: { kind: true, scanStatus: true, rightsApproved: true, storageKey: true, width: true, height: true } },
        },
      },
      imageAlt: true,
    },
    orderBy: { article: { publishedAt: "desc" } },
  });
  return items.map((item) => {
    const cover = item.article.coverImage;
    const coverImage = cover?.kind === "IMAGE" && cover.scanStatus === "CLEAN" && cover.rightsApproved && cover.width && cover.height
      ? { src: `/media/${cover.storageKey}`, alt: item.imageAlt.trim() || item.title, width: cover.width, height: cover.height }
      : undefined;
    return {
      id: item.articleId,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      body: [],
      updatedAt: item.article.updatedAt.toISOString(),
      publishedAt: item.article.publishedAt?.toISOString(),
      authorName: item.article.authorName,
      coverImage,
      newsCategory: item.article.category,
      relatedProductSlots: item.article.relatedProducts,
    };
  });
});

// Phase one uses published catalogue data and editorial, without inventing alarm manuals.
// Only the paginated results are rendered; the catalogue is never sent as client props.
export const getSupportData = cache(async (locale: Locale, query?: { q?: string; brand?: string; type?: string; page?: number }) => {
  const hasFilters = Boolean(query?.q || query?.brand || query?.type);
  const page = query?.page ?? 1;
  if (hasFilters) {
    const [products, categories, articles] = await Promise.all([getProductSupportCatalog(locale), getCategories(locale), getSupportArticles(locale)]);
    return { products, categories, articles, facets: undefined, pageData: undefined };
  }
  const [pageData, facets, categories, articles] = await Promise.all([
    getProductSupportCatalogPage(locale, page, 6),
    getProductSupportFacets(locale),
    getCategories(locale),
    getSupportArticles(locale),
  ]);
  return { products: pageData.products, categories, articles, facets, pageData };
});
