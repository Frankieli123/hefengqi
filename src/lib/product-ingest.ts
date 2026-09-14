import "server-only";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Prisma, type Product, type ContentOrigin, type PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatBrandName } from "@/lib/brand";
import { env } from "@/lib/env";
import { purgeEdgeOne } from "@/lib/edgeone";
import { validateProductForPublication } from "@/lib/publication";
import { locales, type Locale } from "@/types/domain";

const safeJsonSerialize = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
const allLocaleText = (value: string): Record<Locale, string> => Object.fromEntries(locales.map((locale) => [locale, value])) as Record<Locale, string>;
const coreLabelsWithEnglishFallback = (value: { zh: string; en: string; ru: string }): Record<Locale, string> => ({
  ...value,
  fr: value.en,
  de: value.en,
  es: value.en,
  ar: value.en,
});

const productAttributeItemSchema = z.object({
  key: z.string().trim().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  unit: z.string().trim().optional(),
  label: z.string().trim().optional(),
  featured: z.boolean().optional(),
  featureOrder: z.number().int().min(0).max(5).optional(),
  displayLabel: z.union([
    z.string().trim().max(80),
    z.partialRecord(z.enum(locales), z.string().trim().max(80)),
  ]).optional(),
});

const productAttributeListSchema = z.array(productAttributeItemSchema).superRefine((attributes, context) => {
  if (attributes.filter((attribute) => attribute.featured).length > 6) {
    context.addIssue({
      code: "custom",
      message: "At most 6 attributes can be featured",
    });
  }
});

export const singleTranslationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
  directDefinition: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  whatItIs: z.string().trim().optional(),
  problemSolved: z.string().trim().optional(),
  suitableFor: z.string().trim().optional(),
  advantages: z.union([z.array(z.string()), z.string()]).optional(),
  applications: z.union([z.array(z.string()), z.string()]).optional(),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  sourceNote: z.string().trim().max(500).optional(),
  faqs: z.array(z.object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })).optional(),
});

export const singleProductInputSchema = z.object({
  model: z.string().trim().min(1, "Model is required").max(100),
  sku: z.string().trim().max(100).nullable().optional(),
  brand: z.string().trim().min(1, "Brand name, slug, or ID is required"),
  brandNames: z.partialRecord(z.enum(locales), z.string().trim().min(1).max(120)).optional(),
  category: z.string().trim().min(1, "Category key, name, or ID is required"),
  status: z.enum(["DRAFT", "NEEDS_REVIEW", "READY", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  origin: z.enum(["AI", "MANUAL", "LOCAL_IMPORT", "WEB_SOURCE"]).default("AI"),
  upsert: z.boolean().default(true),

  // Multilingual translations map
  translations: z.partialRecord(z.enum(locales), singleTranslationSchema).optional(),

  // Flat fields (shorthand for single language upload, defaults to zh)
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  directDefinition: z.string().trim().optional(),
  shortDescription: z.string().trim().optional(),
  whatItIs: z.string().trim().optional(),
  problemSolved: z.string().trim().optional(),
  suitableFor: z.string().trim().optional(),
  advantages: z.union([z.array(z.string()), z.string()]).optional(),
  applications: z.union([z.array(z.string()), z.string()]).optional(),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
  sourceNote: z.string().trim().optional(),
  faqs: z.array(z.object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })).optional(),

  // Specifications / structured attributes
  attributes: z.union([
    productAttributeListSchema,
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  ]).optional(),

  // Media assets
  media: z.array(z.object({
    assetId: z.string().min(1).optional(),
    isPrimary: z.boolean().optional(),
    alt: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
    title: z.string().optional(),
  })).optional(),
});

export type SingleProductInput = z.infer<typeof singleProductInputSchema>;

export const productIngestPayloadSchema = z.union([
  singleProductInputSchema,
  z.array(singleProductInputSchema),
  z.object({
    items: z.array(singleProductInputSchema),
  }),
]);

function normalizedLabel(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, "");
}

function localizedLabels(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string");
}

function cleanSlug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function toStringArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  return [];
}

async function resolveBrand(tx: Prisma.TransactionClient, brandInput: string, autoCreate = true) {
  const trimmed = brandInput.trim();
  let brand = await tx.brand.findUnique({ where: { id: trimmed } });
  if (brand) return brand;

  const slugCandidate = cleanSlug(trimmed);
  if (slugCandidate) {
    brand = await tx.brand.findUnique({ where: { slug: slugCandidate } });
    if (brand) return brand;
  }

  brand = await tx.brand.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (brand) return brand;

  if (autoCreate && trimmed.length >= 2) {
    const slug = slugCandidate || `brand-${randomUUID().slice(0, 8)}`;
    brand = await tx.brand.create({
      data: {
        name: formatBrandName(trimmed),
        slug,
        rightsConfirmed: true,
      },
    });
    return brand;
  }

  throw new Error(`BRAND_NOT_FOUND: Could not resolve brand "${trimmed}".`);
}

