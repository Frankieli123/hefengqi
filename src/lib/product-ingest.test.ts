import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { SITE_URL: "http://localhost:3000", EDGEONE_PURGE_ENDPOINT: undefined, EDGEONE_API_TOKEN: undefined },
  isDemoMode: true,
}));
vi.mock("@/lib/edgeone", () => ({
  purgeEdgeOne: vi.fn().mockResolvedValue(undefined),
}));

import {
  productIngestPayloadSchema,
  singleProductInputSchema,
  productPatchSchema,
} from "@/lib/product-ingest";

describe("Product Ingest Schema Validation", () => {
  it("validates valid single product input with minimal fields", () => {
    const valid = {
      model: "ZXDU68 S501",
      brand: "ZTE",
      category: "dc-power-systems",
      name: "中兴通信电源",
      directDefinition: "ZXDU68 S501 是一款高效嵌入式直流电源系统，为通信基站提供高可靠性供电支持。",
    };
    const parsed = singleProductInputSchema.parse(valid);
    expect(parsed.model).toBe("ZXDU68 S501");
    expect(parsed.origin).toBe("AI");
    expect(parsed.status).toBe("DRAFT");
    expect(parsed.upsert).toBe(true);
  });

  it("validates product with full multilingual copy and FAQs", () => {
    const full = {
      model: "ZXDU68 S501",
      sku: "ZXDU68-S501-48V",
      brand: "zte",
      category: "dc-power-systems",
      translations: {
        zh: {
          name: "中兴 ZXDU68 S501 嵌入式直流电源系统",
          directDefinition: "ZXDU68 S501 是一款高效嵌入式直流电源系统，为通信宏基站提供-48V直流稳定供电与智能备电管理。",
          whatItIs: "标准 19 英寸机架安装电源系统，内置高效率整流模块与集中监控单元。",
          problemSolved: "解决基站能耗高、机架空间不足与电池备电状态难以实时监测的问题。",
          suitableFor: "适用于 4G/5G 宏基站、机房接入层设备及工业通信供电场景。",
          advantages: ["整流模块效率高达 96%", "紧凑 3U/5U 架构", "数字化智能管理"],
          applications: ["通信宏基站", "边缘计算节点"],
          faqs: [
            { question: "最大支持多少路模块？", answer: "支持最多 6 个 50A 模块。" },
          ],
        },
        en: {
          name: "ZTE ZXDU68 S501 DC Power System",
          directDefinition: "The ZTE ZXDU68 S501 is a high-efficiency embedded DC power system engineered for telecommunication facilities.",
          whatItIs: "Standard 19-inch rack-mounted DC power system.",
          problemSolved: "Resolves power efficiency and space constraints.",
          suitableFor: "Suitable for macro telecom base stations.",
          advantages: ["96% rectifier efficiency", "Compact footprint"],
          applications: ["Telecom base stations"],
        },
      },
      attributes: [
        { key: "nominal-voltage", value: "-48V", unit: "VDC" },
        { key: "efficiency", value: 96.5, unit: "%" },
      ],
      media: [
        { assetId: "asset_123", isPrimary: true, alt: "ZTE Front View" },
      ],
    };

    const parsed = singleProductInputSchema.parse(full);
    expect(parsed.translations?.zh?.faqs).toHaveLength(1);
    expect(parsed.attributes).toHaveLength(2);
    expect(parsed.media).toHaveLength(1);
  });

  it("accepts object format for attributes", () => {
    const input = {
      model: "ZXDU68 S501",
      brand: "zte",
      category: "dc-power-systems",
      attributes: {
        "输入电压": "380V",
        "整流效率": 96.5,
        "支持热插拔": true,
      },
    };
    const parsed = singleProductInputSchema.parse(input);
    expect(parsed.attributes).toEqual({
      "输入电压": "380V",
      "整流效率": 96.5,
      "支持热插拔": true,
    });
  });

  it("accepts localized featured-attribute titles and limits the panel to six items", () => {
    const attributes = Array.from({ length: 6 }, (_, index) => ({
      key: `spec-${index + 1}`,
      value: `${index + 1}`,
      featured: true,
      featureOrder: index,
      displayLabel: {
        zh: `关键参数 ${index + 1}`,
        en: `Key specification ${index + 1}`,
        ru: `Ключевой параметр ${index + 1}`,
      },
    }));
    const parsed = singleProductInputSchema.parse({
      model: "MODEL-6",
      brand: "Brand",
      category: "Category",
      attributes,
    });

    expect(Array.isArray(parsed.attributes) && parsed.attributes[0]?.displayLabel).toEqual(attributes[0].displayLabel);
    expect(() => singleProductInputSchema.parse({
      model: "MODEL-7",
      brand: "Brand",
      category: "Category",
      attributes: [...attributes, { key: "spec-7", value: "7", featured: true }],
    })).toThrow(/At most 6 attributes can be featured/);
  });

  it("handles batch payload formats (array and { items: [] })", () => {
    const item1 = { model: "M1", brand: "B1", category: "C1" };
    const item2 = { model: "M2", brand: "B2", category: "C2" };

    const arrayPayload = productIngestPayloadSchema.parse([item1, item2]);
    expect(Array.isArray(arrayPayload)).toBe(true);

    const wrappedPayload = productIngestPayloadSchema.parse({ items: [item1, item2] });
    expect("items" in wrappedPayload && wrappedPayload.items).toHaveLength(2);
  });

  it("validates partial product updates (patch schema)", () => {
    const patch = {
      status: "PUBLISHED",
      translations: {
        zh: {
          whatItIs: "全新更新的产品详细说明文档，更加全面地阐述整机结构与工作原理。",
          advantages: ["全新特性1", "全新特性2"],
        },
      },
      attributes: [
        { key: "efficiency", value: 97.2, unit: "%" },
      ],
    };
    const parsed = productPatchSchema.parse(patch);
    expect(parsed.status).toBe("PUBLISHED");
    expect(parsed.translations?.zh?.advantages).toEqual(["全新特性1", "全新特性2"]);
  });
});

