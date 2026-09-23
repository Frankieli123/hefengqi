import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, productQuery, mediaQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), productQuery: vi.fn(), mediaQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: false }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, product: { findMany: productQuery }, productMedia: { findMany: mediaQuery } } }));
import { getHomeProductGroups } from "@/lib/content-repository";

function category(key: string, parentId: string | null = null, level = 1) {
  return { id: key, key, parentId, level, sortOrder: 0, status: "PUBLISHED", updatedAt: new Date(), translations: [{ locale: "en", name: `CMS ${key}`, slug: key, description: "", seoTitle: null, seoDescription: null }], _count: { products: 0 } };
}

describe("homepage product shelves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productQuery.mockResolvedValue([]);
    mediaQuery.mockResolvedValue([]);
  });

  it("scopes a bounded lightweight query to visible descendants and uses current primary images", async () => {
    categoryQuery.mockResolvedValue([category("power"), category("dc", "power", 2), category("rectifiers", "dc", 3), category("hidden-child", "unpublished", 2)]);
    productQuery.mockResolvedValue([{
      id: "product", model: "R4850", sku: null, primaryImageId: "current",
      brand: { name: "Huawei", localizedNames: {} }, category: { key: "rectifiers", translations: [{ name: "Rectifiers" }] },
      translations: [{ slug: "r4850", name: "R4850 Rectifier", shortDescription: "Short description", directDefinition: "Long content must stay off homepage" }],
    }]);
    mediaQuery.mockResolvedValue([
      { productId: "product", assetId: "old", alt: {}, asset: { storageKey: "old.webp", width: 800, height: 800 } },
      { productId: "product", assetId: "current", alt: { en: "Current product image" }, asset: { storageKey: "current.webp", width: 800, height: 800 } },
    ]);
    const groups = await getHomeProductGroups("en");
    expect(groups[0]).toMatchObject({ name: "CMS power", href: "/products/category/power", products: [{ slug: "r4850", image: { src: "/media/current.webp" } }] });
    expect(groups[0].products[0]).not.toHaveProperty("directDefinition");
    expect(productQuery.mock.calls[0][0]).toMatchObject({
      skip: 0, take: 13, orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      where: { status: "PUBLISHED", categoryId: { in: ["power", "dc", "rectifiers"] }, brand: { archivedAt: null, rightsConfirmed: true }, translations: { some: { locale: "en", published: true } } },
    });
    expect(productQuery.mock.calls[0][0].select).not.toHaveProperty("attributes");
    expect(productQuery.mock.calls[0][0].select).not.toHaveProperty("alarms");
    expect(mediaQuery.mock.calls[0][0].where.asset).toEqual({ scanStatus: "CLEAN", rightsApproved: true });
    expect(groups[0].hasMore).toBe(false);
  });

  it("uses one sentinel product to expose more inventory without adding it to the initial shelf", async () => {
    categoryQuery.mockResolvedValue([category("power")]);
    productQuery.mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({
      id: `product-${index}`, model: `Model ${index}`, sku: null, primaryImageId: null,
      brand: { name: "Brand", localizedNames: {} }, category: { key: "power", translations: [{ name: "Power" }] },
      translations: [{ slug: `product-${index}`, name: `Product ${index}`, shortDescription: "", directDefinition: "" }],
    })));
    const groups = await getHomeProductGroups("en");
    expect(groups[0].products).toHaveLength(12);
    expect(groups[0].products.some((product) => product.id === "product-12")).toBe(false);
    expect(groups[0].hasMore).toBe(true);
  });

  it("keeps empty published groups in the requested order and uses CMS names", async () => {
    categoryQuery.mockResolvedValue([category("monitoring-management"), category("wireless-base-stations"), category("power")]);
    const groups = await getHomeProductGroups("en");
    expect(groups.map((group) => group.key)).toEqual(["power", "wireless-base-stations", "monitoring-management"]);
    expect(groups.every((group) => group.products.length === 0)).toBe(true);
    expect(mediaQuery).not.toHaveBeenCalled();
  });

  it("does not resurrect demo data or orphan categories when the CMS has no visible roots", async () => {
    categoryQuery.mockResolvedValue([category("dc", "unpublished", 2)]);
    expect(await getHomeProductGroups("en")).toEqual([]);
    expect(productQuery).not.toHaveBeenCalled();
    expect(mediaQuery).not.toHaveBeenCalled();
  });
});
