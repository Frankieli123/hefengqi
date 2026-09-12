"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { purgeEdgeOne } from "@/lib/edgeone";
import { env } from "@/lib/env";
import { validateProductForPublication } from "@/lib/publication";
import { applyImportedRecordToProduct } from "@/lib/imported-records";
import { parseHomeHeroFormData } from "@/lib/home-hero-schema";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { saveCategory } from "@/app/admin/category-actions";
import { categoryErrorMessage, setManagedCategoryStatus } from "@/lib/category-management";
import { createStoredAiApiKey } from "@/lib/api-auth";

const editorialTypeSchema = z.enum(["solutions", "industries", "cases", "news"]);
const editorialStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const newsCategorySchema = z.enum(["INDUSTRY_INSIGHTS", "BUYING_GUIDE", "TUTORIAL_GUIDE"]);
const managedLocales = ["zh", "en", "ru"] as const;
type EditorialType = z.infer<typeof editorialTypeSchema>;

function hasRichText(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const node = value as { text?: unknown; content?: unknown[] };
  if (typeof node.text === "string" && node.text.trim()) return true;
  return node.content?.some(hasRichText) ?? false;
}

function parseRichText(value: FormDataEntryValue | null): Prisma.InputJsonValue {
  const raw = z.string().min(2).parse(value);
  const parsed: unknown = JSON.parse(raw);
  const body = z.record(z.string(), z.unknown()).parse(parsed);
  if (!hasRichText(body)) throw new Error("EDITORIAL_BODY_EMPTY");
  return body as Prisma.InputJsonValue;
}

function parseEditorialTranslations(formData: FormData) {
  return managedLocales.map((locale) => {
    const title = z.string().trim().min(2).max(160).parse(formData.get(`${locale}Title`));
    const slug = z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/).parse(formData.get(`${locale}Slug`));
    const summary = z.string().trim().min(20).max(500).parse(formData.get(`${locale}Summary`));
    const seoTitleValue = formData.get(`${locale}SeoTitle`);
    const seoDescriptionValue = formData.get(`${locale}SeoDescription`);
    return {
      locale,
      slug,
      title,
      summary,
      body: parseRichText(formData.get(`${locale}Body`)),
      seoTitle: typeof seoTitleValue === "string" && seoTitleValue.trim() ? z.string().trim().max(120).parse(seoTitleValue) : title,
      seoDescription: typeof seoDescriptionValue === "string" && seoDescriptionValue.trim() ? z.string().trim().max(180).parse(seoDescriptionValue) : summary.slice(0, 180),
      published: false,
    };
  });
}

function editorialBasePath(type: EditorialType) {
  return type === "solutions" ? "/solutions" : type === "industries" ? "/industries" : type === "cases" ? "/cases" : "/news";
}

async function recordSlugRedirect(tx: Prisma.TransactionClient, locale: typeof managedLocales[number], fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  await tx.slugRedirect.updateMany({ where: { locale, toPath: fromPath }, data: { toPath } });
  await tx.slugRedirect.upsert({
    where: { locale_fromPath: { locale, fromPath } },
    update: { toPath },
    create: { locale, fromPath, toPath },
  });
}

export async function changeProductStatus(formData: FormData) {
  const input = z.object({ productId: z.string().min(1), status: z.enum(["DRAFT", "READY", "PUBLISHED", "ARCHIVED"]) }).parse(Object.fromEntries(formData));
  const session = await requireSecureAdmin(input.status === "PUBLISHED" || input.status === "ARCHIVED" ? "ADMIN" : undefined);
  if (input.status === "PUBLISHED") { const errors = await validateProductForPublication(input.productId); if (errors.length) redirect(`/admin/products?error=${encodeURIComponent(errors.join("；"))}`); }
  const product = await db.product.update({ where: { id: input.productId }, data: { status: input.status, publishedAt: input.status === "PUBLISHED" ? new Date() : undefined, translations: input.status === "PUBLISHED" ? { updateMany: { where: {}, data: { published: true } } } : undefined }, include: { translations: true } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: `PRODUCT_${input.status}`, entityType: "Product", entityId: product.id } });
  const urls = product.translations.map((item) => `${env.SITE_URL}/${item.locale}/products/${item.slug}`);
  await purgeEdgeOne(urls); revalidatePath("/", "layout"); redirect("/admin/products?success=1");
}

