import { describe, expect, it, vi } from "vitest";
import { breadcrumbSchema, localizedMetadata, newsArticleMetadata, newsArticleSchema } from "@/lib/seo";
import type { EditorialItem } from "@/types/domain";

vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));

const article: EditorialItem = {
  id: "article-1", slug: "real-guide", title: "设备维护指南", summary: "经编辑发布的维护说明", body: ["实际正文"],
  publishedAt: "2026-09-10T02:00:00.000Z", updatedAt: "2026-09-12T08:30:00.000Z",
  authorName: "HEFENGQI Technical Team", newsCategory: "TUTORIAL_GUIDE",
  coverImage: { src: "/media/news/guide.webp", alt: "设备维护现场", width: 1600, height: 900 },
};

describe("news structured data", () => {
  it.each(["zh", "en", "ru"] as const)("uses actual article facts in %s without manufactured procedures", (locale) => {
    const schema = newsArticleSchema(locale, article);
    expect(schema).toMatchObject({
      "@type": "TechArticle", headline: article.title, description: article.summary, inLanguage: locale,
      datePublished: article.publishedAt, dateModified: article.updatedAt,
      author: { "@type": "Organization", name: article.authorName },
      image: ["https://ricewind.com/media/news/guide.webp"],
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://ricewind.com/${locale}/news/real-guide` },
    });
    for (const field of ["step", "tool", "supply", "totalTime", "proficiencyLevel"]) expect(schema).not.toHaveProperty(field);
    expect(JSON.stringify(schema)).not.toContain("HowTo");
  });

  it.each(["INDUSTRY_INSIGHTS", "BUYING_GUIDE", undefined] as const)("uses Article for %s even when the title says guide", (newsCategory) => {
    expect(newsArticleSchema("zh", { ...article, newsCategory })["@type"]).toBe("Article");
  });

  it("omits unavailable dates, author and cover instead of inventing fallbacks", () => {
    const schema = newsArticleSchema("zh", { ...article, publishedAt: undefined, authorName: " ", coverImage: undefined });
    expect(schema).not.toHaveProperty("datePublished");
    expect(schema).not.toHaveProperty("author");
    expect(schema).not.toHaveProperty("image");
    expect(schema.dateModified).toBe(article.updatedAt);
  });

  it("uses the actual cover for article sharing metadata, including absolute URLs", () => {
    const item = { ...article, coverImage: { ...article.coverImage!, src: "https://cdn.example.com/guide.webp" } };
    const metadata = newsArticleMetadata("zh", item, { zh: "/news/real-guide" });
    expect(metadata.openGraph).toMatchObject({ type: "article", publishedTime: article.publishedAt, modifiedTime: article.updatedAt, images: [{ url: item.coverImage.src, alt: item.coverImage.alt, width: 1600, height: 900 }] });
    expect(metadata.authors).toEqual([{ name: article.authorName }]);
    expect(newsArticleSchema("zh", item).image).toEqual([item.coverImage.src]);
  });

  it("creates ordered breadcrumbs for the actual news route", () => {
    const schema = breadcrumbSchema([{ name: "首页", path: "/zh" }, { name: "新闻动态", path: "/zh/news" }, { name: article.title, path: `/zh/news/${article.slug}` }]);
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "首页", item: "https://ricewind.com/zh" },
      { "@type": "ListItem", position: 2, name: "新闻动态", item: "https://ricewind.com/zh/news" },
      { "@type": "ListItem", position: 3, name: article.title, item: "https://ricewind.com/zh/news/real-guide" },
    ]);
  });
});

describe("language alternates", () => {
  it("keeps default translations for static pages", () => {
    expect(localizedMetadata("zh", "/news", "News", "Description").alternates).toEqual({ canonical: "https://ricewind.com/zh/news", languages: { zh: "https://ricewind.com/zh/news", en: "https://ricewind.com/en/news", ru: "https://ricewind.com/ru/news", fr: "https://ricewind.com/fr/news", de: "https://ricewind.com/de/news", es: "https://ricewind.com/es/news", ar: "https://ricewind.com/ar/news", "x-default": "https://ricewind.com/en/news" } });
  });

  it("uses each published translation's real slug", () => {
    expect(localizedMetadata("zh", "/news/zh-guide", "News", "Description", false, { zh: "/news/zh-guide", en: "/news/en-guide", ru: "/news/ru-guide" }).alternates?.languages).toEqual({ zh: "https://ricewind.com/zh/news/zh-guide", en: "https://ricewind.com/en/news/en-guide", ru: "https://ricewind.com/ru/news/ru-guide", "x-default": "https://ricewind.com/en/news/en-guide" });
  });

  it("does not fabricate missing English or Russian versions", () => {
    expect(localizedMetadata("zh", "/news/zh-guide", "News", "Description", false, { zh: "/news/zh-guide" }).alternates?.languages).toEqual({ zh: "https://ricewind.com/zh/news/zh-guide", "x-default": "https://ricewind.com/zh/news/zh-guide" });
  });

  it("uses an existing Russian version as default when it is the only translation", () => {
    expect(localizedMetadata("ru", "/news/ru-guide", "News", "Description", false, { ru: "/news/ru-guide" }).alternates?.languages).toEqual({ ru: "https://ricewind.com/ru/news/ru-guide", "x-default": "https://ricewind.com/ru/news/ru-guide" });
  });

  it("respects an explicitly empty alternate map", () => {
    const metadata = localizedMetadata("zh", "/news/zh-guide", "News", "Description", false, {});
    expect(metadata.alternates?.canonical).toBe("https://ricewind.com/zh/news/zh-guide");
    expect(metadata.alternates?.languages).toEqual({});
  });
});
