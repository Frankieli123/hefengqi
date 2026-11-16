import { describe, expect, it } from "vitest";
import { scoreNewsProduct, selectNewsRelatedProducts } from "@/lib/news-related-products";
import type { EditorialItem, ProductView } from "@/types/domain";

const article: EditorialItem = {
  id: "news-1",
  slug: "ups-for-ai",
  title: "Huawei UPS 为 AI 数据中心提供后备电源",
  summary: "高密度机房需要稳定的不间断供电与精密配电。",
  body: ["本文讨论 UPS 电源、数据中心与通信基础设施。"],
  updatedAt: "2026-09-12",
};

function product(id: string, overrides: Partial<ProductView> = {}): ProductView {
  return {
    id,
    slug: id,
    model: id.toUpperCase(),
    brand: "Santak",
    categoryKey: "cooling",
    categoryName: "精密空调",
    name: `${id} 产品`,
    directDefinition: "机房基础设施产品",
    shortDescription: "用于数据中心基础设施",
    whatItIs: "产品说明",
    problemSolved: "解决基础设施问题",
    suitableFor: "数据中心",
    advantages: [],
    applications: [],
    attributes: [],
    faqs: [],
    updatedAt: "2026-09-12",
    ...overrides,
  };
}

describe("news related product selection", () => {
  it("keeps manually selected products first and fills the remaining positions", () => {
    const products = [
      product("automatic-ups", { brand: "Huawei", categoryName: "UPS 电源", model: "UPS5000" }),
      product("manual"),
      product("other-1"),
      product("other-2"),
      product("other-3"),
    ];
    const result = selectNewsRelatedProducts({ ...article, relatedProductSlots: [{ productId: "manual", sortOrder: 0 }] }, products);

    expect(result).toHaveLength(4);
    expect(result[0].id).toBe("manual");
    expect(result[1].id).toBe("automatic-ups");
  });

  it("scores matching models, brands, and categories above unrelated products", () => {
    const matching = product("matching", { brand: "Huawei", categoryName: "UPS 电源", model: "UPS5000" });
    const unrelated = product("unrelated", { brand: "Vertiv", categoryName: "机柜空调", model: "CRV4" });

    expect(scoreNewsProduct(article, matching)).toBeGreaterThan(scoreNewsProduct(article, unrelated));
  });

  it("never returns more than four products and ignores unavailable manual ids", () => {
    const products = Array.from({ length: 7 }, (_, index) => product(`product-${index}`));
    const result = selectNewsRelatedProducts({ ...article, relatedProductSlots: [{ productId: "missing", sortOrder: 0 }, { productId: "product-5", sortOrder: 1 }] }, products, 10);

    expect(result).toHaveLength(4);
    expect(result[1].id).toBe("product-5");
  });
});