export async function createManualProduct(formData: FormData) {
  const session = await requireSecureAdmin();
  const schema = z.object({ model: z.string().trim().min(1).max(100), sku: z.string().trim().max(100).optional(), brandId: z.string().min(1), categoryId: z.string().min(1), zhName: z.string().trim().min(2), enName: z.string().trim().min(2), ruName: z.string().trim().min(2), zhDefinition: z.string().trim().min(40), enDefinition: z.string().trim().min(40), ruDefinition: z.string().trim().min(40) });
  const input = schema.parse(Object.fromEntries(formData));
  const [brand, category] = await Promise.all([
    db.brand.findFirst({ where: { id: input.brandId, archivedAt: null }, select: { id: true } }),
    db.category.findFirst({ where: { id: input.categoryId, status: { not: "ARCHIVED" } }, select: { id: true } }),
  ]);
  if (!brand || !category) redirect("/admin/products/new?error=inactive-taxonomy");
  const normalizedId = `${input.brandId}:${input.model}`.toLowerCase().replaceAll(/[^a-z0-9:._-]/g, "-");
  const definitions = { zh: [input.zhName, input.zhDefinition], en: [input.enName, input.enDefinition], ru: [input.ruName, input.ruDefinition] } as const;
  const product = await db.product.create({ data: { normalizedId, sku: input.sku || null, model: input.model, brandId: input.brandId, categoryId: input.categoryId, status: "DRAFT", origin: "MANUAL", translations: { create: Object.entries(definitions).map(([locale, [name, definition]]) => ({ locale: locale as "zh" | "en" | "ru", slug: `${input.model}-${locale}`.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-"), name, directDefinition: definition, shortDescription: definition, whatItIs: definition, problemSolved: definition, suitableFor: definition, advantages: [], applications: [], seoTitle: name, seoDescription: definition.slice(0, 155) })) } } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "PRODUCT_CREATE", entityType: "Product", entityId: product.id } }); redirect(`/admin/products/${product.id}`);
}

export async function createBrand(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/), website: z.string().trim().optional() }).parse(Object.fromEntries(formData));
  const website = input.website ? z.url().parse(input.website) : null;
  const brand = await db.brand.create({ data: { name: input.name, slug: input.slug, website, rightsConfirmed: formData.get("rightsConfirmed") === "on" } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "BRAND_CREATE", entityType: "Brand", entityId: brand.id } });
  revalidatePath("/admin/taxonomy"); redirect("/admin/taxonomy?created=brand");
}

export async function updateBrandRights(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN"); const brandId = z.string().min(1).parse(formData.get("brandId"));
  if (formData.get("rightsConfirmed") !== "on") {
    const publishedProducts = await db.product.count({ where: { brandId, status: "PUBLISHED" } });
    if (publishedProducts) redirect("/admin/taxonomy?error=brand-has-published-products");
  }
  const brand = await db.brand.update({ where: { id: brandId }, data: { rightsConfirmed: formData.get("rightsConfirmed") === "on" } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "BRAND_RIGHTS_UPDATE", entityType: "Brand", entityId: brand.id, details: { rightsConfirmed: brand.rightsConfirmed } } });
  revalidatePath("/admin/taxonomy");
}

export async function updateBrand(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({
    brandId: z.string().min(1),
    name: z.string().trim().min(2).max(100),
    slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/),
    website: z.string().trim().optional(),
  }).parse(Object.fromEntries(formData));
  const website = input.website ? z.url().parse(input.website) : null;
  const brand = await db.brand.update({
    where: { id: input.brandId },
    data: { name: input.name, slug: input.slug, website, rightsConfirmed: formData.get("rightsConfirmed") === "on" },
  });
  await db.auditLog.create({
    data: { actorId: session.user.id, actorType: "USER", action: "BRAND_UPDATE", entityType: "Brand", entityId: brand.id },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/taxonomy/brand/${brand.id}?saved=1`);
}

export async function changeBrandArchiveState(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ brandId: z.string().min(1), action: z.enum(["archive", "restore"]) }).parse(Object.fromEntries(formData));
  if (input.action === "archive") {
    const publishedProducts = await db.product.count({ where: { brandId: input.brandId, status: "PUBLISHED" } });
    if (publishedProducts) redirect(`/admin/taxonomy/brand/${input.brandId}?error=brand-has-published-products`);
  }
  await db.$transaction([
    db.brand.update({ where: { id: input.brandId }, data: { archivedAt: input.action === "archive" ? new Date() : null } }),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: `BRAND_${input.action.toUpperCase()}`, entityType: "Brand", entityId: input.brandId } }),
  ]);
  revalidatePath("/admin/taxonomy");
  redirect(`/admin/taxonomy/brand/${input.brandId}?saved=1`);
}

export async function createCategory(formData: FormData) {
  const result = await saveCategory({}, formData);
  redirect(`/admin/categories?error=${encodeURIComponent(result.error ?? "无法保存分类")}`);
}

export async function updateCategory(formData: FormData) {
  const result = await saveCategory({}, formData);
  redirect(`/admin/categories?error=${encodeURIComponent(result.error ?? "无法保存分类")}`);
}

export async function changeCategoryStatus(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  try {
    const input = z.object({ categoryId: z.string().min(1), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) }).parse(Object.fromEntries(formData));
    await setManagedCategoryStatus(input.categoryId, input.status, session.user.id);
  } catch (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(categoryErrorMessage(error))}`);
  }
  revalidatePath("/", "layout");
  redirect("/admin/categories?updated=1");
}

export async function createAttributeDefinition(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ categoryId: z.string().min(1), key: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]*$/), type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT"]), standardUnit: z.string().trim().max(30).optional(), zhLabel: z.string().trim().min(1), enLabel: z.string().trim().min(1), ruLabel: z.string().trim().min(1), options: z.string().optional() }).parse(Object.fromEntries(formData));
  const options = input.type === "SELECT" ? input.options?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [] : undefined;
  if (input.type === "SELECT" && !options?.length) redirect("/admin/taxonomy?error=options-required");
  const category = await db.category.findFirst({ where: { id: input.categoryId, status: { not: "ARCHIVED" } }, select: { id: true } });
  if (!category) redirect("/admin/taxonomy?error=inactive-category");
  const definition = await db.attributeDefinition.create({ data: { categoryId: input.categoryId, key: input.key, type: input.type, standardUnit: input.standardUnit || null, required: formData.get("required") === "on", filterable: formData.get("filterable") === "on", comparable: formData.get("comparable") === "on", labels: { zh: input.zhLabel, en: input.enLabel, ru: input.ruLabel }, options } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "ATTRIBUTE_DEFINITION_CREATE", entityType: "AttributeDefinition", entityId: definition.id } });
  revalidatePath("/admin/taxonomy"); redirect("/admin/taxonomy?created=attribute");
}