async function resolveCategory(tx: Prisma.TransactionClient, categoryInput: string) {
  const trimmed = categoryInput.trim();
  let category = await tx.category.findUnique({
    where: { id: trimmed },
    include: {
      translations: true,
      attributes: { where: { archivedAt: null } },
    },
  });
  if (category) return category;

  category = await tx.category.findUnique({
    where: { key: trimmed },
    include: {
      translations: true,
      attributes: { where: { archivedAt: null } },
    },
  });
  if (category) return category;

  const translation = await tx.categoryTranslation.findFirst({
    where: {
      OR: [
        { slug: { equals: cleanSlug(trimmed), mode: "insensitive" } },
        { name: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    include: {
      category: {
        include: {
          translations: true,
          attributes: { where: { archivedAt: null } },
        },
      },
    },
  });
  if (translation?.category) return translation.category;

  const allCategories = await tx.category.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { key: true },
  });
  const available = allCategories.map((c) => c.key).join(", ");
  throw new Error(`CATEGORY_NOT_FOUND: Category "${trimmed}" not found. Available keys: [${available}]`);
}

function ensureDirectDefinition(def: string | undefined, model: string, locale: Locale): string {
  const trimmed = def?.trim() ?? "";
  if (locale === "zh") {
    if (trimmed.length >= 40) return trimmed;
    if (trimmed.length > 0) {
      return `${trimmed}。本产品专为高可靠性通信与工业电源应用场景设计制造。`;
    }
    return `${model} 是一款面向通信机房与工业基础设施的高可靠性电源设备，提供稳定持续的直流供电保障。`;
  }
  if (locale === "en") {
    if (trimmed.length >= 40) return trimmed;
    if (trimmed.length > 0) {
      return `${trimmed}. Engineered for telecommunication base stations and mission-critical power environments.`;
    }
    return `The ${model} is a high-efficiency power system designed for telecommunication facilities and industrial infrastructure.`;
  }
  if (locale === "ru") {
    if (trimmed.length >= 40) return trimmed;
    if (trimmed.length > 0) {
      return `${trimmed}. Разработано для объектов телекоммуникаций и критической инфраструктуры.`;
    }
    return `Система электропитания ${model} для телекоммуникационных объектов, центров обработки данных и промышленной инфраструктуры.`;
  }
  if (trimmed.length >= 40) return trimmed;
  if (trimmed.length > 0) {
    return `${trimmed}. Designed for telecommunications facilities and mission-critical infrastructure.`;
  }
  return `The ${model} is a high-efficiency power system designed for telecommunications facilities and industrial infrastructure.`;
}

interface NormalizedTranslation {
  locale: Locale;
  slug: string;
  name: string;
  directDefinition: string;
  shortDescription: string;
  whatItIs: string;
  problemSolved: string;
  suitableFor: string;
  advantages: string[];
  applications: string[];
  seoTitle: string;
  seoDescription: string;
  sourceNote: string | null;
  faqs: Array<{ question: string; answer: string }>;
}

async function prepareTranslations(
  tx: Prisma.TransactionClient,
  productId: string | null,
  model: string,
  input: SingleProductInput,
): Promise<NormalizedTranslation[]> {
  const rawTranslations = (input.translations ?? {}) as Partial<Record<Locale, z.infer<typeof singleTranslationSchema>>>;
  const flatZh: z.infer<typeof singleTranslationSchema> = {
    name: input.name,
    slug: input.slug,
    directDefinition: input.directDefinition,
    shortDescription: input.shortDescription,
    whatItIs: input.whatItIs,
    problemSolved: input.problemSolved,
    suitableFor: input.suitableFor,
    advantages: input.advantages,
    applications: input.applications,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    sourceNote: input.sourceNote,
    faqs: input.faqs,
  };

  const results: NormalizedTranslation[] = [];

  for (const locale of locales) {
    const localeRaw = rawTranslations[locale] ?? (locale === "zh" ? flatZh : undefined);
    const raw = localeRaw ?? (locale === "fr" || locale === "de" || locale === "es" || locale === "ar" ? rawTranslations.en : undefined);

    let name = raw?.name?.trim();
    if (!name) {
      name = locale === "zh" ? `${model} 专业电源设备` : locale === "ru" ? `${model} Оборудование электропитания` : `${model} Power Equipment`;
    }

    const baseSlug = cleanSlug(localeRaw?.slug || `${model}-${locale}`);
    let finalSlug = baseSlug || `product-${locale}-${randomUUID().slice(0, 6)}`;

    // Ensure slug is unique per locale across all other products
    let attempts = 0;
    while (attempts < 5) {
      const existingSlug = await tx.productTranslation.findFirst({
        where: {
          locale,
          slug: finalSlug,
          ...(productId ? { productId: { not: productId } } : {}),
        },
        select: { id: true },
      });
      if (!existingSlug) break;
      finalSlug = `${baseSlug}-${randomUUID().slice(0, 4)}`;
      attempts += 1;
    }

    const directDefinition = ensureDirectDefinition(raw?.directDefinition, model, locale);
    const shortDescription = raw?.shortDescription?.trim() || directDefinition.slice(0, 160);
    const whatItIs = raw?.whatItIs?.trim() || (locale === "zh"
      ? `${name} 采用模块化结构与高可靠性元器件，支持便捷安装与智能远程运维管理。`
      : locale === "ru"
      ? `${name} отличается модульной конструкцией и высокой надежностью для удобного обслуживания и мониторинга.`
      : `${name} features a modular architecture and high-reliability components for simplified maintenance and monitoring.`);

    const problemSolved = raw?.problemSolved?.trim() || (locale === "zh"
      ? "有效解决复杂供电环境下电能转换效率低、机房空间受限与电池备电管理繁琐的难题。"
      : locale === "ru"
      ? "Решает проблемы низкой эффективности преобразования, нехватки места и сложного управления батареями."
      : "Resolves power conversion inefficiency, confined space constraints, and complex battery lifecycle management.");

    const suitableFor = raw?.suitableFor?.trim() || (locale === "zh"
      ? "适用于通信基站、数据中心、边缘计算汇聚节点及各类工业不间断直流供电场景。"
      : locale === "ru"
      ? "Подходит для базовых станций связи, ЦОД, узлов агрегации и промышленных систем питания."
      : "Suitable for telecom base stations, data centers, edge computing aggregation nodes, and industrial DC applications.");

    let advantages = toStringArray(raw?.advantages);
    if (!advantages.length) {
      advantages = locale === "zh"
        ? ["高效节能整流架构，降低站点运行能耗", "紧凑标准化机架设计，节约机房宝贵空间", "完善的蓄电池智能管理与多重保护机制"]
        : locale === "ru"
        ? ["Высокая энергоэффективность", "Компактный стоечный формат", "Интеллектуальное управление аккумуляторами"]
        : ["High-efficiency energy conversion", "Compact standardized rack footprint", "Intelligent battery lifecycle management"];
    }

    let applications = toStringArray(raw?.applications);
    if (!applications.length) {
      applications = locale === "zh"
        ? ["通信宏基站与室内分布站点", "边缘计算及数据汇聚机房", "轨道交通与工业调度指挥中心"]
        : locale === "ru"
        ? ["Базовые станции и распределенные узлы", "Периферийные вычисления и центры данных", "Транспортная и промышленная инфраструктура"]
        : ["Telecom macro and indoor distribution sites", "Edge computing and aggregation facilities", "Railway transport and industrial command centers"];
    }

    const seoTitle = raw?.seoTitle?.trim() || (locale === "zh" ? `${name} - 规格参数与技术资料` : `${name} - Specifications & Technical Data`).slice(0, 120);
    const seoDescription = raw?.seoDescription?.trim() || directDefinition.slice(0, 180);
    const sourceNote = raw?.sourceNote?.trim() || (locale === "zh" ? "AI 自动化录入与整理" : "AI automated ingestion and documentation");
    const faqs = raw?.faqs ?? [];

    results.push({
      locale,
      slug: finalSlug,
      name,
      directDefinition,
      shortDescription,
      whatItIs,
      problemSolved,
      suitableFor,
      advantages,
      applications,
      seoTitle,
      seoDescription,
      sourceNote,
      faqs,
    });
  }

  return results;
}

interface ParsedAttributeItem {
  key: string;
  value: string | number | boolean;
  unit?: string;
  label?: string;
  featured?: boolean;
  featureOrder?: number;
  displayLabel?: string | Partial<Record<Locale, string>>;
}

function normalizeAttributesInput(attributes: SingleProductInput["attributes"]): ParsedAttributeItem[] {
  if (!attributes) return [];
  if (Array.isArray(attributes)) {
    return attributes.map((item) => ({
      key: item.key.trim(),
      value: item.value,
      unit: item.unit?.trim() || undefined,
      label: item.label?.trim() || undefined,
      featured: item.featured,
      featureOrder: item.featureOrder,
      displayLabel: item.displayLabel,
    }));
  }
  return Object.entries(attributes).map(([key, value]) => ({
    key: key.trim(),
    value,
  }));
}

async function applyAttributes(
  tx: Prisma.TransactionClient,
  productId: string,
  categoryId: string,
  rawAttributes: SingleProductInput["attributes"],
  origin: ContentOrigin,
) {
  const items = normalizeAttributesInput(rawAttributes);
  if (!items.length) return 0;

  const existingDefinitions = await tx.attributeDefinition.findMany({
    where: { categoryId, archivedAt: null },
  });

  let sortOrderCounter = existingDefinitions.length;

  for (const item of items) {
    const itemKeyNorm = normalizedLabel(item.key);
    let definition = existingDefinitions.find((def) =>
      normalizedLabel(def.key) === itemKeyNorm ||
      localizedLabels(def.labels).some((l) => normalizedLabel(l) === itemKeyNorm)
    );

    if (!definition) {
      const isNum = typeof item.value === "number" || (/^-?\d+(?:\.\d+)?$/.test(String(item.value).trim()) && item.unit);
      const isBool = typeof item.value === "boolean" || ["true", "false", "yes", "no", "是", "否"].includes(String(item.value).trim().toLowerCase());
      const defKey = cleanSlug(item.key) || `attr-${randomUUID().slice(0, 6)}`;
      const labelText = item.label || item.key;

      sortOrderCounter += 1;
      definition = await tx.attributeDefinition.create({
        data: {
          categoryId,
          key: defKey,
          type: isNum ? "NUMBER" : isBool ? "BOOLEAN" : "TEXT",
          standardUnit: item.unit ?? null,
          required: false,
          comparable: true,
          sortOrder: sortOrderCounter,
          labels: (() => {
            const normalizedDefKey = defKey.toLowerCase().replace(/_/g, "-");
            const canonicalMatch = CANONICAL_SPEC_LABELS[normalizedDefKey] || CANONICAL_SPEC_LABELS[defKey] || CANONICAL_SPEC_LABELS[item.key.toLowerCase().trim()];
            return canonicalMatch ? coreLabelsWithEnglishFallback(canonicalMatch) : allLocaleText(labelText);
          })(),
        },
      });
      existingDefinitions.push(definition);
    }

    const valStr = String(item.value).trim();
    let textValue: string | null = null;
    let numberValue: Prisma.Decimal | null = null;
    let booleanValue: boolean | null = null;

    if (definition.type === "NUMBER") {
      const parsedNum = parseFloat(valStr);
      if (!Number.isNaN(parsedNum)) {
        numberValue = new Prisma.Decimal(parsedNum);
      } else {
        textValue = valStr;
      }
    } else if (definition.type === "BOOLEAN") {
      const lower = valStr.toLowerCase();
      booleanValue = ["true", "yes", "1", "是", "да"].includes(lower);
    } else {
      textValue = valStr;
    }

    await tx.productAttribute.upsert({
      where: {
        productId_definitionId: {
          productId,
          definitionId: definition.id,
        },
      },
      update: {
        textValue,
        numberValue,
        booleanValue,
        unit: item.unit ?? definition.standardUnit ?? null,
        origin,
        ...(item.featured !== undefined ? { featured: item.featured, featureOrder: item.featured ? item.featureOrder ?? definition.sortOrder : null } : {}),
        ...(item.displayLabel !== undefined ? { displayLabels: typeof item.displayLabel === "string" ? allLocaleText(item.displayLabel) : item.displayLabel } : {}),
      },
      create: {
        productId,
        definitionId: definition.id,
        textValue,
        numberValue,
        booleanValue,
        unit: item.unit ?? definition.standardUnit ?? null,
        origin,
        featured: item.featured ?? null,
        featureOrder: item.featured ? item.featureOrder ?? definition.sortOrder : null,
        displayLabels: item.displayLabel === undefined ? undefined : typeof item.displayLabel === "string" ? allLocaleText(item.displayLabel) : item.displayLabel,
      },
    });
  }

  return items.length;
}

export interface IngestResultItem {
  success: boolean;
  id?: string;
  normalizedId?: string;
  model: string;
  status?: PublishStatus;
  published?: boolean;
  gateErrors?: string[];
  isPublishable?: boolean;
  error?: string;
  links?: {
    admin: string;
    public: Record<Locale, string>;
  };
}

export async function ingestSingleProduct(
  tx: Prisma.TransactionClient,
  rawInput: z.input<typeof singleProductInputSchema>,
  actor: { actorId: string; actorType: "AI" | "USER" },
): Promise<IngestResultItem> {
  const input = singleProductInputSchema.parse(rawInput);
  const brand = await resolveBrand(tx, input.brand, true);
  if (input.brandNames) {
    const currentNames = brand.localizedNames && typeof brand.localizedNames === "object" && !Array.isArray(brand.localizedNames) ? brand.localizedNames as Record<string, string> : {};
    await tx.brand.update({ where: { id: brand.id }, data: { localizedNames: { ...currentNames, ...input.brandNames } } });
  }
  const category = await resolveCategory(tx, input.category);

  const cleanModel = input.model.trim();
  const normalizedId = `${brand.slug}:${cleanModel}`.toLowerCase().replaceAll(/[^a-z0-9:._-]/g, "-");

  const existingProduct = await tx.product.findFirst({
    where: {
      OR: [
        { brandId: brand.id, model: cleanModel },
        { normalizedId },
      ],
    },
    include: {
      translations: true,
      attributes: true,
      media: true,
    },
  });

  if (existingProduct && !input.upsert) {
    throw new Error(`PRODUCT_ALREADY_EXISTS: Product "${cleanModel}" already exists under brand "${brand.name}". Pass "upsert: true" to update.`);
  }

  const productId = existingProduct?.id ?? randomUUID();
  const translations = await prepareTranslations(tx, existingProduct?.id ?? null, cleanModel, input);

  let product: Product;
  let isUpdate = false;

  if (existingProduct) {
    isUpdate = true;
    product = await tx.product.update({
      where: { id: existingProduct.id },
      data: {
        sku: input.sku !== undefined ? (input.sku || null) : existingProduct.sku,
        categoryId: category.id,
        status: input.status,
        origin: input.origin as ContentOrigin,
        contentUpdatedAt: new Date(),
      },
    });

    for (const t of translations) {
      const existingTranslation = existingProduct.translations.find((item) => item.locale === t.locale);
      const savedTranslation = await tx.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale: t.locale } },
        update: {
          name: t.name,
          slug: t.slug,
          directDefinition: t.directDefinition,
          shortDescription: t.shortDescription,
          whatItIs: t.whatItIs,
          problemSolved: t.problemSolved,
          suitableFor: t.suitableFor,
          advantages: t.advantages,
          applications: t.applications,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
          sourceNote: t.sourceNote,
        },
        create: {
          productId: product.id,
          locale: t.locale,
          slug: t.slug,
          name: t.name,
          directDefinition: t.directDefinition,
          shortDescription: t.shortDescription,
          whatItIs: t.whatItIs,
          problemSolved: t.problemSolved,
          suitableFor: t.suitableFor,
          advantages: t.advantages,
          applications: t.applications,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
          sourceNote: t.sourceNote,
          published: false,
        },
      });

      if (t.faqs.length) {
        await tx.fAQ.deleteMany({ where: { productTranslationId: savedTranslation.id } });
        for (let i = 0; i < t.faqs.length; i++) {
          await tx.fAQ.create({
            data: {
              productTranslationId: savedTranslation.id,
              question: t.faqs[i]!.question,
              answer: t.faqs[i]!.answer,
              sortOrder: i,
            },
          });
        }
      }

      if (existingTranslation && existingTranslation.slug !== t.slug) {
        await tx.slugRedirect.upsert({
          where: { locale_fromPath: { locale: t.locale, fromPath: `/products/${existingTranslation.slug}` } },
          update: { toPath: `/products/${t.slug}` },
          create: { locale: t.locale, fromPath: `/products/${existingTranslation.slug}`, toPath: `/products/${t.slug}` },
        });
      }
    }
  } else {
    product = await tx.product.create({
      data: {
        id: productId,
        normalizedId,
        sku: input.sku || null,
        model: cleanModel,
        brandId: brand.id,
        categoryId: category.id,
        status: input.status,
        origin: input.origin as ContentOrigin,
        translations: {
          create: translations.map((t) => ({
            locale: t.locale,
            slug: t.slug,
            name: t.name,
            directDefinition: t.directDefinition,
            shortDescription: t.shortDescription,
            whatItIs: t.whatItIs,
            problemSolved: t.problemSolved,
            suitableFor: t.suitableFor,
            advantages: t.advantages,
            applications: t.applications,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            sourceNote: t.sourceNote,
            published: false,
            faqs: {
              create: t.faqs.map((faq, idx) => ({
                question: faq.question,
                answer: faq.answer,
                sortOrder: idx,
              })),
            },
          })),
        },
      },
    });
  }

  // Apply structured specifications / attributes
  if (input.attributes) {
    await applyAttributes(tx, product.id, category.id, input.attributes, input.origin as ContentOrigin);
  }

  // Link media assets
  if (input.media && input.media.length) {
    for (let i = 0; i < input.media.length; i++) {
      const mediaItem = input.media[i]!;
      if (mediaItem.assetId) {
        const altRecord = typeof mediaItem.alt === "object"
          ? mediaItem.alt
          : allLocaleText(mediaItem.alt || product.model);

        await tx.productMedia.upsert({
          where: { productId_assetId: { productId: product.id, assetId: mediaItem.assetId } },
          update: { alt: altRecord },
          create: {
            productId: product.id,
            assetId: mediaItem.assetId,
            sortOrder: i,
            alt: altRecord,
          },
        });

        if (mediaItem.isPrimary || !product.primaryImageId) {
          product = await tx.product.update({
            where: { id: product.id },
            data: { primaryImageId: mediaItem.assetId },
          });
        }
      }
    }
  }

  // Publication gate validation
  const gateErrors = await validateProductForPublication(product.id, tx);
  let published = false;

  if (input.status === "PUBLISHED") {
    if (gateErrors.length === 0) {
      product = await tx.product.update({
        where: { id: product.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          translations: { updateMany: { where: {}, data: { published: true } } },
        },
      });
      published = true;
    } else {
      product = await tx.product.update({
        where: { id: product.id },
        data: { status: "NEEDS_REVIEW" },
      });
    }
  }

  // Create content revision snapshot
  const snapshotData = await tx.product.findUnique({
    where: { id: product.id },
    include: {
      translations: { include: { faqs: true } },
      attributes: { include: { definition: true } },
      media: { include: { asset: true } },
    },
  });

  const version = (await tx.contentRevision.count({ where: { entityType: "Product", entityId: product.id } })) + 1;
  await tx.contentRevision.create({
    data: {
      entityType: "Product",
      entityId: product.id,
      version,
      snapshot: safeJsonSerialize(snapshotData),
      origin: input.origin as ContentOrigin,
      actorId: actor.actorId,
    },
  });

  await tx.auditLog.create({
    data: {
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: isUpdate ? "PRODUCT_API_UPDATE" : "PRODUCT_API_CREATE",
      entityType: "Product",
      entityId: product.id,
      details: {
        model: product.model,
        status: product.status,
        published,
        gateErrors,
      },
    },
  });

  const finalTranslations = await tx.productTranslation.findMany({
    where: { productId: product.id },
    select: { locale: true, slug: true },
  });

  const publicLinks = Object.fromEntries(locales.map((locale) => [
    locale,
    `/${locale}/products/${finalTranslations.find((translation) => translation.locale === locale)?.slug ?? product.model}`,
  ])) as Record<Locale, string>;

  return {
    success: true,
    id: product.id,
    normalizedId: product.normalizedId,
    model: product.model,
    status: product.status,
    published,
    gateErrors,
    isPublishable: gateErrors.length === 0,
    links: {
      admin: `/admin/products/${product.id}`,
      public: publicLinks,
    },
  };
}


