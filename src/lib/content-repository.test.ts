import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, productQuery, redirectQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), productQuery: vi.fn(), redirectQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: true }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, product: { findMany: productQuery }, slugRedirect: { findUnique: redirectQuery } } }));
import { getCategories, getProducts, getSlugRedirect } from "@/lib/content-repository";

describe("CMS categories in demo mode", () => {
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
  it("uses per-product localized titles and ordering for the featured specification panel", async () => {
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
      primaryImageId: null,
      contentUpdatedAt: new Date("2026-09-09T00:00:00.000Z"),
      brand: { name: "Vertiv" },
      category,
      media: [],
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
    expect(product.featuredAttributes?.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "power", label: "自定义输出功率" },
      { key: "voltage", label: "自定义输出电压" },
    ]);
  });
});