export async function updateAttributeDefinition(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({
    definitionId: z.string().min(1), key: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]*$/),
    standardUnit: z.string().trim().max(30).optional(), sortOrder: z.coerce.number().int().min(0).max(10000),
    zhLabel: z.string().trim().min(1), enLabel: z.string().trim().min(1), ruLabel: z.string().trim().min(1), options: z.string().optional(),
  }).parse(Object.fromEntries(formData));
  const existing = await db.attributeDefinition.findUnique({ where: { id: input.definitionId } });
  if (!existing) redirect("/admin/taxonomy?error=attribute-not-found");
  const options = existing.type === "SELECT" ? input.options?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [] : undefined;
  if (existing.type === "SELECT" && !options?.length) redirect(`/admin/taxonomy/attribute/${input.definitionId}?error=options-required`);
  await db.$transaction([
    db.attributeDefinition.update({ where: { id: input.definitionId }, data: { key: input.key, standardUnit: input.standardUnit || null, sortOrder: input.sortOrder, required: formData.get("required") === "on", filterable: formData.get("filterable") === "on", comparable: formData.get("comparable") === "on", labels: { zh: input.zhLabel, en: input.enLabel, ru: input.ruLabel }, options } }),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "ATTRIBUTE_DEFINITION_UPDATE", entityType: "AttributeDefinition", entityId: input.definitionId } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/admin/taxonomy/attribute/${input.definitionId}?saved=1`);
}

export async function changeAttributeArchiveState(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ definitionId: z.string().min(1), action: z.enum(["archive", "restore"]) }).parse(Object.fromEntries(formData));
  if (input.action === "archive") {
    const publishedValues = await db.productAttribute.count({ where: { definitionId: input.definitionId, product: { status: "PUBLISHED" } } });
    if (publishedValues) redirect(`/admin/taxonomy/attribute/${input.definitionId}?error=attribute-used-by-published-products`);
  }
  await db.$transaction([
    db.attributeDefinition.update({ where: { id: input.definitionId }, data: { archivedAt: input.action === "archive" ? new Date() : null } }),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: `ATTRIBUTE_DEFINITION_${input.action.toUpperCase()}`, entityType: "AttributeDefinition", entityId: input.definitionId } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/admin/taxonomy/attribute/${input.definitionId}?saved=1`);
}

export async function saveProductAttribute(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({ productId: z.string().min(1), definitionId: z.string().min(1), value: z.string().trim().min(1).max(1000), unit: z.string().trim().max(30).optional() }).parse(Object.fromEntries(formData));
  const [definition, product] = await Promise.all([
    db.attributeDefinition.findFirst({ where: { id: input.definitionId, archivedAt: null } }),
    db.product.findUnique({ where: { id: input.productId }, select: { categoryId: true } }),
  ]);
  if (!definition || !product || definition.categoryId !== product.categoryId) redirect(`/admin/products/${input.productId}?error=attribute-not-found`);
  let values: { textValue: string | null; numberValue: string | null; booleanValue: boolean | null };
  if (definition.type === "NUMBER") {
    if (!/^-?\d+(?:\.\d+)?$/.test(input.value)) redirect(`/admin/products/${input.productId}?error=number-required`);
    values = { textValue: null, numberValue: input.value, booleanValue: null };
  } else if (definition.type === "BOOLEAN") {
    if (input.value !== "true" && input.value !== "false") redirect(`/admin/products/${input.productId}?error=boolean-required`);
    values = { textValue: null, numberValue: null, booleanValue: input.value === "true" };
  } else {
    if (definition.type === "SELECT") { const options = Array.isArray(definition.options) ? definition.options : []; if (!options.includes(input.value)) redirect(`/admin/products/${input.productId}?error=option-invalid`); }
    values = { textValue: input.value, numberValue: null, booleanValue: null };
  }
  await db.$transaction([
    db.productAttribute.upsert({ where: { productId_definitionId: { productId: input.productId, definitionId: input.definitionId } }, update: { ...values, unit: input.unit || null, origin: "MANUAL", locked: true, confidence: 1 }, create: { productId: input.productId, definitionId: input.definitionId, ...values, unit: input.unit || null, origin: "MANUAL", locked: true, confidence: 1 } }),
    db.product.update({ where: { id: input.productId }, data: { contentUpdatedAt: new Date() } }),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "PRODUCT_ATTRIBUTE_UPDATE", entityType: "Product", entityId: input.productId, details: { definitionId: input.definitionId } } }),
  ]);
  const productAfter = await db.product.findUnique({ where: { id: input.productId }, include: { translations: true } });
  if (productAfter?.status === "PUBLISHED") {
    const urls = productAfter.translations.map((item) => `${env.SITE_URL}/${item.locale}/products/${item.slug}`);
    await purgeEdgeOne(urls);
  }
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${input.productId}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/${input.productId}?saved=attribute`);
}

export async function saveProductFeaturedAttributes(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({
    productId: z.string().min(1),
    locale: z.enum(["zh", "en", "ru"]),
  }).parse(Object.fromEntries(formData));
  const selectedIds = z.array(z.string().min(1)).max(6).parse(formData.getAll("featuredAttributeId"));
  const attributes = await db.productAttribute.findMany({
    where: { productId: input.productId },
    include: { definition: { select: { labels: true } } },
    orderBy: { definition: { sortOrder: "asc" } },
  });
  const availableIds = new Set(attributes.map((attribute) => attribute.id));
  if (selectedIds.some((id) => !availableIds.has(id))) redirect(`/admin/products/${input.productId}?error=featured-attribute-invalid`);
  const selectedOrder = new Map(selectedIds.map((id, index) => [id, index]));

  await db.$transaction(async (tx) => {
    for (const attribute of attributes) {
      const rawLabel = formData.get(`displayLabel-${attribute.id}`);
      const displayLabel = typeof rawLabel === "string" ? z.string().trim().max(80).parse(rawLabel) : "";
      const labels = attribute.displayLabels && typeof attribute.displayLabels === "object" && !Array.isArray(attribute.displayLabels)
        ? { ...(attribute.displayLabels as Record<string, string>) }
        : {};
      if (displayLabel) labels[input.locale] = displayLabel;
      else delete labels[input.locale];
      const featureOrder = selectedOrder.get(attribute.id);
      await tx.productAttribute.update({
        where: { id: attribute.id },
        data: {
          featured: featureOrder !== undefined,
          featureOrder: featureOrder ?? null,
          displayLabels: Object.keys(labels).length ? labels : Prisma.JsonNull,
        },
      });
    }
    await tx.product.update({ where: { id: input.productId }, data: { contentUpdatedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "PRODUCT_FEATURED_ATTRIBUTES_UPDATE", entityType: "Product", entityId: input.productId, details: { locale: input.locale, attributeIds: selectedIds } } });
  });
  revalidatePath(`/admin/products/${input.productId}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/${input.productId}?locale=${input.locale}&saved=featured-attributes`);
}

export async function setProductPrimaryImage(productId: string, assetId: string) {
  const session = await requireSecureAdmin("ADMIN");
  const mediaLink = await db.productMedia.findUnique({
    where: { productId_assetId: { productId, assetId } },
    include: { asset: { select: { kind: true, originalName: true } } },
  });
  if (!mediaLink) return { ok: false, error: "素材未关联到此产品" };
  if (mediaLink.asset.kind !== "IMAGE") return { ok: false, error: "主图素材必须为图片" };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { translations: true },
  });
  if (!product) return { ok: false, error: "产品不存在" };

  await db.$transaction([
    db.product.update({
      where: { id: productId },
      data: { primaryImageId: assetId, contentUpdatedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        actorType: "USER",
        action: "PRODUCT_PRIMARY_IMAGE_UPDATE",
        entityType: "Product",
        entityId: productId,
        details: { assetId, setPrimary: true },
      },
    }),
  ]);

  if (product.status === "PUBLISHED") {
    const urls = product.translations.map((item) => `${env.SITE_URL}/${item.locale}/products/${item.slug}`);
    await purgeEdgeOne(urls);
  }

  // Do NOT revalidate /admin/products here to avoid Next.js App Router scroll reset / page jump
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return { ok: true, productId, assetId, assetName: mediaLink.asset.originalName };
}

export async function reviewProductMedia(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ productId: z.string().min(1), assetId: z.string().min(1) }).parse(Object.fromEntries(formData));
  const setPrimary = formData.get("setPrimary") === "on";
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" && rawReturnTo.startsWith("/admin/") ? rawReturnTo : undefined;
  const redirectTarget = (param: string) => {
    if (returnTo) return `${returnTo}${returnTo.includes("?") ? "&" : "?"}${param}`;
    return `/admin/products/${input.productId}?${param}`;
  };

  const mediaLink = await db.productMedia.findUnique({ where: { productId_assetId: { productId: input.productId, assetId: input.assetId } }, include: { asset: { select: { kind: true } } } });
  if (!mediaLink) redirect(redirectTarget("error=media-not-attached"));
  if (setPrimary && mediaLink.asset.kind !== "IMAGE") redirect(redirectTarget("error=primary-image-required"));

  const product = await db.product.findUnique({
    where: { id: input.productId },
    include: { translations: true },
  });

  await db.$transaction([
    ...(setPrimary ? [db.product.update({ where: { id: input.productId }, data: { primaryImageId: input.assetId, contentUpdatedAt: new Date() } })] : []),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "PRODUCT_PRIMARY_IMAGE_UPDATE", entityType: "Product", entityId: input.productId, details: { assetId: input.assetId, setPrimary } } }),
  ]);

  if (product?.status === "PUBLISHED") {
    const urls = product.translations.map((item) => `${env.SITE_URL}/${item.locale}/products/${item.slug}`);
    await purgeEdgeOne(urls);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${input.productId}`);
  revalidatePath("/", "layout");
  redirect(redirectTarget("saved=media"));
}

