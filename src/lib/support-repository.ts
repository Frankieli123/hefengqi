import "server-only";

import { cache } from "react";
import { getCategories, getEditorial, getProducts } from "@/lib/content-repository";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import type { Locale } from "@/types/domain";

// Phase one uses published catalogue data and editorial, without inventing alarm manuals.
// Only the paginated results are rendered; the catalogue is never sent as client props.
export const getSupportData = cache(async (locale: Locale) => {
  const [products, categories, news] = await Promise.all([getProducts(locale), getCategories(locale), getEditorial(locale, "news")]);
  const guides = news.filter((article) => article.newsCategory === "TUTORIAL_GUIDE" || article.newsCategory === "BUYING_GUIDE");
  const links = !isDemoMode && guides.length
    ? await db.newsArticleProduct.findMany({ where: { articleId: { in: guides.map((article) => article.id) } }, select: { articleId: true, productId: true, sortOrder: true } })
    : [];
  const articles = guides.map((article) => ({ ...article, relatedProductSlots: links.filter((link) => link.articleId === article.id).map(({ productId, sortOrder }) => ({ productId, sortOrder })) }));
  return { products, categories, articles };
});
