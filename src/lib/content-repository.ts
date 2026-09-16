import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { locales, type CategoryView, type EditorialItem, type Locale, type ProductAttributeView, type ProductListView, type ProductView } from "@/types/domain";
import { getDemoCategories, getDemoEditorial, getDemoProducts } from "@/content/demo-data";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import { categoryPath } from "@/lib/category-tree";
import { editorialRichTextToPlainText, isMarkdownLike, markdownToEditorialRichText, sanitizeEditorialRichText } from "@/lib/editorial-rich-text";
import { localizedBrandName } from "@/lib/brand";

function jsonStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function localizedMediaAlt(value: unknown, locale: Locale, fallback: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const alt = (value as Record<string, unknown>)[locale];
  return typeof alt === "string" && alt.trim() ? alt.trim() : fallback;
}

function publishedProductWhere(locale: Locale): Prisma.ProductWhereInput {
  return {
    status: "PUBLISHED",
    brand: { archivedAt: null, rightsConfirmed: true },
    category: { status: "PUBLISHED", translations: { some: { locale } } },
    translations: { some: { locale, published: true } },
  };
}

function fullProductInclude(locale: Locale) {
  return {
    brand: true,
    category: { include: { translations: { where: { locale } } } },
    translations: { where: { locale, published: true }, include: { faqs: { orderBy: { sortOrder: "asc" as const } } } },
    attributes: { where: { definition: { archivedAt: null } }, include: { definition: true }, orderBy: { definition: { sortOrder: "asc" as const } } },
    alarms: { orderBy: { sortOrder: "asc" as const } },
    media: { where: { asset: { scanStatus: "CLEAN" as const, rightsApproved: true } }, include: { asset: true }, orderBy: { sortOrder: "asc" as const } },
  } satisfies Prisma.ProductInclude;
}

type FullProductRecord = Prisma.ProductGetPayload<{ include: ReturnType<typeof fullProductInclude> }>;

function productCategoryTrail(categories: CategoryView[], categoryKey: string) {
  const byKey = new Map(categories.map((category) => [category.key, category]));
  const trail: NonNullable<ProductView["categoryTrail"]> = [];
  const visited = new Set<string>();
  let current = byKey.get(categoryKey);
  while (current && !visited.has(current.key)) {
    visited.add(current.key);
    trail.unshift({ key: current.key, name: current.name, path: current.path });
    current = current.parentKey ? byKey.get(current.parentKey) : undefined;
  }
  return trail;
}