export async function reviewMediaAsset(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({
    assetId: z.string().min(1),
    rightsNote: z.string().trim().max(500).optional(),
    sourceUrl: z.string().trim().max(1000).optional(),
  }).parse(Object.fromEntries(formData));
  const rightsApproved = formData.get("rightsApproved") === "on";
  if (rightsApproved && (!input.rightsNote || input.rightsNote.length < 4)) redirect("/admin/media?error=rights-note-required");
  let sourceUrl: string | null = null;
  if (input.sourceUrl) {
    const parsed = z.url().safeParse(input.sourceUrl);
    if (!parsed.success || new URL(parsed.data).protocol !== "https:") redirect("/admin/media?error=source-url-invalid");
    sourceUrl = parsed.data;
  }
  const asset = await db.mediaAsset.findFirst({ where: { id: input.assetId, kind: "IMAGE", scanStatus: "CLEAN" }, select: { id: true } });
  if (!asset) redirect("/admin/media?error=asset-not-clean");
  await db.$transaction([
    db.mediaAsset.update({ where: { id: asset.id }, data: { rightsApproved, rightsNote: input.rightsNote || null, sourceUrl } }),
    db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "MEDIA_RIGHTS_REVIEW", entityType: "MediaAsset", entityId: asset.id, details: { rightsApproved, rightsNote: input.rightsNote || null, sourceUrl } } }),
  ]);
  revalidatePath("/admin/media");
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  redirect("/admin/media?saved=1");
}

