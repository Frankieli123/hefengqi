import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, productQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), productQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: false }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, product: { findMany: productQuery } } }));

import { getHomeProductSeriesImages } from "@/lib/home-product-series";

const category = {
  id: "cabinet-air",
  key: "cabinet-air-conditioning",
  parentId: null,
  level: 1,
  sortOrder: 0,
  status: "PUBLISHED",
  homeFeaturedProductId: "featured-product",
};

function product(id: string, primaryImageId: string, storageKey: string) {
  return {
    id,
    categoryId: category.id,
    primaryImageId,
    status: "PUBLISHED",
    brand: { archivedAt: null, rightsConfirmed: true },
    translations: [{ name: "机柜空调" }],
    media: [
      { assetId: "old-image", alt: { zh: "旧图" }, asset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true, storageKey: "old.webp", width: 800, height: 800 } },
      { assetId: primaryImageId, alt: { zh: "后台当前主图" }, asset: { kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true, storageKey, width: 1200, height: 1200 } },
    ],
  };
}

describe("home product series images", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the selected product's current primary image instead of its first media item", async () => {
    categoryQuery.mockResolvedValueOnce([category]).mockResolvedValueOnce([category]);
    productQuery.mockResolvedValueOnce([product("featured-product", "current-primary", "current.webp")]);

    const images = await getHomeProductSeriesImages("zh");

    expect(images[category.key]).toEqual({ src: "/media/current.webp", alt: "后台当前主图", width: 1200, height: 1200 });
    expect(productQuery).toHaveBeenCalledOnce();
  });
});
