import type { MetadataRoute } from "next";
import { getCategories, getEditorialSummaries, getProductSitemapEntries } from "@/lib/content-repository";
import { siteUrl } from "@/lib/site-url";
import { locales } from "@/types/domain";

import { seoDate, staticSeoPaths as staticPaths } from "@/lib/seo-paths";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await Promise.all(locales.map(async (locale) => {
    const [products, categories, industries, cases, news] = await Promise.all([
      getProductSitemapEntries(locale),
      getCategories(locale),
      getEditorialSummaries(locale, "industries"),
      getEditorialSummaries(locale, "cases"),
      getEditorialSummaries(locale, "news")
    ]);

    return [
      ...staticPaths.map((path) => ({
        url: `${siteUrl}/${locale}${path}`,
        changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
        priority: path === "" ? 1 : path === "/products" ? .9 : .7
      })),
      ...categories.map((item) => ({
        url: `${siteUrl}/${locale}/products/category/${item.path}`,
        lastModified: seoDate(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .75
      })),
      ...products.filter((item) => item.slug !== "compare").map((item) => ({
        url: `${siteUrl}/${locale}/products/${item.slug}`,
        lastModified: seoDate(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .8,
        images: item.image ? [new URL(item.image.src, siteUrl).toString()] : undefined
      })),
      ...industries.map((item) => ({
        url: `${siteUrl}/${locale}/solutions/${item.slug}`,
        lastModified: seoDate(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .7
      })),
      ...cases.map((item) => ({
        url: `${siteUrl}/${locale}/cases/${item.slug}`,
        lastModified: seoDate(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .65
      })),
      ...news.map((item) => ({
        url: `${siteUrl}/${locale}/news/${item.slug}`,
        lastModified: seoDate(item.updatedAt),
        changeFrequency: "weekly" as const,
        priority: .65
      })),
    ];
  }));

  return [...new Map(entries.flat().map((entry) => [entry.url, entry])).values()];
}

export const dynamic = "force-dynamic";
