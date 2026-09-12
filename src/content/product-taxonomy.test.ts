import { describe, expect, it } from "vitest";
import { productTaxonomy, retiredDefaultCategoryKeys } from "@/content/product-taxonomy";

describe("productTaxonomy", () => {
  it("uses the requested three-level catalogue in display order", () => {
    expect(productTaxonomy).toHaveLength(61);
    expect(productTaxonomy.filter((item) => !item.parentKey).map((item) => item.translations.zh.name)).toEqual([
      "电源管理",
      "热管理",
      "光通信与光网络",
      "数据中心基础设施",
    ]);
    expect(productTaxonomy.filter((item) => item.level === 2).map((item) => item.translations.zh.name)).toEqual([
      "直流电源系统",
      "UPS 电源",
      "室内电源系统",
      "室外电源系统",
      "站点能源系统",
      "太阳能供电系统",
      "通信蓄电池",
      "精密空调",
      "机柜空调",
      "SFP 光模块",
      "一体化机柜",
      "PDU（电源分配单元）",
      "KVM 系统",
    ]);
    expect(productTaxonomy.filter((item) => item.parentKey === "battery").map((item) => item.translations.zh.name)).toEqual([
      "山特（SANTAK）",
      "科士达",
      "维谛",
      "伊顿",
      "华为",
      "台达",
    ]);
    expect(productTaxonomy.find((item) => item.key === "battery")?.parentKey).toBe("power");
  });

  it("has unique keys and slugs with valid parent levels", () => {
    const byKey = new Map(productTaxonomy.map((item) => [item.key, item]));
    expect(byKey.size).toBe(productTaxonomy.length);
    expect(new Set(productTaxonomy.map((item) => item.slug)).size).toBe(productTaxonomy.length);
    productTaxonomy.forEach((item) => {
      if (!item.parentKey) return expect(item.level).toBe(1);
      const parent = byKey.get(item.parentKey);
      expect(parent).toBeDefined();
      expect(item.level).toBe((parent?.level ?? 0) + 1);
    });
  });

  it("gives every product type a verified third-level choice", () => {
    const productTypes = productTaxonomy.filter((item) => item.level === 2);
    for (const type of productTypes) {
      expect(productTaxonomy.some((item) => item.parentKey === type.key && item.level === 3), type.key).toBe(true);
    }
    expect(retiredDefaultCategoryKeys.every((key) => !productTaxonomy.some((item) => item.key === key))).toBe(true);
  });
});