export async function saveHomeHeroSlides(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const parsed = parseHomeHeroFormData(formData);
  if (!parsed.success) redirect("/admin/settings?error=hero-invalid");
  const slides = parsed.data;
  const assetIds = [...new Set(slides.flatMap((slide) => [slide.desktopAssetId, slide.mobileAssetId]).filter(Boolean))];
  const assets = await db.mediaAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, kind: true, scanStatus: true, rightsApproved: true } });
  const approvedAssets = new Set(assets.filter((asset) => asset.kind === "IMAGE" && asset.scanStatus === "CLEAN" && asset.rightsApproved).map((asset) => asset.id));
  if (assetIds.some((id) => !approvedAssets.has(id))) redirect("/admin/settings?error=hero-media-not-approved");

  await db.$transaction(async (tx) => {
    for (const input of slides) {
      const slide = await tx.homeHeroSlide.upsert({
        where: { key: input.key },
        update: {
          enabled: input.enabled,
          sortOrder: input.sortOrder,
          desktopAssetId: input.desktopAssetId || null,
          mobileAssetId: input.mobileAssetId || null,
          desktopFocusX: input.desktopFocusX,
          desktopFocusY: input.desktopFocusY,
          mobileFocusX: input.mobileFocusX,
          mobileFocusY: input.mobileFocusY,
        },
        create: {
          key: input.key,
          enabled: input.enabled,
          sortOrder: input.sortOrder,
          desktopAssetId: input.desktopAssetId || null,
          mobileAssetId: input.mobileAssetId || null,
          desktopFocusX: input.desktopFocusX,
          desktopFocusY: input.desktopFocusY,
          mobileFocusX: input.mobileFocusX,
          mobileFocusY: input.mobileFocusY,
        },
      });
      for (const translation of input.translations) {
        await tx.homeHeroSlideTranslation.upsert({
          where: { slideId_locale: { slideId: slide.id, locale: translation.locale } },
          update: {
            eyebrow: translation.eyebrow,
            title: translation.title,
            summary: translation.summary,
            primaryLabel: translation.primaryLabel,
            primaryHref: translation.primaryHref,
            secondaryLabel: translation.secondaryLabel || null,
            secondaryHref: translation.secondaryHref || null,
            imageAlt: translation.imageAlt,
          },
          create: {
            slideId: slide.id,
            locale: translation.locale,
            eyebrow: translation.eyebrow,
            title: translation.title,
            summary: translation.summary,
            primaryLabel: translation.primaryLabel,
            primaryHref: translation.primaryHref,
            secondaryLabel: translation.secondaryLabel || null,
            secondaryHref: translation.secondaryHref || null,
            imageAlt: translation.imageAlt,
          },
        });
      }
    }
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "HOME_HERO_UPDATE", entityType: "HomeHeroSlide", details: { slides: slides.map(({ key, enabled, sortOrder, desktopAssetId, mobileAssetId }) => ({ key, enabled, sortOrder, desktopAssetId, mobileAssetId })) } } });
  });
  revalidatePath("/admin/settings");
  for (const locale of managedLocales) revalidatePath(`/${locale}`);
  redirect("/admin/settings?hero=saved");
}

export async function applyImportedRecord(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({ recordId: z.string().min(1), productId: z.string().min(1) }).parse(Object.fromEntries(formData));
  const result = await applyImportedRecordToProduct(input.recordId, input.productId, session.user.id);
  revalidatePath("/admin/imports"); revalidatePath(`/admin/products/${input.productId}`);
  const resultCode = result.published ? "published" : result.applied.length ? "applied" : "no-match";
  redirect(`/admin/imports?result=${resultCode}`);
}

export async function updateCrawlSource(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const sourceId = z.string().min(1).parse(formData.get("sourceId"));
  const source = await db.crawlSource.update({ where: { id: sourceId }, data: { enabled: formData.get("enabled") === "on", autoPublish: formData.get("autoPublish") === "on" } });
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "CRAWL_SOURCE_UPDATE", entityType: "CrawlSource", entityId: source.id, details: { enabled: source.enabled, autoPublish: source.autoPublish } } });
  revalidatePath("/admin/imports");
}

