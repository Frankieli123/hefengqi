import { describe, expect, it } from "vitest";
import { categoryFeaturedProductInputSchema, categoryInputSchema, categoryPath, parseCategoryFeaturedProductForm, planCategoryMove, sortCategoryTree, topLevelCategories, topLevelCategory, type CategoryNode } from "@/lib/category-tree";
import { locales } from "@/types/domain";

const nodes: CategoryNode[] = [
  { id: "a", parentId: null, level: 1, sortOrder: 5, status: "PUBLISHED" },
  { id: "b", parentId: null, level: 1, sortOrder: 0, status: "PUBLISHED" },
  { id: "child", parentId: "a", level: 2, sortOrder: 0, status: "PUBLISHED" },
  { id: "leaf", parentId: "child", level: 3, sortOrder: 0, status: "PUBLISHED" },
];

describe("managed product category hierarchy", () => {
  it("sorts siblings while keeping each subtree together", () => {
    expect(sortCategoryTree(nodes).map((node) => node.id)).toEqual(["b", "a", "child", "leaf"]);
  });
  it("updates descendant levels when moving a branch to the root", () => {
    expect([...planCategoryMove(nodes, "child", null)]).toEqual([["child", 1], ["leaf", 2]]);
  });
  it("rejects self/descendant cycles and moves that push descendants past level three", () => {
    expect(() => planCategoryMove(nodes, "a", "a")).toThrow(/自身/);
    expect(() => planCategoryMove(nodes, "a", "leaf")).toThrow(/自身/);
    expect(() => planCategoryMove(nodes, "a", "b")).toThrow(/三级/);
  });
  it("rejects missing and archived parents", () => {
    expect(() => planCategoryMove(nodes, "new", "missing")).toThrow(/不存在/);
    expect(() => planCategoryMove(nodes.map((node) => ({ ...node, status: "ARCHIVED" })), "new", "a")).toThrow(/归档/);
  });
  it("builds translated descendant URLs and rejects orphan/cyclic trees", () => {
    const translated = nodes.map((node) => ({ ...node, translations: locales.map((locale) => ({ locale, slug: `${node.id}-${locale}` })) }));
    expect(categoryPath(translated, "leaf", "ru")).toBe("a-ru/child-ru/leaf-ru");
    expect(categoryPath(translated.filter((node) => node.id !== "a"), "leaf", "ru")).toBeNull();
    expect(categoryPath(translated.map((node) => node.id === "a" ? { ...node, parentId: "leaf" } : node), "leaf", "ru")).toBeNull();
  });
  it("resolves a selected child to its top-level category", () => {
    const views = [
      { key: "power", level: 1 },
      { key: "ups", parentKey: "power", level: 2 },
      { key: "modular-ups", parentKey: "ups", level: 3 },
    ];
    expect(topLevelCategory(views, "modular-ups")?.key).toBe("power");
    expect(topLevelCategories(views).map((category) => category.key)).toEqual(["power"]);
    expect(topLevelCategory(views, "missing")).toBeUndefined();
    expect(topLevelCategory(views.map((item) => item.key === "power" ? { ...item, parentKey: "modular-ups" } : item), "modular-ups")).toBeUndefined();
  });
});

describe("category input", () => {
  const input = { key: "power", parentId: null, sortOrder: 0, translations: locales.map((locale) => ({ locale, name: "Power", slug: "power", description: "Power system category", seoTitle: "Power", seoDescription: "Power system category" })) };
  it("requires all three distinct languages", () => {
    expect(categoryInputSchema.safeParse(input).success).toBe(true);
    expect(categoryInputSchema.safeParse({ ...input, translations: [input.translations[0], input.translations[0], input.translations[1]] }).success).toBe(false);
  });
  it("rejects unsafe slugs, blank translations and invalid sort order", () => {
    expect(categoryInputSchema.safeParse({ ...input, key: "../power" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...input, sortOrder: -1 }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...input, translations: input.translations.map((item) => ({ ...item, slug: "power?q=1" })) }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...input, translations: input.translations.map((item) => ({ ...item, name: " " })) }).success).toBe(false);
  });
  it("parses an optional home-page representative product", () => {
    const selected = new FormData();
    selected.set("categoryId", "category-1");
    selected.set("homeFeaturedProductId", "product-1");
    expect(parseCategoryFeaturedProductForm(selected)).toEqual({ categoryId: "category-1", productId: "product-1" });

    const cleared = new FormData();
    cleared.set("categoryId", "category-1");
    cleared.set("homeFeaturedProductId", "none");
    expect(parseCategoryFeaturedProductForm(cleared)).toEqual({ categoryId: "category-1", productId: null });
    expect(categoryFeaturedProductInputSchema.safeParse({ categoryId: "", productId: null }).success).toBe(false);
  });
});
