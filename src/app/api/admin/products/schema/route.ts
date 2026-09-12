import { NextResponse } from "next/server";
import { authenticateApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { locales } from "@/types/domain";

export async function GET(request: Request) {
  const auth = await authenticateApi(request);
  if (!auth.ok) {
    return NextResponse.json({ code: auth.code, message: auth.message }, { status: auth.status });
  }

  const [brands, categories] = await Promise.all([
    db.brand.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, slug: true, website: true, rightsConfirmed: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        translations: { select: { locale: true, name: true, slug: true, description: true } },
        attributes: {
          where: { archivedAt: null },
          select: { id: true, key: true, labels: true, type: true, standardUnit: true, required: true, options: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const samplePayload = {
    model: "ZXDU68 S501",
    sku: "ZXDU68-S501-48V",
    brand: "zte",
    category: "zte",
    status: "DRAFT",
    origin: "AI",
    upsert: true,
    translations: {
      zh: {
        name: "中兴 ZXDU68 S501 嵌入式直流电源系统",
        directDefinition: "ZXDU68 S501 是一款高效嵌入式通信直流电源系统，为通信宏基站与核心机房提供可靠的-48V直流稳定供电与智能备电管理。",
        shortDescription: "高效嵌入式直流电源系统，支持 50A 整流模块并联，具备蓄电池智能管理与远程监控功能。",
        whatItIs: "ZXDU68 S501 是标准 19 英寸机架安装电源系统，内置高效率整流模块与智能监控单元，适用于各型通信站点。",
        problemSolved: "解决基站供电效率低、机架空间紧张与电池备电状态难监控的问题。",
        suitableFor: "适用于 4G/5G 宏基站、机房接入层设备及工业通信不间断直流供电场景。",
        advantages: [
          "整流模块效率高达 96% 以上，降低能耗",
          "标准 19 英寸 3U/5U 紧凑架构，节省机房空间",
          "全数字化控制与智能电池温度补偿管理",
        ],
        applications: [
          "4G/5G 宏基站与室内分布系统",
          "边缘计算汇聚节点机房",
          "电力与轨道交通专用通信网络",
        ],
        seoTitle: "中兴 ZXDU68 S501 直流电源系统 - 规格参数与技术方案",
        seoDescription: "合丰旗提供中兴 ZXDU68 S501 嵌入式通信直流电源系统参数、说明与技术方案咨询。",
        sourceNote: "AI 整理自中兴通讯技术规格白皮书",
        faqs: [
          {
            question: "系统最大输出电流是多少？",
            answer: "标准配置支持多路 50A 模块并联，系统输出电流最高可达 300A。",
          },
        ],
      },
      en: {
        name: "ZTE ZXDU68 S501 Embedded DC Power System",
        directDefinition: "The ZTE ZXDU68 S501 is a high-efficiency embedded DC power system designed for telecommunication base stations, delivering reliable -48V power with intelligent battery management.",
        shortDescription: "High-efficiency embedded DC power system supporting 50A rectifier modules with battery management and remote monitoring.",
        whatItIs: "Standard 19-inch rack-mounted DC power system equipped with high-efficiency rectifiers and centralized monitoring.",
        problemSolved: "Resolves power efficiency, rack footprint, and complex battery lifecycle management issues in telecom environments.",
        suitableFor: "Ideal for mobile communication macro stations, enterprise networks, and industrial DC power applications.",
        advantages: [
          "Peak rectifier efficiency exceeds 96%",
          "Compact standard 19-inch footprint",
          "Intelligent battery temperature compensation and monitoring",
        ],
        applications: [
          "4G/5G telecom macro base stations",
          "Edge computing and aggregation facilities",
          "Railway transport and industrial communication hubs",
        ],
        seoTitle: "ZTE ZXDU68 S501 DC Power System Specs & Overview",
        seoDescription: "Technical specifications, overview, and solution support for ZTE ZXDU68 S501 embedded DC power supply system.",
        sourceNote: "Extracted by AI from manufacturer technical datasheets.",
      },
    },
    attributes: [
      { key: "nominal-voltage", label: "额定电压", value: "-48V", unit: "VDC", featured: true, featureOrder: 0, displayLabel: { zh: "额定输出电压", en: "Rated output voltage", ru: "Номинальное выходное напряжение" } },
      { key: "output-current", label: "输出电流", value: "300", unit: "A", featured: true, featureOrder: 1, displayLabel: { zh: "最大输出电流", en: "Maximum output current", ru: "Максимальный выходной ток" } },
      { key: "efficiency", label: "整流效率", value: "96.5", unit: "%" },
    ],
    media: [
      {
        assetId: "media_asset_cuid_here",
        isPrimary: true,
        alt: { zh: "ZXDU68 S501 整机正面图", en: "ZTE ZXDU68 S501 Front View", ru: "ZTE ZXDU68 S501 Вид спереди" },
      },
    ],
  };

  return NextResponse.json({
    documentation: "AI / API Product Ingest Schema for HEFENGQI Industrial Power & Telecom Platform",
    endpoints: {
      uploadProduct: { method: "POST", path: "/api/admin/products", description: "Upload a single product or batch of products" },
      listProducts: { method: "GET", path: "/api/admin/products", description: "List products with search and filtering" },
      getProduct: { method: "GET", path: "/api/admin/products/:id", description: "Get full product details including gate validation" },
      updateProduct: { method: "PATCH", path: "/api/admin/products/:id", description: "Partially update product copy, attributes, or media" },
      uploadMedia: { method: "POST", path: "/api/admin/media", description: "Upload image or manual/document (PDF) via multipart/form-data; product images require no rights approval or malware-scan gate" },
      getSchema: { method: "GET", path: "/api/admin/products/schema", description: "Get current taxonomy, categories, and attributes" },
    },
    authHeaderExample: "Authorization: Bearer <AI_API_KEY> 或 x-api-key: <AI_API_KEY>",
    enums: {
      locales,
      statuses: ["DRAFT", "NEEDS_REVIEW", "READY", "PUBLISHED", "ARCHIVED"],
      origins: ["AI", "MANUAL", "LOCAL_IMPORT", "WEB_SOURCE"],
    },
    featuredAttributes: {
      description: "Set featured=true on up to six attributes to show them in the dark key-specification panel. displayLabel overrides the panel title per locale; featureOrder accepts 0-5.",
      fields: { featured: "boolean", featureOrder: "integer 0-5", displayLabel: "string or { zh?, en?, ru? }" },
    },
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      website: b.website,
      rightsConfirmed: b.rightsConfirmed,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      key: c.key,
      level: c.level,
      parentId: c.parentId,
      name: {
        zh: c.translations.find((t) => t.locale === "zh")?.name ?? c.key,
        en: c.translations.find((t) => t.locale === "en")?.name ?? c.key,
        ru: c.translations.find((t) => t.locale === "ru")?.name ?? c.key,
      },
      attributes: c.attributes.map((a) => ({
        id: a.id,
        key: a.key,
        label: (a.labels as Record<string, string>)?.zh ?? a.key,
        type: a.type,
        standardUnit: a.standardUnit,
        required: a.required,
        options: a.options,
      })),
    })),
    samplePayload,
  });
}

export const dynamic = "force-dynamic";
