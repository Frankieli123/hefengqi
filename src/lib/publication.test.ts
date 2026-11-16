import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { validateProductForPublication } from "@/lib/publication";

function validProduct() {
  const definition = "这是一段完整的产品直接定义，用于满足发布内容长度校验并覆盖所有必填内容字段，同时确保三种语言测试数据均达到四十个字符以上。";
  return {
    brand: { archivedAt: null, rightsConfirmed: true },
    category: { status: "PUBLISHED", attributes: [] },
    translations: ["zh", "en", "ru"].map((locale) => ({
      locale,
      slug: `product-${locale}`,
      name: "Product",
      directDefinition: definition,
      shortDescription: "Description",
      whatItIs: "Product definition",
      problemSolved: "Problem solved",
      suitableFor: "Suitable scenarios",
      seoTitle: "Product title",
      seoDescription: "Product description",
    })),
    attributes: [],
    primaryImageId: "image-1",
    media: [{
      assetId: "image-1",
      asset: { kind: "IMAGE", scanStatus: "REJECTED", rightsApproved: false },
    }],
  };
}

describe("product publication media gate", () => {
  it("allows an attached primary image without scan or rights approval", async () => {
    const findUnique = vi.fn().mockResolvedValue(validProduct());
    const errors = await validateProductForPublication("product-1", { product: { findUnique } } as never);

    expect(errors).toEqual([]);
  });

  it("still requires the selected primary media to be an image attached to the product", async () => {
    const product = validProduct();
    product.primaryImageId = "missing-image";
    const findUnique = vi.fn().mockResolvedValue(product);
    const errors = await validateProductForPublication("product-1", { product: { findUnique } } as never);

    expect(errors).toContain("请先选择一张产品主图");
  });
});