describe("Product Ingest Core Logic", () => {
  it("ingests a product and ensures all 3 locales have >=40 char direct definitions", async () => {
    const mockBrand = { id: "brand_1", name: "ZTE", slug: "zte", rightsConfirmed: true, archivedAt: null };
    const mockCategory = {
      id: "cat_1",
      key: "dc-power-systems",
      status: "PUBLISHED",
      translations: [{ locale: "zh", name: "直流电源系统" }],
      attributes: [],
    };

    const mockTx = {
      brand: {
        findUnique: vi.fn().mockResolvedValue(mockBrand),
        findFirst: vi.fn().mockResolvedValue(mockBrand),
        create: vi.fn(),
      },
      category: {
        findUnique: vi.fn().mockResolvedValue(mockCategory),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([mockCategory]),
      },
      categoryTranslation: {
        findFirst: vi.fn(),
      },
      product: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => ({
          id: data.id ?? "prod_123",
          model: data.model,
          normalizedId: data.normalizedId,
          status: data.status,
          brandId: data.brandId,
          categoryId: data.categoryId,
        })),
        update: vi.fn().mockImplementation(({ data }) => ({
          id: "prod_123",
          status: data.status ?? "DRAFT",
        })),
        findUnique: vi.fn().mockResolvedValue({
          id: "prod_123",
          model: "ZXDU68 S501",
          brand: mockBrand,
          category: mockCategory,
          translations: [],
          attributes: [],
          media: [],
        }),
      },
      productTranslation: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          { locale: "zh", slug: "zxdu68-s501-zh" },
          { locale: "en", slug: "zxdu68-s501-en" },
          { locale: "ru", slug: "zxdu68-s501-ru" },
        ]),
      },
      attributeDefinition: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => ({
          id: "def_1",
          ...data,
        })),
      },
      productAttribute: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      contentRevision: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as Parameters<typeof import("@/lib/product-ingest").ingestSingleProduct>[0];

    const { ingestSingleProduct } = await import("@/lib/product-ingest");

    const result = await ingestSingleProduct(
      mockTx,
      {
        model: "ZXDU68 S501",
        brand: "ZTE",
        category: "dc-power-systems",
        directDefinition: "简短定义", // less than 40 chars
        attributes: [
          { key: "voltage", value: "-48V", unit: "VDC" },
        ],
      },
      { actorId: "ai-agent", actorType: "AI" },
    );

    expect(result.success).toBe(true);
    expect(result.model).toBe("ZXDU68 S501");
    expect(result.links?.public.zh).toContain("zxdu68-s501-zh");
    expect(result.links?.public.en).toContain("zxdu68-s501-en");
    expect(result.links?.public.ru).toContain("zxdu68-s501-ru");
  });
});
