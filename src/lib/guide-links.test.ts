import { describe, it, expect, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { newsArticleTranslation: { findMany: query } } }));
vi.mock("@/lib/env", () => ({ isDemoMode: false }));
import * as guides from "@/lib/guide-links";
describe("published guide links", () => {
 it("queries actual product relations with a three-card bound and uses translated slugs", async () => {
  expect(guides).toHaveProperty("getProductGuides");
  query.mockResolvedValue([{ articleId: "article", slug: "actual-translated-slug", title: "Title", summary: "Summary" }]);
  expect(await guides.getProductGuides("ru", "product-id")).toEqual([{ id: "article", slug: "actual-translated-slug", title: "Title", summary: "Summary" }]);
  expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: { locale: "ru", published: true, article: { status: "PUBLISHED", relatedProducts: { some: { productId: "product-id" } } } }, take: 3 }));
 });
});

it("curates four explicit article keys without treating keys as URL slugs", async () => {
 expect(guides).toHaveProperty("getFeaturedGuides");
 query.mockResolvedValue([{ articleId: "a", slug: "localized-wire-slug", title: "T", summary: "S" }]);
 expect(await guides.getFeaturedGuides("fr")).toEqual([{ id: "a", slug: "localized-wire-slug", title: "T", summary: "S" }]);
 expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ where: { locale: "fr", published: true, article: { status: "PUBLISHED", key: { in: expect.arrayContaining(["huawei-r4850g2-pinout-standalone-wiring-guide-2026"]) } } }, take: 4 }));
});
