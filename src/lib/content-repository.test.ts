import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, productQuery, productFindFirstQuery, productCountQuery, productMediaQuery, productTranslationQuery, redirectQuery, newsQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), productQuery: vi.fn(), productFindFirstQuery: vi.fn(), productCountQuery: vi.fn(), productMediaQuery: vi.fn(), productTranslationQuery: vi.fn(), redirectQuery: vi.fn(), newsQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: false }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, product: { findMany: productQuery, findFirst: productFindFirstQuery, count: productCountQuery }, productMedia: { findMany: productMediaQuery }, productTranslation: { findMany: productTranslationQuery }, slugRedirect: { findUnique: redirectQuery }, newsArticleTranslation: { findMany: newsQuery } } }));
import { getCategories, getCategoryAlternatePaths, getEditorial, getEditorialAlternatePaths, getProductAlternatePaths, getProductBySlug, getProductCatalogPage, getProductRecommendations, getProductSearchResults, getProductSupportCatalog, getProducts, getSlugRedirect } from "@/lib/content-repository";

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
  it("returns only one lightweight catalogue page without loading detail relations", async () => {
    const records = Array.from({ length: 13 }, (_, index) => ({
      id: `product-${index + 1}`,
      model: `MODEL-${String(index + 1).padStart(2, "0")}`,
      sku: null,
      primaryImageId: index === 0 ? "primary-image" : null,
      brand: { name: "Vertiv", localizedNames: { zh: "维谛" } },
      category: { key: "rectifiers", translations: [{ name: "整流模块" }] },
      translations: [{ slug: `model-${index + 1}`, name: `产品 ${index + 1}`, shortDescription: "产品摘要", directDefinition: "产品定义" }],
    }));
    productQuery.mockImplementation(async ({ skip = 0, take }: { skip?: number; take?: number }) => records.slice(skip, take ? skip + take : undefined));
    productCountQuery.mockResolvedValue(13);
    productMediaQuery.mockResolvedValue([
      { productId: "product-1", assetId: "fallback-image", sortOrder: 0, alt: {}, asset: { storageKey: "fallback.webp", width: 800, height: 800 } },
      { productId: "product-1", assetId: "primary-image", sortOrder: 1, alt: { zh: "后台主图" }, asset: { storageKey: "primary.webp", width: 1200, height: 1200 } },
    ]);

    const result = await getProductCatalogPage("zh", { page: 1 });

    expect(result).toMatchObject({ currentPage: 1, pageCount: 2, totalCount: 13 });
    expect(result.products).toHaveLength(12);
    expect(result.products[0]).toMatchObject({ name: "产品 1", brandDisplayName: "维谛", image: { src: "/media/primary.webp", alt: "后台主图" } });
    const query = productQuery.mock.calls[0][0];
    expect(query).not.toHaveProperty("include");
    expect(query.select).not.toHaveProperty("attributes");
    expect(query.select).not.toHaveProperty("alarms");
    expect(query.select.translations.select).not.toHaveProperty("faqs");
    expect(productMediaQuery).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ productId: { in: expect.arrayContaining(["product-1", "product-12"]) } }) }));
  });
  it("uses lightweight projections for support and site search", async () => {
    categoryQuery.mockResolvedValue([{
      id: "category-1", key: "rectifiers", parentId: null, level: 1, sortOrder: 0, status: "PUBLISHED", updatedAt: new Date(),
      translations: [{ locale: "en", name: "Rectifiers", slug: "rectifiers", description: "Rectifiers", seoTitle: null, seoDescription: null }], _count: { products: 1 },
    }]);
    productQuery.mockResolvedValue([{
      id: "product-1", model: "R4850G2", sku: null, primaryImageId: null,
      brand: { name: "Huawei", localizedNames: {} }, category: { key: "rectifiers", translations: [{ name: "Rectifiers" }] },
      translations: [{ slug: "r4850g2", name: "R4850G2 Rectifier", shortDescription: "Telecom power", directDefinition: "48 V rectifier" }],
      attributes: [{ textValue: "50 A", numberValue: null, booleanValue: null, unit: null, displayLabels: null, definition: { key: "current", labels: { en: "Current" }, standardUnit: null, comparable: true } }],
    }]);
    productMediaQuery.mockResolvedValue([]);

    const supportProducts = await getProductSupportCatalog("en");
    const searchProducts = await getProductSearchResults("en", "50 A");

    expect(supportProducts[0]).toMatchObject({ model: "R4850G2", directDefinition: "48 V rectifier" });
    expect(searchProducts[0]).toMatchObject({ model: "R4850G2", attributes: [{ key: "current", value: "50 A" }] });
    for (const [query] of productQuery.mock.calls) {
      expect(query).not.toHaveProperty("include");
      expect(query.select).not.toHaveProperty("alarms");
      expect(query.select.translations.select).not.toHaveProperty("faqs");
    }
  });
  it("pages catalogue search in the database instead of loading every match", async () => {
    categoryQuery.mockResolvedValue([
      { id: "category-1", key: "rectifiers", parentId: null, level: 1, sortOrder: 0, status: "PUBLISHED", updatedAt: new Date(), translations: [{ locale: "en", name: "Rectifiers", slug: "rectifiers", description: "Rectifiers", seoTitle: null, seoDescription: null }], _count: { products: 15 } },
    ]);
    const records = Array.from({ length: 2 }, (_, index) => ({
      id: `product-${index + 13}`, model: `R4850G2-${index + 13}`, sku: null, primaryImageId: null,
      brand: { name: "Huawei", localizedNames: {} }, category: { key: "rectifiers", translations: [{ name: "Rectifiers" }] },
      translations: [{ slug: `r4850g2-${index + 13}`, name: `R4850G2 ${index + 13}`, shortDescription: "Telecom power", directDefinition: "48 V rectifier" }],
    }));
    productCountQuery.mockResolvedValue(15);
    productQuery.mockResolvedValue(records);
    productMediaQuery.mockResolvedValue([]);
    const result = await getProductCatalogPage("en", { query: "R4850G2", page: 2 });
    expect(result).toMatchObject({ currentPage: 2, pageCount: 2, totalCount: 15 });
    expect(result.products).toHaveLength(2);
    expect(productCountQuery).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.any(Array) }) }));
    expect(productQuery.mock.calls.at(-1)?.[0]).toMatchObject({ skip: 12, take: 12 });
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
      alarms: [],
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

  it("fetches a product detail directly by locale and slug", async () => {
    const category = {
      id: "detail-category",
      key: "detail-rectifiers",
      parentId: null,
      level: 1,
      sortOrder: 0,
      status: "PUBLISHED",
      updatedAt: new Date("2026-09-15T00:00:00.000Z"),
      translations: [{ locale: "en", name: "Rectifiers", slug: "rectifiers", description: "Rectifiers", seoTitle: null, seoDescription: null }],
      _count: { products: 1 },
    };
    categoryQuery.mockResolvedValue([category]);
    productFindFirstQuery.mockResolvedValue({
      id: "detail-product",
      model: "R4850G2",
      sku: null,
      brandId: "brand-huawei",
      primaryImageId: null,
      contentUpdatedAt: new Date("2026-09-15T00:00:00.000Z"),
      brand: { name: "Huawei", localizedNames: { en: "Huawei" } },
      category,
      translations: [{
        locale: "en",
        published: true,
        slug: "huawei-r4850g2",
        name: "Huawei R4850G2 Rectifier",
        directDefinition: "A telecom rectifier.",
        shortDescription: "Compact rectifier.",
        whatItIs: "A rectifier module.",
        problemSolved: "Converts AC to DC.",
        suitableFor: "Telecom power systems.",
        advantages: [],
        applications: [],
        sourceNote: null,
        seoTitle: "Huawei R4850G2",
        seoDescription: "Huawei R4850G2 rectifier",
        faqs: [],
      }],
      attributes: [],
      alarms: [],
      media: [],
    });

    const product = await getProductBySlug("en", "huawei-r4850g2");

    expect(product).toMatchObject({ id: "detail-product", slug: "huawei-r4850g2", brandId: "brand-huawei" });
    expect(productQuery).not.toHaveBeenCalled();
    expect(productFindFirstQuery).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "PUBLISHED",
        translations: { some: { locale: "en", published: true, slug: "huawei-r4850g2" } },
      }),
    }));
  });

  it("loads all published product alternate paths with one translation query", async () => {
    productTranslationQuery.mockResolvedValue([
      { locale: "zh", slug: "r4850g2-zh" },
      { locale: "en", slug: "r4850g2-en" },
      { locale: "fr", slug: "r4850g2-fr" },
    ]);

    await expect(getProductAlternatePaths("alternate-product")).resolves.toEqual({
      zh: "/products/r4850g2-zh",
      en: "/products/r4850g2-en",
      fr: "/products/r4850g2-fr",
    });
    expect(productTranslationQuery).toHaveBeenCalledOnce();
    expect(productTranslationQuery).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productId: "alternate-product", published: true }),
      select: { locale: true, slug: true },
    }));
    expect(productQuery).not.toHaveBeenCalled();
  });

  it("builds all category alternate paths from one lightweight category query", async () => {
    categoryQuery.mockResolvedValue([
      { id: "root", parentId: null, level: 1, sortOrder: 0, status: "PUBLISHED", translations: [{ locale: "zh", slug: "power" }, { locale: "en", slug: "power-systems" }] },
      { id: "child", parentId: "root", level: 2, sortOrder: 0, status: "PUBLISHED", translations: [{ locale: "zh", slug: "rectifiers" }, { locale: "en", slug: "rectifier-modules" }] },
    ]);

    await expect(getCategoryAlternatePaths("child")).resolves.toEqual({
      zh: "/products/category/power/rectifiers",
      en: "/products/category/power-systems/rectifier-modules",
    });
    expect(categoryQuery).toHaveBeenCalledOnce();
    expect(categoryQuery).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "PUBLISHED" },
      select: expect.not.objectContaining({ _count: expect.anything() }),
    }));
  });

  it("returns at most four lightweight recommendations in the established priority order", async () => {
    const recommendation = (id: string, brand: string, categoryKey: string) => ({
      id,
      model: id.toUpperCase(),
      sku: null,
      primaryImageId: null,
      brand: { name: brand, localizedNames: { en: brand } },
      category: { key: categoryKey, translations: [{ name: categoryKey }] },
      translations: [{ slug: id, name: `Product ${id}`, shortDescription: `Summary ${id}` }],
    });
    productQuery
      .mockResolvedValueOnce([recommendation("same-brand-category", "Huawei", "rectifiers")])
      .mockResolvedValueOnce([recommendation("same-brand", "Huawei", "controllers")])
      .mockResolvedValueOnce([recommendation("same-category", "Vertiv", "rectifiers")])
      .mockResolvedValueOnce([recommendation("other", "Vertiv", "ups")]);
    productMediaQuery.mockResolvedValue([]);
    const source = {
      id: "source-product",
      slug: "source",
      model: "SOURCE",
      brand: "Huawei",
      brandId: "brand-huawei",
      categoryKey: "rectifiers",
      categoryName: "Rectifiers",
      name: "Source product",
      directDefinition: "Definition",
      shortDescription: "Summary",
      whatItIs: "Product",
      problemSolved: "Power",
      suitableFor: "Telecom",
      advantages: [],
      applications: [],
      attributes: [],
      faqs: [],
      updatedAt: "2026-09-15T00:00:00.000Z",
    };

    const result = await getProductRecommendations("en", source);

    expect(result.map((product) => product.id)).toEqual(["same-brand-category", "same-brand", "same-category", "other"]);
    expect(result).toHaveLength(4);
    expect(productQuery).toHaveBeenCalledTimes(4);
    for (const [query] of productQuery.mock.calls) {
      expect(query.take).toBeGreaterThan(0);
      expect(query.select).not.toHaveProperty("attributes");
      expect(query.select).not.toHaveProperty("alarms");
      expect(query.select.translations.select).not.toHaveProperty("faqs");
    }
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
    newsQuery.mockImplementation(async ({ where, select }: { where: { locale?: string; articleId?: string }; select?: { locale?: boolean; slug?: boolean } }) => {
      if (where.articleId && select?.locale && select.slug) return [{ locale: "zh", slug: "zh-guide" }, { locale: "en", slug: "en-guide" }];
      return (where.locale === "zh" || where.locale === "en") ? [{
      articleId: "partial-news",
      slug: `${where.locale}-guide`,
      title: "Guide",
      summary: "Summary",
      body: { type: "doc", content: [] },
      article: { publishedAt: null, updatedAt: new Date("2026-09-13T00:00:00.000Z"), category: "TUTORIAL_GUIDE", authorName: "Editorial team", coverImage: null },
    }] : [];
    });
    expect(await getEditorialAlternatePaths("news", "partial-news")).toEqual({ zh: "/news/zh-guide", en: "/news/en-guide" });
    const [item] = await getEditorial("zh", "news");
    expect(item.publishedAt).toBeUndefined();
    expect(newsQuery).toHaveBeenCalledTimes(2);
    expect(newsQuery).toHaveBeenCalledWith(expect.objectContaining({ where: { articleId: "partial-news", published: true, article: { status: "PUBLISHED" } }, select: { locale: true, slug: true } }));
  });
});