function mapFullProduct(record: FullProductRecord, locale: Locale, categories: CategoryView[]): ProductView | undefined {
  const translation = record.translations[0];
  const categoryTranslation = record.category.translations[0];
  if (!translation || !categoryTranslation || !categories.some((category) => category.key === record.category.key)) return undefined;
  const images = [...record.media]
    .sort((left, right) => {
      const leftIsPrimary = left.assetId === record.primaryImageId;
      const rightIsPrimary = right.assetId === record.primaryImageId;
      if (leftIsPrimary !== rightIsPrimary) return leftIsPrimary ? -1 : 1;
      return left.sortOrder - right.sortOrder;
    })
    .flatMap(({ asset, alt }) => asset.width && asset.height ? [{
      src: `/media/${asset.storageKey}`,
      alt: localizedMediaAlt(alt, locale, translation.name),
      width: asset.width,
      height: asset.height,
    }] : [])
    .slice(0, 5);
  const mapAttribute = (attribute: FullProductRecord["attributes"][number]): ProductAttributeView => ({
    key: attribute.definition.key,
    label: (attribute.definition.labels as Record<string, string>)?.[locale] ?? (attribute.definition.labels as Record<string, string>)?.en ?? attribute.definition.key,
    value: (attribute.displayLabels as Record<string, string> | null)?.[locale] ?? (locale !== "zh" ? (attribute.displayLabels as Record<string, string> | null)?.en : undefined) ?? attribute.textValue ?? attribute.numberValue?.toString() ?? (attribute.booleanValue == null ? "—" : String(attribute.booleanValue)),
    unit: attribute.unit ?? attribute.definition.standardUnit ?? undefined,
    comparable: attribute.definition.comparable,
  });
  return {
    id: record.id,
    slug: translation.slug,
    model: record.model,
    sku: record.sku ?? undefined,
    brand: record.brand.name,
    brandId: record.brandId,
    brandDisplayName: localizedBrandName(record.brand, locale),
    categoryKey: record.category.key,
    categoryName: categoryTranslation.name,
    categoryTrail: productCategoryTrail(categories, record.category.key),
    name: translation.name,
    directDefinition: translation.directDefinition,
    shortDescription: translation.shortDescription,
    whatItIs: translation.whatItIs,
    problemSolved: translation.problemSolved,
    suitableFor: translation.suitableFor,
    advantages: jsonStrings(translation.advantages),
    applications: jsonStrings(translation.applications),
    featuredAttributes: record.attributes
      .filter((attribute) => attribute.featured)
      .sort((left, right) => (left.featureOrder ?? Number.MAX_SAFE_INTEGER) - (right.featureOrder ?? Number.MAX_SAFE_INTEGER))
      .map(mapAttribute),
    attributes: record.attributes.map(mapAttribute),
    faqs: translation.faqs.map(({ question, answer }) => ({ question, answer })),
    image: images[0],
    images,
    updatedAt: record.contentUpdatedAt.toISOString(),
    sourceNote: translation.sourceNote ?? undefined,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    alarms: record.alarms.map((alarm) => ({
      id: alarm.id,
      alarmCode: (alarm.alarmCode as Record<string, string>)?.[locale] ?? (alarm.alarmCode as Record<string, string>)?.en ?? "Alarm",
      ledStatus: (alarm.ledStatus as Record<string, string>)?.[locale] ?? (alarm.ledStatus as Record<string, string>)?.en ?? "—",
      cause: (alarm.cause as Record<string, string>)?.[locale] ?? (alarm.cause as Record<string, string>)?.en ?? "—",
      procedure: (alarm.procedure as Record<string, string>)?.[locale] ?? (alarm.procedure as Record<string, string>)?.en ?? "—",
      severity: alarm.severity === "CRITICAL" || alarm.severity === "WARNING" ? alarm.severity : "MAJOR",
    })),
  };
}

export const getProducts = cache(async (locale: Locale): Promise<ProductView[]> => {
  const categories = await getCategories(locale);
  const categoriesByKey = new Map(categories.map((category) => [category.key, category]));
  if (isDemoMode && !env.DATABASE_URL) return getDemoProducts(locale).flatMap((product) => {
    const category = categoriesByKey.get(product.categoryKey);
    return category ? [{ ...product, categoryName: category.name }] : [];
  });

  const records = await db.product.findMany({
    where: publishedProductWhere(locale),
    include: fullProductInclude(locale),
    orderBy: [{ category: { sortOrder: "asc" } }, { model: "asc" }],
  });

  return records.flatMap((record) => {
    const product = mapFullProduct(record, locale, categories);
    return product ? [product] : [];
  });
});

