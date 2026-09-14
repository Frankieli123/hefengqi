import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, productQuery, redirectQuery, newsQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), productQuery: vi.fn(), redirectQuery: vi.fn(), newsQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: false }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, product: { findMany: productQuery }, slugRedirect: { findUnique: redirectQuery }, newsArticleTranslation: { findMany: newsQuery } } }));
import { getCategories, getEditorial, getEditorialAlternatePaths, getProducts, getSlugRedirect } from "@/lib/content-repository";

describe("CMS content repository", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses an intentionally empty CMS without resurrecting demo categories or products", async () => {
    categoryQuery.mockResolvedValue([]);
    productQuery.mockResolvedValue([]);
    expect(await getCategories("zh")).toEqual([]);
    expect(await getProducts("zh")).toEqual([]);
    expect(productQuery).toHaveBeenCalledOnce();
  });
  it("reflects edited translations and hides children of unpublished ancestors", async () => {
    const item = { id: "managed", key: "managed", parentId: null, level: 1, sortOrder: 0, status: "PUBLISHED", updatedAt: new Date(), translations: [{ locale: "zh", name: "后台自定义分类", slug: "managed", description: "后台维护的分类说明", seoTitle: "后台自定义分类", seoDescription: "后台维护的分类说明" }], _count: { products: 0 } };
    categoryQuery.mockResolvedValue([item, { ...item, id: "orphan", key: "orphan", parentId: "unpublished", level: 2 }]);
    const result = await getCategories("zh");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "后台自定义分类", path: "managed" });
  });
  it("resolves CMS redirects while demo content remains enabled", async () => {
    redirectQuery.mockResolvedValue({ toPath: "/products/category/new-path" });
    expect(await getSlugRedirect("zh", "/products/category/old-path")).toBe("/products/category/new-path");
  });
  it("localizes featured labels from definitions and values from display labels", async () => {
    const category = {
      id: "category-1",
      key: "rectifiers",
      parentId: null,
      level: 1,
      sortOrder: 0,
      status: "PUBLISHED",
      updatedAt: new Date("2026-09-09T00:00:00.000Z"),
      translations: [{ locale: "zh", name: "整流模块", slug: "rectifiers", description: "整流模块", seoTitle: null, seoDescription: null }],
      _count: { products: 1 },
    };
    const definition = (key: string, label: string, sortOrder: number) => ({
      key,
      labels: { zh: label, en: label, ru: label },
      sortOrder,
      comparable: true,
      archivedAt: null,
      standardUnit: null,
    });
    categoryQuery.mockResolvedValue([category]);
    productQuery.mockResolvedValue([{
      id: "product-1",
      model: "R48-3000E3",
      sku: null,
      status: "PUBLISHED",
      primaryImageId: "asset-six",
      contentUpdatedAt: new Date("2026-09-09T00:00:00.000Z"),
      brand: { name: "Vertiv" },
      category,
      media: [
        { assetId: "asset-front", sortOrder: 0, alt: { zh: "整流模块正面图", en: "Front view", ru: "Вид спереди" }, asset: { storageKey: "products/front.webp", width: 1200, height: 1200 } },
        { assetId: "asset-side", sortOrder: 1, alt: { zh: "整流模块侧面图", en: "Side view", ru: "Вид сбоку" }, asset: { storageKey: "products/side.webp", width: 1200, height: 1200 } },
        { assetId: "asset-rear", sortOrder: 2, alt: {}, asset: { storageKey: "products/rear.webp", width: 1200, height: 1200 } },
        { assetId: "asset-four", sortOrder: 3, alt: {}, asset: { storageKey: "products/four.webp", width: 1200, height: 1200 } },
        { assetId: "asset-five", sortOrder: 4, alt: {}, asset: { storageKey: "products/five.webp", width: 1200, height: 1200 } },
        { assetId: "asset-six", sortOrder: 5, alt: { zh: "后台新主图" }, asset: { storageKey: "products/six.webp", width: 1200, height: 1200 } },
      ],
      translations: [{
        locale: "zh",
        published: true,
        slug: "r48-3000e3",
        name: "R48-3000E3 整流模块",
        directDefinition: "产品定义",
        shortDescription: "产品摘要",
        whatItIs: "产品是什么",
        problemSolved: "解决的问题",
        suitableFor: "适用场景",
        advantages: [],
        applications: [],
        sourceNote: null,
        seoTitle: "产品标题",
        seoDescription: "产品说明",
        faqs: [],
      }],
      attributes: [
        { definition: definition("voltage", "额定电压", 0), textValue: "-48 VDC", numberValue: null, booleanValue: null, unit: null, featured: true, featureOrder: 1, displayLabels: { zh: "自定义输出电压" } },
        { definition: definition("power", "额定功率", 1), textValue: null, numberValue: { toString: () => "3000" }, booleanValue: null, unit: "W", featured: true, featureOrder: 0, displayLabels: { zh: "自定义输出功率" } },
        { definition: definition("efficiency", "效率", 2), textValue: "96.2%", numberValue: null, booleanValue: null, unit: null, featured: false, featureOrder: null, displayLabels: null },
      ],
    }]);

    const [product] = await getProducts("zh");
    expect(product.featuredAttributes?.map(({ key, label, value }) => ({ key, label, value }))).toEqual([
      { key: "power", label: "额定功率", value: "自定义输出功率" },
      { key: "voltage", label: "额定电压", value: "自定义输出电压" },
    ]);
    expect(product.images).toEqual([
      { src: "/media/products/six.webp", alt: "后台新主图", width: 1200, height: 1200 },
      { src: "/media/products/front.webp", alt: "整流模块正面图", width: 1200, height: 1200 },
      { src: "/media/products/side.webp", alt: "整流模块侧面图", width: 1200, height: 1200 },
      { src: "/media/products/rear.webp", alt: "R48-3000E3 整流模块", width: 1200, height: 1200 },
      { src: "/media/products/four.webp", alt: "R48-3000E3 整流模块", width: 1200, height: 1200 },
    ]);
    expect(product.image).toEqual(product.images?.[0]);
  });

  it("maps an eligible news cover asset to its public media URL and real dimensions", async () => {
    newsQuery.mockResolvedValue([{
      articleId: "news-1",
      slug: "power-guide",
      title: "通信电源选型指南",
      summary: "新闻摘要",
      body: { type: "doc", content: [] },
      seoTitle: "通信电源选型指南",
      seoDescription: "通信电源选型指南摘要",
      imageAlt: "通信电源设备安装现场",
      article: {
        updatedAt: new Date("2026-09-13T00:00:00.000Z"),
        publishedAt: new Date("2026-09-10T00:00:00.000Z"),
        authorName: "HEFENGQI Technical Team",
        category: "BUYING_GUIDE",
        coverImage: {
          kind: "IMAGE",
          scanStatus: "CLEAN",
          rightsApproved: true,
          storageKey: "news/power-guide.webp",
          width: 1800,
          height: 1013,
        },
      },
    }]);

    const [item] = await getEditorial("zh", "news");
    expect(item.coverImage).toEqual({
      src: "/media/news/power-guide.webp",
      alt: "通信电源设备安装现场",
      width: 1800,
      height: 1013,
    });
    expect(item.newsCategory).toBe("BUYING_GUIDE");
    expect(item).toMatchObject({
      updatedAt: "2026-09-13T00:00:00.000Z",
      publishedAt: "2026-09-10T00:00:00.000Z",
      authorName: "HEFENGQI Technical Team",
    });
  });

  it("only links published translations and does not invent a missing publication date", async () => {
    newsQuery.mockImplementation(async ({ where }: { where: { locale: string } }) => (where.locale === "zh" || where.locale === "en") ? [{
      articleId: "partial-news",
      slug: `${where.locale}-guide`,
      title: "Guide",
      summary: "Summary",
      body: { type: "doc", content: [] },
      article: { publishedAt: null, updatedAt: new Date("2026-09-13T00:00:00.000Z"), category: "TUTORIAL_GUIDE", authorName: "Editorial team", coverImage: null },
    }] : []);
    expect(await getEditorialAlternatePaths("news", "partial-news")).toEqual({ zh: "/news/zh-guide", en: "/news/en-guide" });
    const [item] = await getEditorial("zh", "news");
    expect(item.publishedAt).toBeUndefined();
    expect(newsQuery).toHaveBeenCalledWith(expect.objectContaining({ where: { locale: "ru", published: true, article: { status: "PUBLISHED" } } }));
  });
});