const CANONICAL_SPEC_LABELS: Record<string, { zh: string; en: string; ru: string }> = {
  "input-voltage": { zh: "交流输入电压范围", en: "Input Voltage Range", ru: "Диапазон входного напряжения" },
  "input_voltage": { zh: "交流输入电压范围", en: "Input Voltage Range", ru: "Диапазон входного напряжения" },
  "input-voltage-range": { zh: "交流输入电压范围", en: "AC Input Voltage Range", ru: "Диапазон входного напряжения AC" },
  "output-voltage": { zh: "直流输出电压范围", en: "Output Voltage Range", ru: "Диапазон выходного напряжения" },
  "output_voltage": { zh: "直流输出电压范围", en: "Output Voltage Range", ru: "Диапазон выходного напряжения" },
  "output-voltage-range": { zh: "直流输出电压范围", en: "DC Output Voltage Range", ru: "Диапазон выходного напряжения DC" },
  "nominal-voltage": { zh: "额定输出电压", en: "Nominal Output Voltage", ru: "Номинальное выходное напряжение" },
  "output-current": { zh: "额定输出电流", en: "Output Current", ru: "Выходной ток" },
  "output_current": { zh: "额定输出电流", en: "Output Current", ru: "Выходной ток" },
  "max-output-current": { zh: "最大输出电流", en: "Maximum Output Current", ru: "Максимальный выходной ток" },
  "output-power": { zh: "额定输出功率", en: "Output Power", ru: "Выходная мощность" },
  "output_power": { zh: "额定输出功率", en: "Output Power", ru: "Выходная мощность" },
  "rated-power": { zh: "额定输出功率", en: "Rated Output Power", ru: "Номинальная выходная мощность" },
  "efficiency": { zh: "整流效率", en: "Efficiency", ru: "КПД" },
  "peak-efficiency": { zh: "整流峰值效率", en: "Peak Efficiency", ru: "Пиковый КПД" },
  "rectifier-efficiency": { zh: "整流模块峰值效率", en: "Rectifier Peak Efficiency", ru: "Пиковый КПД выпрямителя" },
  "system-efficiency": { zh: "系统最高效率", en: "System Efficiency", ru: "КПД системы" },
  "power-factor": { zh: "功率因数", en: "Power Factor", ru: "Коэффициент мощности" },
  "thd": { zh: "总谐波失真(THD)", en: "Total Harmonic Distortion (THD)", ru: "Суммарный КНИ (THD)" },
  "cooling": { zh: "散热冷却方式", en: "Cooling Method", ru: "Способ охлаждения" },
  "cooling-method": { zh: "散热冷却方式", en: "Cooling Method", ru: "Способ охлаждения" },
  "operating-temperature": { zh: "工作温度范围", en: "Operating Temperature", ru: "Рабочая температура" },
  "relative-humidity": { zh: "相对环境湿度", en: "Relative Humidity", ru: "Относительная влажность" },
  "dimensions": { zh: "外形尺寸(高x宽x深)", en: "Dimensions (H x W x D)", ru: "Габариты (В x Ш x Г)" },
  "form-factor": { zh: "结构安装规格", en: "Form Factor", ru: "Форм-фактор / Монтаж" },
  "form_factor": { zh: "结构安装规格", en: "Form Factor", ru: "Форм-фактор / Монтаж" },
  "system-capacity": { zh: "系统最大输出容量", en: "System Capacity", ru: "Емкость системы" },
  "system_capacity": { zh: "系统最大输出容量", en: "System Capacity", ru: "Емкость системы" },
  "rated-capacity": { zh: "系统额定容量", en: "Rated Capacity", ru: "Номинальная емкость" },
  "max-system-capacity": { zh: "系统最大输出电流", en: "Max System Capacity", ru: "Максимальный ток системы" },
  "rectifier-slots": { zh: "整流模块槽位数", en: "Rectifier Slots", ru: "Количество слотов выпрямителей" },
  "rectifier_slots": { zh: "整流模块槽位数", en: "Rectifier Slots", ru: "Количество слотов выпрямителей" },
  "rectifier-slot-capacity": { zh: "整流模块槽位数", en: "Rectifier Slot Capacity", ru: "Количество слотов выпрямителей" },
  "rectifier-capacity": { zh: "单模块额定电流", en: "Rectifier Unit Capacity", ru: "Ток одного модуля" },
  "rectifier-module": { zh: "配套整流模块", en: "Rectifier Module", ru: "Выпрямительный модуль" },
  "rectifier-module-model": { zh: "适配整流模块", en: "Compatible Rectifier Model", ru: "Модель выпрямителя" },
  "compatible-rectifiers": { zh: "适配整流模块", en: "Compatible Rectifiers", ru: "Совместимые выпрямители" },
  "controller": { zh: "监控管理单元", en: "Controller Unit", ru: "Модуль управления" },
  "controller-model": { zh: "监控单元型号", en: "Controller Model", ru: "Модель контроллера" },
  "controller-unit": { zh: "监控管理单元", en: "Controller Unit", ru: "Модуль управления" },
  "communication": { zh: "通信与监控接口", en: "Communication Interface", ru: "Интерфейс связи" },
  "communication-interface": { zh: "通信与监控接口", en: "Communication Interface", ru: "Интерфейс связи" },
  "communication-interfaces": { zh: "通信与监控接口", en: "Communication Interfaces", ru: "Интерфейсы связи" },
  "input-grid-type": { zh: "电网输入制式", en: "Input Grid Type", ru: "Тип входной электросети" },
  "ac-input": { zh: "交流输入制式", en: "AC Input Type", ru: "Параметры входа AC" },
  "ac_input": { zh: "交流输入制式", en: "AC Input Type", ru: "Параметры входа AC" },
  "ac-input-voltage": { zh: "交流输入电压范围", en: "AC Input Voltage", ru: "Входное напряжение AC" },
  "input-phase": { zh: "输入相数", en: "Input Phase", ru: "Входная фазность" },
  "grid-frequency": { zh: "电网频率范围", en: "Grid Frequency Range", ru: "Диапазон частоты сети" },
  "dc-distribution": { zh: "直流配电分路", en: "DC Distribution", ru: "Распределение DC" },
  "dc_distribution": { zh: "直流配电分路", en: "DC Distribution", ru: "Распределение DC" },
  "battery-protection": { zh: "蓄电池保护机制", en: "Battery Protection", ru: "Защита батарей" },
  "battery_protection": { zh: "蓄电池保护机制", en: "Battery Protection", ru: "Защита батарей" },
  "lvd-function": { zh: "低电压脱扣保护(LVD)", en: "Low Voltage Disconnect (LVD)", ru: "Отключение при низком напряжении (LVD)" },
  "protection-grade": { zh: "防护等级", en: "Protection Rating", ru: "Класс защиты" }
};