export const getCategories = cache(async (locale: Locale): Promise<CategoryView[]> => {
  // A configured CMS remains authoritative, including an intentionally empty catalogue.
  // Demo products/editorial can still be previewed without freezing the category tree.
  if (isDemoMode && !env.DATABASE_URL) return getDemoCategories(locale);
  const categories = await db.category.findMany({
    where: { status: "PUBLISHED", translations: { some: { locale } } },
    include: { translations: { where: { locale } }, _count: { select: { products: { where: { status: "PUBLISHED", brand: { rightsConfirmed: true, archivedAt: null }, translations: { some: { locale, published: true } } } } } } },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  const byId = new Map(categories.map((category) => [category.id, category]));
  const demoCounts = new Map<string, number>();
  if (isDemoMode) for (const product of getDemoProducts(locale)) demoCounts.set(product.categoryKey, (demoCounts.get(product.categoryKey) ?? 0) + 1);
  const views = categories.flatMap((category) => {
    const translation = category.translations[0];
    const path = categoryPath(categories, category.id, locale);
    // Do not turn a child of an unpublished ancestor into a new top-level category.
    if (!translation || !path) return [];
    return [{ id: category.id, key: category.key, slug: translation.slug, path, name: translation.name, description: translation.description, seoTitle: translation.seoTitle ?? undefined, seoDescription: translation.seoDescription ?? undefined, parentKey: category.parentId ? byId.get(category.parentId)?.key : undefined, level: category.level, count: isDemoMode ? demoCounts.get(category.key) ?? 0 : category._count.products, updatedAt: category.updatedAt.toISOString() }];
  });
  const byParent = new Map<string, typeof views>();
  for (const view of views) { if (!view.parentKey) continue; const siblings = byParent.get(view.parentKey) ?? []; siblings.push(view); byParent.set(view.parentKey, siblings); }
  function aggregateCount(key: string): number { return (views.find((item) => item.key === key)?.count ?? 0) + (byParent.get(key) ?? []).reduce((total, child) => total + aggregateCount(child.key), 0); }
  return views.map((view) => ({ ...view, count: aggregateCount(view.key) }));
});

const PRODUCT_CATALOG_PAGE_SIZE = 12;

type ProductCatalogRecord = {
  id: string;
  model: string;
  sku: string | null;
  primaryImageId: string | null;
  brand: { name: string; localizedNames: unknown };
  category: { key: string; translations: Array<{ name: string }> };
  translations: Array<{ slug: string; name: string; shortDescription: string; directDefinition: string }>;
  attributes?: Array<{
    textValue: string | null;
    numberValue: { toString(): string } | null;
    booleanValue: boolean | null;
    unit: string | null;
    displayLabels: unknown;
    definition: { key: string; labels: unknown; standardUnit: string | null; comparable: boolean };
  }>;
};

function catalogAttribute(record: NonNullable<ProductCatalogRecord["attributes"]>[number], locale: Locale): ProductAttributeView {
  const labels = record.definition.labels as Record<string, string>;
  const displayLabels = record.displayLabels as Record<string, string> | null;
  return {
    key: record.definition.key,
    label: labels?.[locale] ?? labels?.en ?? record.definition.key,
    value: displayLabels?.[locale] ?? (locale !== "zh" ? displayLabels?.en : undefined) ?? record.textValue ?? record.numberValue?.toString() ?? (record.booleanValue == null ? "—" : String(record.booleanValue)),
    unit: record.unit ?? record.definition.standardUnit ?? undefined,
    comparable: record.definition.comparable,
  };
}

function matchesCatalogQuery(product: ProductListView & { directDefinition: string }, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const attributeText = (product.attributes ?? []).map((attribute) => `${attribute.label} ${attribute.value} ${attribute.unit ?? ""}`).join(" ");
  const raw = [product.name, product.model, product.brand, product.brandDisplayName, product.categoryName, product.sku, product.shortDescription, product.directDefinition, attributeText].filter(Boolean).join(" ").toLowerCase();
  const normalized = raw.replace(/[-_/:,.\s]/g, "");
  return terms.every((term) => raw.includes(term) || Boolean(term.replace(/[-_/:,.\s]/g, "") && normalized.includes(term.replace(/[-_/:,.\s]/g, ""))));
}

/**
 * Fetches the small, paginated projection needed by the public catalogue.
 * Search keeps its previous attribute matching with a small attribute
 * projection, while normal catalogue requests never load FAQ, alarms, full
 * detail copy, or multi-image relations.
 */
export const getProductCatalogPage = cache(async (
  locale: Locale,
  options: { query?: string; page?: number; categoryKeys?: string[] } = {},
): Promise<{ products: ProductListView[]; currentPage: number; pageCount: number; totalCount: number }> => {
  const query = options.query?.trim().toLowerCase() ?? "";
  const categoryKeys = query ? [] : (options.categoryKeys ?? []);

  if (isDemoMode && !env.DATABASE_URL) {
    const categories = await getCategories(locale);
    const categoryNames = new Map(categories.map((category) => [category.key, category.name]));
    const scoped = getDemoProducts(locale)
      .filter((product) => !categoryKeys.length || categoryKeys.includes(product.categoryKey))
      .map((product) => ({ ...product, categoryName: categoryNames.get(product.categoryKey) ?? product.categoryName, directDefinition: product.directDefinition }))
      .filter((product) => matchesCatalogQuery(product, query));
    const pageCount = Math.max(1, Math.ceil(scoped.length / PRODUCT_CATALOG_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, options.page ?? 1), pageCount);
    const start = (currentPage - 1) * PRODUCT_CATALOG_PAGE_SIZE;
    return { products: scoped.slice(start, start + PRODUCT_CATALOG_PAGE_SIZE), currentPage, pageCount, totalCount: scoped.length };
  }

  const where = {
    status: "PUBLISHED" as const,
    brand: { archivedAt: null, rightsConfirmed: true },
    category: { status: "PUBLISHED" as const, translations: { some: { locale } }, ...(categoryKeys.length ? { key: { in: categoryKeys } } : {}) },
    translations: { some: { locale, published: true } },
  };
  const commonSelect = {
    id: true,
    model: true,
    sku: true,
    primaryImageId: true,
    brand: { select: { name: true, localizedNames: true } },
    category: { select: { key: true, translations: { where: { locale }, select: { name: true } } } },
    translations: { where: { locale, published: true }, select: { slug: true, name: true, shortDescription: true, directDefinition: true } },
  } as const;
  function mapRecord(record: ProductCatalogRecord) {
    const translation = record.translations[0];
    const categoryTranslation = record.category.translations[0];
    if (!translation || !categoryTranslation) return [];
    return [{
      id: record.id,
      slug: translation.slug,
      model: record.model,
      sku: record.sku ?? undefined,
      brand: record.brand.name,
      brandDisplayName: localizedBrandName(record.brand, locale),
      categoryKey: record.category.key,
      categoryName: categoryTranslation.name,
      name: translation.name,
      shortDescription: translation.shortDescription,
      directDefinition: translation.directDefinition,
      attributes: record.attributes?.map((attribute) => catalogAttribute(attribute, locale)),
      primaryImageId: record.primaryImageId,
    }];
  }

  let visible: ReturnType<typeof mapRecord>[number][];
  let totalCount: number;
  let pageCount: number;
  let currentPage: number;
  if (query) {
    const records = await db.product.findMany({
      where,
      select: {
        ...commonSelect,
        attributes: {
          where: { definition: { archivedAt: null } },
          select: {
            textValue: true,
            numberValue: true,
            booleanValue: true,
            unit: true,
            displayLabels: true,
            definition: { select: { key: true, labels: true, standardUnit: true, comparable: true } },
          },
        },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { model: "asc" }],
    }) as ProductCatalogRecord[];
    const matches = records.flatMap(mapRecord).filter((product) => matchesCatalogQuery(product, query));
    totalCount = matches.length;
    pageCount = Math.max(1, Math.ceil(totalCount / PRODUCT_CATALOG_PAGE_SIZE));
    currentPage = Math.min(Math.max(1, options.page ?? 1), pageCount);
    const start = (currentPage - 1) * PRODUCT_CATALOG_PAGE_SIZE;
    visible = matches.slice(start, start + PRODUCT_CATALOG_PAGE_SIZE);
  } else {
    totalCount = await db.product.count({ where });
    pageCount = Math.max(1, Math.ceil(totalCount / PRODUCT_CATALOG_PAGE_SIZE));
    currentPage = Math.min(Math.max(1, options.page ?? 1), pageCount);
    const records = await db.product.findMany({
      where,
      select: commonSelect,
      orderBy: [{ category: { sortOrder: "asc" } }, { model: "asc" }],
      skip: (currentPage - 1) * PRODUCT_CATALOG_PAGE_SIZE,
      take: PRODUCT_CATALOG_PAGE_SIZE,
    }) as ProductCatalogRecord[];
    visible = records.flatMap(mapRecord);
  }
  const media = visible.length ? await db.productMedia.findMany({
    where: { productId: { in: visible.map((product) => product.id) }, asset: { scanStatus: "CLEAN", rightsApproved: true } },
    select: { productId: true, assetId: true, sortOrder: true, alt: true, asset: { select: { storageKey: true, width: true, height: true } } },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  }) : [];
  const mediaByProduct = new Map<string, typeof media>();
  for (const item of media) {
    const items = mediaByProduct.get(item.productId) ?? [];
    items.push(item);
    mediaByProduct.set(item.productId, items);
  }
  const products = visible.map((product) => {
    const candidatesForProduct = mediaByProduct.get(product.id) ?? [];
    const selected = candidatesForProduct.find((item) => item.assetId === product.primaryImageId) ?? candidatesForProduct[0];
    const image = selected?.asset.width && selected.asset.height ? {
      src: `/media/${selected.asset.storageKey}`,
      alt: localizedMediaAlt(selected.alt, locale, product.name),
      width: selected.asset.width,
      height: selected.asset.height,
    } : undefined;
    return {
      id: product.id,
      slug: product.slug,
      model: product.model,
      sku: product.sku,
      brand: product.brand,
      brandDisplayName: product.brandDisplayName,
      categoryKey: product.categoryKey,
      categoryName: product.categoryName,
      name: product.name,
      shortDescription: product.shortDescription,
      image,
    } satisfies ProductListView;
  });
  return { products, currentPage, pageCount, totalCount };
});

function demoProductWithCategory(product: ProductView | undefined, categories: CategoryView[]) {
  if (!product) return undefined;
  const category = categories.find((item) => item.key === product.categoryKey);
  if (!category) return undefined;
  return {
    ...product,
    categoryName: category.name,
    categoryTrail: productCategoryTrail(categories, product.categoryKey),
  } satisfies ProductView;
}

export const getProductBySlug = cache(async (locale: Locale, slug: string): Promise<ProductView | undefined> => {
  const categories = await getCategories(locale);
  if (isDemoMode && !env.DATABASE_URL) {
    return demoProductWithCategory(getDemoProducts(locale).find((product) => product.slug === slug), categories);
  }
  const record = await db.product.findFirst({
    where: {
      ...publishedProductWhere(locale),
      translations: { some: { locale, published: true, slug } },
    },
    include: fullProductInclude(locale),
  });
  return record ? mapFullProduct(record, locale, categories) : undefined;
});

export const getProductById = cache(async (locale: Locale, id: string): Promise<ProductView | undefined> => {
  const categories = await getCategories(locale);
  if (isDemoMode && !env.DATABASE_URL) {
    return demoProductWithCategory(getDemoProducts(locale).find((product) => product.id === id), categories);
  }
  const record = await db.product.findFirst({
    where: { ...publishedProductWhere(locale), id },
    include: fullProductInclude(locale),
  });
  return record ? mapFullProduct(record, locale, categories) : undefined;
});

export const getProductAlternatePaths = cache(async (productId: string): Promise<Partial<Record<Locale, string>>> => {
  if (isDemoMode && !env.DATABASE_URL) {
    return Object.fromEntries(locales.flatMap((locale) => {
      const product = getDemoProducts(locale).find((item) => item.id === productId);
      return product ? [[locale, `/products/${product.slug}`]] : [];
    }));
  }
  const translations = await db.productTranslation.findMany({
    where: {
      productId,
      published: true,
      product: {
        status: "PUBLISHED",
        brand: { archivedAt: null, rightsConfirmed: true },
        category: { status: "PUBLISHED" },
      },
    },
    select: { locale: true, slug: true },
  });
  return Object.fromEntries(translations.map(({ locale, slug }) => [locale, `/products/${slug}`]));
});

function recommendationProductSelect(locale: Locale) {
  return {
    id: true,
    model: true,
    sku: true,
    primaryImageId: true,
    brand: { select: { name: true, localizedNames: true } },
    category: { select: { key: true, translations: { where: { locale }, select: { name: true } } } },
    translations: { where: { locale, published: true }, select: { slug: true, name: true, shortDescription: true } },
  } satisfies Prisma.ProductSelect;
}

type RecommendationProductRecord = Prisma.ProductGetPayload<{ select: ReturnType<typeof recommendationProductSelect> }>;

/**
 * Keeps the established recommendation order while limiting database work to
 * four card-sized records instead of loading every full product detail.
 */
export const getProductRecommendations = cache(async (locale: Locale, product: ProductView, limit = 4): Promise<ProductListView[]> => {
  const safeLimit = Math.max(0, Math.min(4, Math.trunc(limit)));
  if (!safeLimit) return [];

  if (isDemoMode && !env.DATABASE_URL) {
    return getDemoProducts(locale)
      .filter((item) => item.id !== product.id)
      .sort((left, right) => {
        const leftSameBrand = left.brand === product.brand ? 1 : 0;
        const rightSameBrand = right.brand === product.brand ? 1 : 0;
        if (rightSameBrand !== leftSameBrand) return rightSameBrand - leftSameBrand;
        return Number(right.categoryKey === product.categoryKey) - Number(left.categoryKey === product.categoryKey);
      })
      .slice(0, safeLimit);
  }

  const brandCondition: Prisma.ProductWhereInput = product.brandId
    ? { brandId: product.brandId }
    : { brand: { name: product.brand } };
  const otherBrandCondition: Prisma.ProductWhereInput = product.brandId
    ? { brandId: { not: product.brandId } }
    : { brand: { name: { not: product.brand } } };
  const groups: Prisma.ProductWhereInput[] = [
    { ...brandCondition, category: { key: product.categoryKey } },
    { ...brandCondition, category: { key: { not: product.categoryKey } } },
    { ...otherBrandCondition, category: { key: product.categoryKey } },
    { ...otherBrandCondition, category: { key: { not: product.categoryKey } } },
  ];
  const records: RecommendationProductRecord[] = [];
  for (const group of groups) {
    const remaining = safeLimit - records.length;
    if (!remaining) break;
    const matches = await db.product.findMany({
      where: { AND: [publishedProductWhere(locale), { id: { not: product.id } }, group] },
      select: recommendationProductSelect(locale),
      orderBy: [{ category: { sortOrder: "asc" } }, { model: "asc" }],
      take: remaining,
    });
    records.push(...matches);
  }

  const media = records.length ? await db.productMedia.findMany({
    where: { productId: { in: records.map((record) => record.id) }, asset: { scanStatus: "CLEAN", rightsApproved: true } },
    select: { productId: true, assetId: true, sortOrder: true, alt: true, asset: { select: { storageKey: true, width: true, height: true } } },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
  }) : [];
  const mediaByProduct = new Map<string, typeof media>();
  for (const item of media) {
    const items = mediaByProduct.get(item.productId) ?? [];
    items.push(item);
    mediaByProduct.set(item.productId, items);
  }

  return records.flatMap((record) => {
    const translation = record.translations[0];
    const categoryTranslation = record.category.translations[0];
    if (!translation || !categoryTranslation) return [];
    const candidates = mediaByProduct.get(record.id) ?? [];
    const selectedImage = candidates.find((item) => item.assetId === record.primaryImageId) ?? candidates[0];
    const image = selectedImage?.asset.width && selectedImage.asset.height ? {
      src: `/media/${selectedImage.asset.storageKey}`,
      alt: localizedMediaAlt(selectedImage.alt, locale, translation.name),
      width: selectedImage.asset.width,
      height: selectedImage.asset.height,
    } : undefined;
    return [{
      id: record.id,
      slug: translation.slug,
      model: record.model,
      sku: record.sku ?? undefined,
      brand: record.brand.name,
      brandDisplayName: localizedBrandName(record.brand, locale),
      categoryKey: record.category.key,
      categoryName: categoryTranslation.name,
      name: translation.name,
      shortDescription: translation.shortDescription,
      image,
    } satisfies ProductListView];
  });
});

function bodyParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return editorialRichTextToPlainText(value);
}

function editorialBody(value: unknown, title: string) {
  const sanitized = sanitizeEditorialRichText(value);
  if (!sanitized) return { body: bodyParagraphs(value) };
  const plainText = editorialRichTextToPlainText(sanitized);
  const parsedBody = isMarkdownLike(plainText.join("\n\n")) ? markdownToEditorialRichText(plainText.join("\n\n")) : sanitized;
  const parsedText = editorialRichTextToPlainText(parsedBody);
  const duplicateTitle = parsedText[0]?.replace(/^\*\*|\*\*$/g, "").trim() === title.trim();
  const richBody = duplicateTitle ? { ...parsedBody, content: parsedBody.content.slice(1) } : parsedBody;
  return { body: editorialRichTextToPlainText(richBody), richBody };
}

export const getEditorial = cache(async (locale: Locale, type: "solutions" | "industries" | "cases" | "news"): Promise<EditorialItem[]> => {
  if (isDemoMode) return getDemoEditorial(locale, type);
  if (type === "solutions") {
    const items = await db.solutionTranslation.findMany({ where: { locale, published: true, solution: { status: "PUBLISHED" } }, include: { solution: true }, orderBy: { solution: { sortOrder: "asc" } } });
    return items.map((item) => ({ id: item.solutionId, slug: item.slug, title: item.title, summary: item.summary, ...editorialBody(item.body, item.title), updatedAt: item.solution.updatedAt.toISOString(), seoTitle: item.seoTitle, seoDescription: item.seoDescription }));
  }
  if (type === "industries") {
    const items = await db.industryTranslation.findMany({ where: { locale, published: true, industry: { status: "PUBLISHED" } }, include: { industry: true }, orderBy: { industry: { sortOrder: "asc" } } });
    return items.map((item) => ({ id: item.industryId, slug: item.slug, title: item.title, summary: item.summary, ...editorialBody(item.body, item.title), updatedAt: item.industry.updatedAt.toISOString(), seoTitle: item.seoTitle, seoDescription: item.seoDescription }));
  }
  if (type === "cases") {
    const items = await db.caseStudyTranslation.findMany({ where: { locale, published: true, caseStudy: { status: "PUBLISHED" } }, include: { caseStudy: true }, orderBy: { caseStudy: { publishedAt: "desc" } } });
    return items.map((item) => ({ id: item.caseStudyId, slug: item.slug, title: item.title, summary: item.summary, ...editorialBody(item.body, item.title), updatedAt: item.caseStudy.updatedAt.toISOString(), seoTitle: item.seoTitle, seoDescription: item.seoDescription }));
  }
  const items = await db.newsArticleTranslation.findMany({
    where: { locale, published: true, article: { status: "PUBLISHED" } },
    include: { article: { include: { coverImage: true } } },
    orderBy: { article: { publishedAt: "desc" } },
  });
  return items.map((item) => {
    const cover = item.article.coverImage;
    const coverImage = cover?.kind === "IMAGE" && cover.scanStatus === "CLEAN" && cover.rightsApproved && cover.width && cover.height
      ? { src: `/media/${cover.storageKey}`, alt: item.imageAlt.trim() || item.title, width: cover.width, height: cover.height }
      : undefined;
    return { id: item.articleId, slug: item.slug, title: item.title, summary: item.summary, ...editorialBody(item.body, item.title), updatedAt: item.article.updatedAt.toISOString(), publishedAt: item.article.publishedAt?.toISOString(), authorName: item.article.authorName, seoTitle: item.seoTitle, seoDescription: item.seoDescription, coverImage, newsCategory: item.article.category };
  });
});

export const getEditorialAlternatePaths = cache(async (type: "solutions" | "industries" | "cases" | "news", entityId: string, customBasePath?: string): Promise<Partial<Record<Locale, string>>> => {
  const collections = await Promise.all(locales.map(async (locale) => ({ locale, item: (await getEditorial(locale, type)).find((entry) => entry.id === entityId) })));
  const basePath = customBasePath ?? (type === "solutions" ? "/solutions" : type === "industries" ? "/industries" : type === "cases" ? "/cases" : "/news");
  return Object.fromEntries(collections.flatMap(({ locale, item }) => item ? [[locale, `${basePath}/${item.slug}`]] : []));
});

export const getCategoryAlternatePaths = cache(async (categoryId: string): Promise<Partial<Record<Locale, string>>> => {
  const collections = await Promise.all(locales.map(async (locale) => ({ locale, category: (await getCategories(locale)).find((item) => item.id === categoryId) })));
  return Object.fromEntries(collections.flatMap(({ locale, category }) => category ? [[locale, `/products/category/${category.path}`]] : []));
});

export const getSlugRedirect = cache(async (locale: Locale, fromPath: string) => {
  if (isDemoMode && !env.DATABASE_URL) return undefined;
  const entry = await db.slugRedirect.findUnique({ where: { locale_fromPath: { locale, fromPath } } });
  return entry?.toPath;
});
