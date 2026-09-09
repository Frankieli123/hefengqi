import { beforeEach, describe, expect, it, vi } from "vitest";

const { categoryQuery, redirectQuery } = vi.hoisted(() => ({ categoryQuery: vi.fn(), redirectQuery: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { DATABASE_URL: "postgresql://configured-cms" }, isDemoMode: true }));
vi.mock("@/lib/db", () => ({ db: { category: { findMany: categoryQuery }, slugRedirect: { findUnique: redirectQuery } } }));
import { getCategories, getProducts, getSlugRedirect } from "@/lib/content-repository";

describe("CMS categories in demo mode", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses an intentionally empty CMS without resurrecting demo categories or products", async () => {
    categoryQuery.mockResolvedValue([]);
    expect(await getCategories("zh")).toEqual([]);
    expect(await getProducts("zh")).toEqual([]);
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
});
