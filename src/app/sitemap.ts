import type { MetadataRoute } from "next";
import { getCategories, getEditorial, getProducts } from "@/lib/content-repository";
import { env } from "@/lib/env";
import { locales } from "@/types/domain";

const siteUrl = env.SITE_URL;
const staticPaths = ["", "/products", "/solutions", "/cases", "/news", "/about", "/contact", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticLastModified = new Date(env.SITE_CONTENT_UPDATED_AT);

  // 1. 显式添加根路径裸域名（Canonical Root Domain Entry）
  const rootEntry: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    lastModified: staticLastModified,
    changeFrequency: "weekly" as const,
    priority: 1.0,
  };

  const entries = await Promise.all(locales.map(async (locale) => {
    const [products, categories, industries, cases, news] = await Promise.all([
      getProducts(locale),
      getCategories(locale),
      getEditorial(locale, "industries"),
      getEditorial(locale, "cases"),
      getEditorial(locale, "news")
    ]);

    return [
      ...staticPaths.map((path) => ({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: staticLastModified,
        changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
        priority: path === "" ? 1 : path === "/products" ? .9 : .7
      })),
      ...categories.map((item) => ({
        url: `${siteUrl}/${locale}/products/category/${item.path}`,
        lastModified: item.updatedAt ? new Date(item.updatedAt) : staticLastModified,
        changeFrequency: "monthly" as const,
        priority: .75
      })),
      ...products.map((item) => ({
        url: `${siteUrl}/${locale}/products/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .8,
        images: item.image ? [new URL(item.image.src, siteUrl).toString()] : undefined
      })),
      ...industries.map((item) => ({
        url: `${siteUrl}/${locale}/solutions/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .7
      })),
      ...cases.map((item) => ({
        url: `${siteUrl}/${locale}/cases/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: .65
      })),
      ...news.map((item) => ({
        url: `${siteUrl}/${locale}/news/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        changeFrequency: "weekly" as const,
        priority: .65
      })),
    ];
  }));

  return [rootEntry, ...entries.flat()];
}

export const dynamic = "force-dynamic";