export async function ingestProductsPayload(
  rawPayload: unknown,
  actor: { actorId: string; actorType: "AI" | "USER" },
) {
  const parsed = productIngestPayloadSchema.parse(rawPayload);
  const items: SingleProductInput[] = Array.isArray(parsed)
    ? parsed
    : "items" in parsed && Array.isArray(parsed.items)
    ? parsed.items
    : [parsed as SingleProductInput];

  const results: IngestResultItem[] = [];
  const purgeUrls: string[] = [];

  for (const item of items) {
    try {
      const result = await db.$transaction(async (tx) => {
        return await ingestSingleProduct(tx, item, actor);
      }, { timeout: 20_000 });

      results.push(result);

      if (result.published && result.links) {
        for (const path of Object.values(result.links.public)) {
          purgeUrls.push(`${env.SITE_URL}${path}`);
        }
      }
    } catch (error) {
      results.push({
        success: false,
        model: item.model,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
    }
  }

  if (purgeUrls.length) {
    await purgeEdgeOne(purgeUrls).catch(() => undefined);
  }

  return {
    total: items.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    items: results,
  };
}

export async function getProductDetailForApi(productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      brand: true,
      category: {
        include: {
          translations: true,
          attributes: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
        },
      },
      translations: {
        include: { faqs: { orderBy: { sortOrder: "asc" } } },
      },
      attributes: {
        include: { definition: true },
      },
      media: {
        include: { asset: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!product) return null;

  const gateErrors = await validateProductForPublication(product.id);

  const translationsMap: Record<string, unknown> = {};
  for (const t of product.translations) {
    translationsMap[t.locale] = {
      name: t.name,
      slug: t.slug,
      directDefinition: t.directDefinition,
      shortDescription: t.shortDescription,
      whatItIs: t.whatItIs,
      problemSolved: t.problemSolved,
      suitableFor: t.suitableFor,
      advantages: t.advantages,
      applications: t.applications,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
      sourceNote: t.sourceNote,
      published: t.published,
      faqs: t.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    };
  }

  const attributesList = product.attributes.map((attr) => ({
    key: attr.definition.key,
    label: (attr.definition.labels as Record<string, string>)?.zh ?? attr.definition.key,
    type: attr.definition.type,
    value: attr.numberValue != null ? Number(attr.numberValue) : attr.booleanValue != null ? attr.booleanValue : attr.textValue,
    unit: attr.unit ?? attr.definition.standardUnit,
    origin: attr.origin,
    locked: attr.locked,
    featured: attr.featured,
    featureOrder: attr.featureOrder,
    displayLabel: attr.displayLabels,
  }));

  const mediaList = product.media.map((m) => ({
    assetId: m.assetId,
    kind: m.asset.kind,
    originalName: m.asset.originalName,
    storageKey: m.asset.storageKey,
    url: `/media/${m.asset.storageKey}`,
    mimeType: m.asset.mimeType,
    scanStatus: m.asset.scanStatus,
    rightsApproved: m.asset.rightsApproved,
    isPrimary: product.primaryImageId === m.assetId,
    alt: m.alt,
  }));

  return {
    id: product.id,
    normalizedId: product.normalizedId,
    model: product.model,
    sku: product.sku,
    status: product.status,
    origin: product.origin,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    contentUpdatedAt: product.contentUpdatedAt.toISOString(),
    brand: {
      id: product.brand.id,
      name: product.brand.name,
      names: Object.fromEntries(locales.map((locale) => [locale, ((product.brand.localizedNames as Record<string, string>)[locale] ?? product.brand.name)])),
      slug: product.brand.slug,
      rightsConfirmed: product.brand.rightsConfirmed,
    },
    category: {
      id: product.category.id,
      key: product.category.key,
      name: product.category.translations.find((t) => t.locale === "zh")?.name ?? product.category.key,
    },
    primaryImageId: product.primaryImageId,
    translations: translationsMap,
    attributes: attributesList,
    media: mediaList,
    gateErrors,
    isPublishable: gateErrors.length === 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export const productPatchSchema = z.object({
  status: z.enum(["DRAFT", "NEEDS_REVIEW", "READY", "PUBLISHED", "ARCHIVED"]).optional(),
  sku: z.string().trim().max(100).nullable().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  primaryImageId: z.string().nullable().optional(),
  translations: z.partialRecord(z.enum(locales), singleTranslationSchema.partial()).optional(),
  attributes: z.union([
    productAttributeListSchema,
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  ]).optional(),
  media: z.array(z.object({
    assetId: z.string().min(1),
    isPrimary: z.boolean().optional(),
    alt: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  })).optional(),
});

export type ProductPatchInput = z.infer<typeof productPatchSchema>;

export async function updateProductPartial(
  productId: string,
  rawInput: unknown,
  actor: { actorId: string; actorType: "AI" | "USER" },
) {
  const patch = productPatchSchema.parse(rawInput);

  return await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        category: true,
        translations: true,
        attributes: true,
      },
    });

    if (!product) return null;

    let targetCategoryId = product.categoryId;
    if (patch.categoryId) {
      const cat = await resolveCategory(tx, patch.categoryId);
      targetCategoryId = cat.id;
    }

    let targetBrandId = product.brandId;
    if (patch.brandId) {
      const br = await resolveBrand(tx, patch.brandId, false);
      targetBrandId = br.id;
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        sku: patch.sku !== undefined ? patch.sku : product.sku,
        categoryId: targetCategoryId,
        brandId: targetBrandId,
        primaryImageId: patch.primaryImageId !== undefined ? patch.primaryImageId : product.primaryImageId,
        status: patch.status ?? product.status,
        contentUpdatedAt: new Date(),
      },
    });

    if (patch.translations) {
      for (const [loc, tr] of Object.entries(patch.translations)) {
        const locale = loc as Locale;
        const existingTr = product.translations.find((t) => t.locale === locale);

        const updateData: Prisma.ProductTranslationUpdateInput = {};
        if (tr.name !== undefined) updateData.name = tr.name;
        if (tr.directDefinition !== undefined) updateData.directDefinition = ensureDirectDefinition(tr.directDefinition, product.model, locale);
        if (tr.shortDescription !== undefined) updateData.shortDescription = tr.shortDescription;
        if (tr.whatItIs !== undefined) updateData.whatItIs = tr.whatItIs;
        if (tr.problemSolved !== undefined) updateData.problemSolved = tr.problemSolved;
        if (tr.suitableFor !== undefined) updateData.suitableFor = tr.suitableFor;
        if (tr.advantages !== undefined) updateData.advantages = toStringArray(tr.advantages);
        if (tr.applications !== undefined) updateData.applications = toStringArray(tr.applications);
        if (tr.seoTitle !== undefined) updateData.seoTitle = tr.seoTitle;
        if (tr.seoDescription !== undefined) updateData.seoDescription = tr.seoDescription;
        if (tr.sourceNote !== undefined) updateData.sourceNote = tr.sourceNote;
        if (tr.slug !== undefined) {
          const newSlug = cleanSlug(tr.slug);
          if (newSlug) {
            updateData.slug = newSlug;
            if (existingTr && existingTr.slug !== newSlug) {
              await tx.slugRedirect.upsert({
                where: { locale_fromPath: { locale, fromPath: `/products/${existingTr.slug}` } },
                update: { toPath: `/products/${newSlug}` },
                create: { locale, fromPath: `/products/${existingTr.slug}`, toPath: `/products/${newSlug}` },
              });
            }
          }
        }

        const savedTr = await tx.productTranslation.upsert({
          where: { productId_locale: { productId, locale } },
          update: updateData,
          create: {
            productId,
            locale,
            slug: cleanSlug(tr.slug || `${product.model}-${locale}`),
            name: tr.name || product.model,
            directDefinition: ensureDirectDefinition(tr.directDefinition, product.model, locale),
            shortDescription: tr.shortDescription || product.model,
            whatItIs: tr.whatItIs || product.model,
            problemSolved: tr.problemSolved || product.model,
            suitableFor: tr.suitableFor || product.model,
            advantages: toStringArray(tr.advantages),
            applications: toStringArray(tr.applications),
            seoTitle: tr.seoTitle || product.model,
            seoDescription: tr.seoDescription || product.model,
            sourceNote: tr.sourceNote || null,
          },
        });

        if (tr.faqs) {
          await tx.fAQ.deleteMany({ where: { productTranslationId: savedTr.id } });
          for (let i = 0; i < tr.faqs.length; i++) {
            await tx.fAQ.create({
              data: {
                productTranslationId: savedTr.id,
                question: tr.faqs[i]!.question,
                answer: tr.faqs[i]!.answer,
                sortOrder: i,
              },
            });
          }
        }
      }
    }

    if (patch.attributes) {
      await applyAttributes(tx, productId, targetCategoryId, patch.attributes, "AI");
    }

    if (patch.media) {
      for (let i = 0; i < patch.media.length; i++) {
        const item = patch.media[i]!;
        const altRecord = typeof item.alt === "object"
          ? item.alt
          : allLocaleText(item.alt || product.model);

        await tx.productMedia.upsert({
          where: { productId_assetId: { productId, assetId: item.assetId } },
          update: { alt: altRecord },
          create: {
            productId,
            assetId: item.assetId,
            sortOrder: i,
            alt: altRecord,
          },
        });

        if (item.isPrimary) {
          await tx.product.update({ where: { id: productId }, data: { primaryImageId: item.assetId } });
        }
      }
    }

    const gateErrors = await validateProductForPublication(productId, tx);
    let published = false;

    if (patch.status === "PUBLISHED") {
      if (gateErrors.length === 0) {
        await tx.product.update({
          where: { id: productId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            translations: { updateMany: { where: {}, data: { published: true } } },
          },
        });
        published = true;
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { status: "NEEDS_REVIEW" },
        });
      }
    }

    const snapshot = await tx.product.findUnique({
      where: { id: productId },
      include: {
        translations: { include: { faqs: true } },
        attributes: { include: { definition: true } },
        media: { include: { asset: true } },
      },
    });

    const version = (await tx.contentRevision.count({ where: { entityType: "Product", entityId: productId } })) + 1;
    await tx.contentRevision.create({
      data: {
        entityType: "Product",
        entityId: productId,
        version,
        snapshot: safeJsonSerialize(snapshot),
        origin: "AI",
        actorId: actor.actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.actorId,
        actorType: actor.actorType,
        action: "PRODUCT_API_PATCH",
        entityType: "Product",
        entityId: productId,
        details: { status: patch.status, gateErrors, published },
      },
    });

    return {
      success: true,
      productId,
      status: patch.status ?? product.status,
      published,
      gateErrors,
      isPublishable: gateErrors.length === 0,
    };
  });
}

export async function archiveProduct(productId: string, actor: { actorId: string; actorType: "AI" | "USER" }) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { translations: true } });
  if (!product) return null;

  const updated = await db.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED" },
  });

  await db.auditLog.create({
    data: {
      actorId: actor.actorId,
      actorType: actor.actorType,
      action: "PRODUCT_ARCHIVE",
      entityType: "Product",
      entityId: productId,
    },
  });

  const urls = product.translations.map((t) => `${env.SITE_URL}/${t.locale}/products/${t.slug}`);
  await purgeEdgeOne(urls).catch(() => undefined);

  return updated;
}
