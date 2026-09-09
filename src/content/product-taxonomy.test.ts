import { describe, expect, it } from "vitest";
import { productTaxonomy } from "@/content/product-taxonomy";

describe("productTaxonomy", () => {
  it("keeps the complete requested reference hierarchy in display order", () => {
    expect(productTaxonomy).toHaveLength(21);
    expect(productTaxonomy.filter((item) => !item.parentKey).map((item) => item.translations.zh.name)).toEqual([
      "电源管理",
      "热管理",
      "一体化解决方案",
      "监控和管理",
      "光通信",
    ]);
    expect(productTaxonomy.filter((item) => item.parentKey === "optical-communications").map((item) => item.translations.zh.name)).toEqual(["SFP 光模块"]);
    expect(productTaxonomy.filter((item) => item.parentKey === "dc-power-systems").map((item) => item.translations.zh.name)).toEqual([
      "中兴",
      "动力源",
      "CE+T",
      "易达",
      "台达",
      "维谛",
      "伊顿",
      "华为",
    ]);
  });

  it("has unique keys and valid parent levels", () => {
    const byKey = new Map(productTaxonomy.map((item) => [item.key, item]));
    expect(byKey.size).toBe(productTaxonomy.length);
    productTaxonomy.forEach((item) => {
      if (!item.parentKey) return expect(item.level).toBe(1);
      const parent = byKey.get(item.parentKey);
      expect(parent).toBeDefined();
      expect(item.level).toBe((parent?.level ?? 0) + 1);
    });
  });
});