export async function updateProductContent(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({ productId: z.string().min(1), locale: z.enum(["zh", "en", "ru"]), name: z.string().trim().min(2), slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/), directDefinition: z.string().trim().min(40), shortDescription: z.string().trim().min(20), whatItIs: z.string().trim().min(20), problemSolved: z.string().trim().min(20), suitableFor: z.string().trim().min(20), advantages: z.string(), applications: z.string(), seoTitle: z.string().trim().min(5).max(120), seoDescription: z.string().trim().min(20).max(180), sourceNote: z.string().trim().max(500).optional() }).parse(Object.fromEntries(formData));
  const existing = await db.product.findUnique({ where: { id: input.productId }, include: { translations: true, attributes: true } }); if (!existing) redirect("/admin/products?error=not-found");
  const existingTranslation = existing.translations.find((item) => item.locale === input.locale);
  if (!existingTranslation) redirect("/admin/products?error=translation-not-found");
  const version = await db.contentRevision.count({ where: { entityType: "Product", entityId: input.productId } }) + 1;
  const snapshot = JSON.parse(JSON.stringify(existing));

  let publishedDirectly = false;
  await db.$transaction(async (tx) => {
    await tx.contentRevision.create({ data: { entityType: "Product", entityId: input.productId, version, snapshot, origin: "MANUAL", actorId: session.user.id } });
    await tx.productTranslation.update({ where: { productId_locale: { productId: input.productId, locale: input.locale } }, data: { name: input.name, slug: input.slug, directDefinition: input.directDefinition, shortDescription: input.shortDescription, whatItIs: input.whatItIs, problemSolved: input.problemSolved, suitableFor: input.suitableFor, advantages: input.advantages.split("\n").map((item) => item.trim()).filter(Boolean), applications: input.applications.split("\n").map((item) => item.trim()).filter(Boolean), seoTitle: input.seoTitle, seoDescription: input.seoDescription, sourceNote: input.sourceNote || null, published: true } });

    // Directly publish upon editing if valid or already published
    const gateErrors = await validateProductForPublication(input.productId, tx);
    const shouldPublish = gateErrors.length === 0 || existing.status === "PUBLISHED";
    publishedDirectly = shouldPublish;
    const nextStatus = shouldPublish ? "PUBLISHED" : "DRAFT";

    await tx.product.update({
      where: { id: input.productId },
      data: {
        status: nextStatus,
        publishedAt: shouldPublish ? (existing.publishedAt ?? new Date()) : undefined,
        contentUpdatedAt: new Date(),
        translations: shouldPublish ? { updateMany: { where: {}, data: { published: true } } } : undefined,
      },
    });

    await recordSlugRedirect(tx, input.locale, `/products/${existingTranslation.slug}`, `/products/${input.slug}`);
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: shouldPublish ? "PRODUCT_PUBLISHED" : "PRODUCT_TRANSLATION_UPDATE", entityType: "Product", entityId: input.productId, details: { locale: input.locale, version, status: nextStatus } } });
  });

  if (publishedDirectly) {
    const updated = await db.product.findUnique({ where: { id: input.productId }, include: { translations: true } });
    if (updated) {
      const urls = updated.translations.map((item) => `${env.SITE_URL}/${item.locale}/products/${item.slug}`);
      await purgeEdgeOne(urls);
    }
  }

  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${input.productId}`);
  redirect(`/admin/products/${input.productId}?locale=${input.locale}&saved=${publishedDirectly ? "published" : "draft"}`);
}

export async function updateInquiryStatus(formData: FormData) {
  const session = await requireSecureAdmin(); const input = z.object({ inquiryId: z.string().min(1), status: z.enum(["NEW", "PROCESSING", "CLOSED", "SPAM"]) }).parse(Object.fromEntries(formData));
  await db.inquiry.update({ where: { id: input.inquiryId }, data: { status: input.status } }); await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: `INQUIRY_${input.status}`, entityType: "Inquiry", entityId: input.inquiryId } }); revalidatePath("/admin/inquiries");
}

export async function triggerCrawlPreview(formData: FormData) {
  const session = await requireSecureAdmin(); const sourceId = z.string().min(1).parse(formData.get("sourceId")); const job = await db.crawlJob.create({ data: { sourceId, kind: "CRAWL_PREVIEW", payload: { requestedBy: session.user.id, preview: true } } }); await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "CRAWL_PREVIEW_TRIGGER", entityType: "CrawlJob", entityId: job.id } }); revalidatePath("/admin/jobs");
}

export async function createCrawlSource(formData: FormData) {
  const session = await requireSecureAdmin(); const input = z.object({ name: z.string().trim().min(2).max(100), baseUrl: z.url() }).parse(Object.fromEntries(formData)); const url = new URL(input.baseUrl); if (url.protocol !== "https:") redirect("/admin/imports?error=https-only");
  const source = await db.crawlSource.create({ data: { name: input.name, baseUrl: url.toString(), allowedHosts: [url.hostname.toLowerCase()], autoPublish: false } }); await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "CRAWL_SOURCE_CREATE", entityType: "CrawlSource", entityId: source.id } }); revalidatePath("/admin/imports");
}

export async function updateAiApiKey(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  if (env.AI_API_KEY?.trim()) redirect("/admin/settings?aiKeyError=environment-managed");

  const input = z.object({
    apiKey: z.string().trim().min(32, "API Key 至少需 32 个字符"),
  }).parse(Object.fromEntries(formData));

  const storedKey = createStoredAiApiKey(input.apiKey);

  await db.siteSetting.upsert({
    where: { key: "aiApiKey" },
    update: { value: storedKey as unknown as Prisma.InputJsonValue, secret: true },
    create: { key: "aiApiKey", value: storedKey as unknown as Prisma.InputJsonValue, secret: true },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      actorType: "USER",
      action: "AI_API_KEY_UPDATE",
      entityType: "SiteSetting",
      entityId: "aiApiKey",
    },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=ai-key");
}

export async function updateAutomationSettings(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN"); const autoPublish = formData.get("autoPublish") === "on"; await db.siteSetting.upsert({ where: { key: "automation" }, update: { value: { autoPublish } }, create: { key: "automation", value: { autoPublish } } }); await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "SETTINGS_UPDATE", entityType: "SiteSetting", entityId: "automation" } }); revalidatePath("/admin/settings");
}

export async function createEditorialContent(formData: FormData) {
  const session = await requireSecureAdmin(); const type = editorialTypeSchema.parse(formData.get("type")); const key = randomUUID();
  let translations: ReturnType<typeof parseEditorialTranslations>;
  try { translations = parseEditorialTranslations(formData); }
  catch (error) { if (error instanceof Error && error.message === "EDITORIAL_BODY_EMPTY") redirect("/admin/editorial/new?error=empty-body"); throw error; }
  let entityId: string;
  if (type === "solutions") entityId = (await db.solution.create({ data: { key, translations: { create: translations } } })).id;
  else if (type === "industries") entityId = (await db.industry.create({ data: { key, translations: { create: translations } } })).id;
  else if (type === "cases") entityId = (await db.caseStudy.create({ data: { key, translations: { create: translations } } })).id;
  else {
    const authorName = z.string().trim().min(2).max(120).catch("HEFENGQI Editorial Team").parse(formData.get("authorName"));
    const category = newsCategorySchema.catch("INDUSTRY_INSIGHTS").parse(formData.get("newsCategory"));
    entityId = (await db.newsArticle.create({ data: { key, authorName, category, translations: { create: translations } } })).id;
  }
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "EDITORIAL_CREATE", entityType: type, entityId } }); redirect("/admin/editorial?created=1");
}

export async function updateEditorialContent(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({ type: editorialTypeSchema, id: z.string().min(1) }).parse(Object.fromEntries(formData));
  let translations: ReturnType<typeof parseEditorialTranslations>;
  try { translations = parseEditorialTranslations(formData); }
  catch (error) { if (error instanceof Error && error.message === "EDITORIAL_BODY_EMPTY") redirect(`/admin/editorial/${input.type}/${input.id}?error=empty-body`); throw error; }
  const revisionType = `Editorial:${input.type}`;
  const version = await db.contentRevision.count({ where: { entityType: revisionType, entityId: input.id } }) + 1;
  const basePath = editorialBasePath(input.type);
  await db.$transaction(async (tx) => {
    if (input.type === "solutions") {
      const item = await tx.solution.findUnique({ where: { id: input.id }, include: { translations: true } });
      if (!item) throw new Error("Editorial content not found");
      await tx.contentRevision.create({ data: { entityType: revisionType, entityId: input.id, version, snapshot: JSON.parse(JSON.stringify(item)), origin: "MANUAL", actorId: session.user.id } });
      await tx.solution.update({ where: { id: input.id }, data: { status: "DRAFT", translations: { updateMany: { where: {}, data: { published: false } } } } });
      for (const translation of translations) {
        const previous = item.translations.find((entry) => entry.locale === translation.locale);
        await tx.solutionTranslation.update({ where: { solutionId_locale: { solutionId: input.id, locale: translation.locale } }, data: translation });
        if (previous) await recordSlugRedirect(tx, translation.locale, `${basePath}/${previous.slug}`, `${basePath}/${translation.slug}`);
      }
    } else if (input.type === "industries") {
      const item = await tx.industry.findUnique({ where: { id: input.id }, include: { translations: true } });
      if (!item) throw new Error("Editorial content not found");
      await tx.contentRevision.create({ data: { entityType: revisionType, entityId: input.id, version, snapshot: JSON.parse(JSON.stringify(item)), origin: "MANUAL", actorId: session.user.id } });
      await tx.industry.update({ where: { id: input.id }, data: { status: "DRAFT", translations: { updateMany: { where: {}, data: { published: false } } } } });
      for (const translation of translations) {
        const previous = item.translations.find((entry) => entry.locale === translation.locale);
        await tx.industryTranslation.update({ where: { industryId_locale: { industryId: input.id, locale: translation.locale } }, data: translation });
        if (previous) await recordSlugRedirect(tx, translation.locale, `${basePath}/${previous.slug}`, `${basePath}/${translation.slug}`);
      }
    } else if (input.type === "cases") {
      const item = await tx.caseStudy.findUnique({ where: { id: input.id }, include: { translations: true } });
      if (!item) throw new Error("Editorial content not found");
      await tx.contentRevision.create({ data: { entityType: revisionType, entityId: input.id, version, snapshot: JSON.parse(JSON.stringify(item)), origin: "MANUAL", actorId: session.user.id } });
      await tx.caseStudy.update({ where: { id: input.id }, data: { status: "DRAFT", translations: { updateMany: { where: {}, data: { published: false } } } } });
      for (const translation of translations) {
        const previous = item.translations.find((entry) => entry.locale === translation.locale);
        await tx.caseStudyTranslation.update({ where: { caseStudyId_locale: { caseStudyId: input.id, locale: translation.locale } }, data: translation });
        if (previous) await recordSlugRedirect(tx, translation.locale, `${basePath}/${previous.slug}`, `${basePath}/${translation.slug}`);
      }
    } else {
      const item = await tx.newsArticle.findUnique({ where: { id: input.id }, include: { translations: true } });
      if (!item) throw new Error("Editorial content not found");
      const authorName = z.string().trim().min(2).max(120).parse(formData.get("authorName"));
      const category = newsCategorySchema.parse(formData.get("newsCategory"));
      await tx.contentRevision.create({ data: { entityType: revisionType, entityId: input.id, version, snapshot: JSON.parse(JSON.stringify(item)), origin: "MANUAL", actorId: session.user.id } });
      await tx.newsArticle.update({ where: { id: input.id }, data: { status: "DRAFT", authorName, category, translations: { updateMany: { where: {}, data: { published: false } } } } });
      for (const translation of translations) {
        const previous = item.translations.find((entry) => entry.locale === translation.locale);
        await tx.newsArticleTranslation.update({ where: { articleId_locale: { articleId: input.id, locale: translation.locale } }, data: translation });
        if (previous) await recordSlugRedirect(tx, translation.locale, `${basePath}/${previous.slug}`, `${basePath}/${translation.slug}`);
      }
    }
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "EDITORIAL_UPDATE", entityType: input.type, entityId: input.id, details: { version } } });
  });
  revalidatePath("/", "layout");
  redirect(`/admin/editorial/${input.type}/${input.id}?saved=1`);
}

export async function saveNewsCover(formData: FormData) {
  const session = await requireSecureAdmin();
  const input = z.object({ articleId: z.string().min(1), coverImageId: z.string().trim().min(1).optional().or(z.literal("")), zhImageAlt: z.string().trim().max(200).catch(""), enImageAlt: z.string().trim().max(200).catch(""), ruImageAlt: z.string().trim().max(200).catch("") }).parse(Object.fromEntries(formData));
  const asset = input.coverImageId ? await db.mediaAsset.findFirst({ where: { id: input.coverImageId, kind: "IMAGE", scanStatus: "CLEAN", rightsApproved: true }, select: { id: true } }) : null;
  if (input.coverImageId && !asset) redirect(`/admin/editorial/news/${input.articleId}?error=cover-not-eligible`);
  await db.$transaction(async (tx) => {
    const article = await tx.newsArticle.findUnique({ where: { id: input.articleId }, include: { translations: true } });
    if (!article) throw new Error("Editorial content not found");
    await tx.newsArticle.update({ where: { id: article.id }, data: { coverImageId: asset?.id ?? null, status: "DRAFT", translations: { updateMany: { where: {}, data: { published: false } } } } });
    for (const [locale, alt] of [["zh", input.zhImageAlt], ["en", input.enImageAlt], ["ru", input.ruImageAlt]] as const) {
      await tx.newsArticleTranslation.update({ where: { articleId_locale: { articleId: article.id, locale } }, data: { imageAlt: alt } });
    }
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "NEWS_COVER_UPDATE", entityType: "NewsArticle", entityId: article.id, details: { coverImageId: asset?.id ?? null } } });
  });
  revalidatePath("/", "layout");
  redirect(`/admin/editorial/news/${input.articleId}?saved=cover`);
}

export async function saveNewsRelatedProducts(formData: FormData) {
  const session = await requireSecureAdmin();
  const articleId = z.string().min(1).parse(formData.get("articleId"));
  const selections = [0, 1, 2, 3].flatMap((sortOrder) => {
    const value = formData.get(`relatedProduct${sortOrder + 1}Id`);
    return typeof value === "string" && value.trim() ? [{ productId: z.string().min(1).parse(value), sortOrder }] : [];
  });
  const relatedProductIds = selections.map((selection) => selection.productId);

  if (new Set(relatedProductIds).size !== relatedProductIds.length) {
    redirect(`/admin/editorial/news/${articleId}?error=duplicate-related-product`);
  }

  const [article, eligibleProducts] = await Promise.all([
    db.newsArticle.findUnique({ where: { id: articleId }, select: { id: true } }),
    relatedProductIds.length ? db.product.findMany({
      where: {
        id: { in: relatedProductIds },
        status: "PUBLISHED",
        brand: { archivedAt: null, rightsConfirmed: true },
        category: { status: "PUBLISHED" },
        translations: { some: { locale: "zh", published: true } },
      },
      select: { id: true },
    }) : Promise.resolve([]),
  ]);

  if (!article) redirect("/admin/editorial?error=not-found");
  if (eligibleProducts.length !== relatedProductIds.length) {
    redirect(`/admin/editorial/news/${articleId}?error=invalid-related-product`);
  }

  await db.$transaction(async (tx) => {
    await tx.newsArticleProduct.deleteMany({ where: { articleId } });
    if (selections.length) {
      await tx.newsArticleProduct.createMany({ data: selections.map((selection) => ({ articleId, ...selection })) });
    }
    await tx.newsArticle.update({ where: { id: articleId }, data: { status: "DRAFT", translations: { updateMany: { where: {}, data: { published: false } } } } });
    await tx.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: "NEWS_RELATED_PRODUCTS_UPDATE", entityType: "NewsArticle", entityId: articleId, details: { relatedProductIds } } });
  });

  revalidatePath("/", "layout");
  redirect(`/admin/editorial/news/${articleId}?saved=related-products`);
}

export async function changeEditorialStatus(formData: FormData) {
  const session = await requireSecureAdmin("ADMIN");
  const input = z.object({ type: editorialTypeSchema, id: z.string().min(1), status: editorialStatusSchema }).parse(Object.fromEntries(formData));
  const published = input.status === "PUBLISHED";
  const basePath = editorialBasePath(input.type);
  let paths: string[] = [];
  if (input.type === "solutions") {
    const item = await db.solution.findUnique({ where: { id: input.id }, include: { translations: true } });
    if (!item) redirect("/admin/editorial?error=not-found");
    if (published && !managedLocales.every((locale) => item.translations.some((entry) => entry.locale === locale && entry.title.trim() && entry.summary.trim() && entry.seoTitle.trim() && entry.seoDescription.trim() && hasRichText(entry.body)))) redirect("/admin/editorial?error=missing-translations");
    await db.solution.update({ where: { id: input.id }, data: { status: input.status, publishedAt: published ? new Date() : undefined, translations: { updateMany: { where: {}, data: { published } } } } });
    paths = item.translations.map((entry) => `/${entry.locale}${basePath}/${entry.slug}`);
  } else if (input.type === "industries") {
    const item = await db.industry.findUnique({ where: { id: input.id }, include: { translations: true } });
    if (!item) redirect("/admin/editorial?error=not-found");
    if (published && !managedLocales.every((locale) => item.translations.some((entry) => entry.locale === locale && entry.title.trim() && entry.summary.trim() && entry.seoTitle.trim() && entry.seoDescription.trim() && hasRichText(entry.body)))) redirect("/admin/editorial?error=missing-translations");
    await db.industry.update({ where: { id: input.id }, data: { status: input.status, translations: { updateMany: { where: {}, data: { published } } } } });
    paths = item.translations.map((entry) => `/${entry.locale}${basePath}/${entry.slug}`);
  } else if (input.type === "cases") {
    const item = await db.caseStudy.findUnique({ where: { id: input.id }, include: { translations: true } });
    if (!item) redirect("/admin/editorial?error=not-found");
    if (published && !managedLocales.every((locale) => item.translations.some((entry) => entry.locale === locale && entry.title.trim() && entry.summary.trim() && entry.seoTitle.trim() && entry.seoDescription.trim() && hasRichText(entry.body)))) redirect("/admin/editorial?error=missing-translations");
    await db.caseStudy.update({ where: { id: input.id }, data: { status: input.status, publishedAt: published ? new Date() : undefined, translations: { updateMany: { where: {}, data: { published } } } } });
    paths = item.translations.map((entry) => `/${entry.locale}${basePath}/${entry.slug}`);
  } else {
    const item = await db.newsArticle.findUnique({ where: { id: input.id }, include: { translations: true } });
    if (!item) redirect("/admin/editorial?error=not-found");
    if (published && !managedLocales.every((locale) => item.translations.some((entry) => entry.locale === locale && entry.title.trim() && entry.summary.trim() && entry.seoTitle.trim() && entry.seoDescription.trim() && hasRichText(entry.body)))) redirect("/admin/editorial?error=missing-translations");
    await db.newsArticle.update({ where: { id: input.id }, data: { status: input.status, publishedAt: published ? new Date() : undefined, translations: { updateMany: { where: {}, data: { published } } } } });
    paths = item.translations.map((entry) => `/${entry.locale}${basePath}/${entry.slug}`);
  }
  await db.auditLog.create({ data: { actorId: session.user.id, actorType: "USER", action: `EDITORIAL_${input.status}`, entityType: input.type, entityId: input.id } });
  revalidatePath("/", "layout");
  await purgeEdgeOne(paths.map((path) => `${env.SITE_URL}${path}`));
  redirect(`/admin/editorial?status=${input.status.toLowerCase()}`);
}
