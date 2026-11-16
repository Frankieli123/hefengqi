import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import Page, { generateMetadata } from "./page";
import type { EditorialItem } from "@/types/domain";

const { getEditorialBySlug, getEditorialRecentSummaries, getEditorialAlternatePaths, getNewsRelatedProducts } = vi.hoisted(() => ({ getEditorialBySlug: vi.fn(), getEditorialRecentSummaries: vi.fn(), getEditorialAlternatePaths: vi.fn(), getNewsRelatedProducts: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { SITE_URL: "https://ricewind.com" } }));
vi.mock("@/lib/content-repository", () => ({ getEditorialBySlug, getEditorialRecentSummaries, getEditorialAlternatePaths, getNewsRelatedProducts, getSlugRedirect: async () => undefined }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ locale, href, ...props }: React.ComponentProps<"a"> & { locale?: string }) => <a href={locale ? `/${locale}${href}` : href} {...props} /> }));
vi.mock("@/components/products/product-card", () => ({ ProductCard: () => null }));

const article: EditorialItem = {
  id: "guide", slug: "device-guide", title: "设备操作指南", summary: "真实摘要", body: ["真实正文及设备检查要求。"],
  newsCategory: "TUTORIAL_GUIDE", authorName: "HEFENGQI Technical Team",
  publishedAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z",
  coverImage: { src: "/media/news/device-guide.webp", alt: "设备操作现场", width: 1600, height: 900 },
};

describe("news detail SSR", () => {
  beforeEach(() => {
    getEditorialBySlug.mockResolvedValue(article);
    getEditorialRecentSummaries.mockResolvedValue([]);
    getEditorialAlternatePaths.mockResolvedValue({ zh: "/news/device-guide", en: "/news/en-device-guide" });
    getNewsRelatedProducts.mockResolvedValue([]);
  });

  it.each([
    ["zh", "发布", "更新", "作者"], ["en", "Published", "Updated", "Author"], ["ru", "Опубликовано", "Обновлено", "Автор"],
  ])("renders truthful JSON-LD and visible bylines in %s without client JavaScript", async (locale, published, updated, author) => {
    const markup = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale, slug: article.slug }) }));
    const $ = load(markup);
    const payload = JSON.parse($('script[type="application/ld+json"]').text());
    const schemas = payload['@graph'] ?? payload;
    expect(schemas.map((schema: { "@type": string }) => schema["@type"])).toEqual(["TechArticle", "BreadcrumbList"]);
    expect(schemas[0]).toMatchObject({ datePublished: article.publishedAt, dateModified: article.updatedAt, author: { name: article.authorName } });
    expect(schemas[1].itemListElement[2].item).toBe(`https://ricewind.com/${locale}/news/${article.slug}`);
    expect(markup).not.toContain("HowTo");
    expect($("h1")).toHaveLength(1);
    expect($(".editorial-rich-text > p").map((_, element) => $(element).text()).get()).toEqual(article.body);
    expect($(".editorial-detail-intro").text()).toContain(`${author}: `);
    expect($(".editorial-detail-intro").text()).toContain(published);
    expect($(".editorial-detail-intro").text()).toContain(updated);
    expect($("header time").map((_, element) => $(element).attr("datetime")).get()).toEqual([article.publishedAt, article.updatedAt]);
    expect($(".editorial-detail-media img")).toHaveLength(1);
    expect($(".editorial-article-body img")).toHaveLength(0);
    expect($("#article-heading")).toHaveLength(0);
  });

  it("does not label an unknown publication date as published", async () => {
    getEditorialBySlug.mockResolvedValue({ ...article, publishedAt: undefined, authorName: undefined });
    const $ = load(renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "zh", slug: article.slug }) })));
    expect($("header time")).toHaveLength(1);
    expect($("header").text()).toContain("更新");
    expect($("header").text()).not.toContain("发布");
    expect($("header").text()).not.toContain("作者");
    const payload = JSON.parse($('script[type="application/ld+json"]').text());
    const schemas = payload['@graph'] ?? payload;
    expect(schemas[0]).not.toHaveProperty("datePublished");
  });

  it("renders structured article content as semantic server HTML", async () => {
    getEditorialBySlug.mockResolvedValue({ ...article, richBody: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "安全检查" }] },
      { type: "paragraph", content: [{ type: "text", text: "确认", marks: [{ type: "bold" }] }, { type: "text", text: "设备型号" }] },
      { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "断开输入" }] }] }] },
      { type: "codeBlock", content: [{ type: "text", text: "0x1081407F" }] },
    ] } });
    const $ = load(renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "zh", slug: article.slug }) })));
    expect($(".editorial-rich-text h2").text()).toBe("安全检查");
    expect($(".editorial-rich-text strong").text()).toBe("确认");
    expect($(".editorial-rich-text ol > li").text()).toBe("断开输入");
    expect($(".editorial-rich-text pre code").text()).toBe("0x1081407F");
  });

  it("uses only existing translations in the route metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "zh", slug: article.slug }) });
    expect(metadata.alternates?.languages).toEqual({ zh: "https://ricewind.com/zh/news/device-guide", en: "https://ricewind.com/en/news/en-device-guide", "x-default": "https://ricewind.com/en/news/en-device-guide" });
  });
});
