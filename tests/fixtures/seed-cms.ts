import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { productTaxonomy } from "../../src/content/product-taxonomy";
import { getDemoEditorial } from "../../src/content/demo-data";
import { locales } from "../../src/types/domain";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const mediaRoot = path.resolve(process.env.MEDIA_ROOT ?? "");
  if (process.env.E2E_DISPOSABLE_DATABASE !== "ricewind_e2e"
    || !["127.0.0.1", "localhost"].includes(url.hostname)
    || url.pathname !== "/ricewind_e2e" || url.username !== "ricewind_e2e"
    || url.searchParams.get("schema") !== "public"
    || !process.env.MEDIA_ROOT || !mediaRoot.startsWith("/tmp/")) {
    throw new Error("Fixtures require the explicit loopback disposable ricewind_e2e database and /tmp media root");
  }
  const db = new PrismaClient();
  try {
    if (await db.category.count() || await db.product.count() || await db.user.count() || await db.mediaAsset.count()) {
      throw new Error("Refusing to seed a non-empty database; create a fresh disposable database");
    }
    const assets = [];
    for (const [index, background] of ["#141414", "#202020"].entries()) {
      const image = await sharp({ create: { width: 1600, height: 900, channels: 3, background } }).jpeg().toBuffer();
      const hash = createHash("sha256").update(image).digest("hex");
      const storageKey = `${hash.slice(0, 2)}/${hash}-1600.jpg`;
      await mkdir(path.join(mediaRoot, hash.slice(0, 2)), { recursive: true });
      await writeFile(path.join(mediaRoot, storageKey), image, { flag: "wx" });
      assets.push(await db.mediaAsset.create({ data: {
        kind: "IMAGE", originalName: `e2e-neutral-${index}.jpg`, storageKey, contentHash: hash,
        mimeType: "image/jpeg", bytes: BigInt(image.length), width: 1600, height: 900,
        scanStatus: "CLEAN", rightsApproved: true, rightsNote: "Generated neutral E2E test image; not product photography",
      } }));
    }
    const categoryIds = new Map<string, string>();
    for (const item of productTaxonomy) {
      const category = await db.category.create({ data: {
        key: item.key, parentId: item.parentKey ? categoryIds.get(item.parentKey) : undefined,
        level: item.level, sortOrder: item.sortOrder, status: "PUBLISHED",
        translations: { create: locales.map((locale) => {
          const copy = item.translations[locale === "zh" || locale === "ru" ? locale : "en"];
          return { locale, slug: item.slug, name: copy.name, description: copy.description, seoTitle: copy.name, seoDescription: copy.description };
        }) },
      } });
      categoryIds.set(item.key, category.id);
    }
    for (const [key, name, sortOrder] of [
      ["wireless-base-stations", "无线基站与射频设备", 4],
      ["monitoring-management", "监控和管理", 5],
    ] as const) {
      const category = await db.category.create({ data: {
        key, level: 1, sortOrder, status: "PUBLISHED",
        translations: { create: locales.map((locale) => ({
          locale, slug: key, name: locale === "zh" ? name : `E2E ${key}`,
          description: "Isolated E2E category fixture only.",
        })) },
      } });
      categoryIds.set(key, category.id);
    }
    const brand = await db.brand.create({ data: { name: "E2E fixture", slug: "e2e-fixture", rightsConfirmed: true } });
    const productCategories = [
      ["dc-power-systems", 15], ["battery", 1], ["indoor-power-systems", 1], ["site-energy-systems", 1],
      ["cabinet-air-conditioning", 6], ["precision-air-conditioning", 6],
      ["optical-communications", 12], ["integrated-solutions", 12],
      ["wireless-base-stations", 12], ["monitoring-management", 12],
    ] as const;
    for (const [key, count] of productCategories) {
      const categoryId = categoryIds.get(key);
      if (!categoryId) throw new Error(`Missing fixture category: ${key}`);
      for (let index = 0; index < count; index += 1) {
        const identifier = `e2e-${key}-${String(index).padStart(2, "0")}`;
        const copy = "E2E fixture only. Not a real product or a statement of specifications, availability or brand authorization.";
        await db.product.create({ data: {
          id: identifier, normalizedId: identifier, model: identifier, brandId: brand.id,
          categoryId, status: "PUBLISHED", primaryImageId: assets[0].id,
          publishedAt: new Date("2026-01-01T00:00:00Z"), contentUpdatedAt: new Date("2026-01-01T00:00:00Z"),
          translations: { create: locales.map((locale) => ({
            locale, slug: identifier, name: `${identifier} (Huawei search fixture only)`,
            directDefinition: copy, shortDescription: copy, whatItIs: copy, problemSolved: copy, suitableFor: copy,
            advantages: [], applications: [], seoTitle: identifier, seoDescription: copy, published: true,
          })) },
          media: { create: assets.map((asset, sortOrder) => ({ assetId: asset.id, sortOrder, alt: Object.fromEntries(locales.map((locale) => [locale, "Neutral E2E test image"])) })) },
        } });
      }
    }
    for (let index = 0; index < 2; index += 1) {
      await db.homeHeroSlide.create({ data: {
        key: `e2e-hero-${index}`, enabled: true, sortOrder: index, desktopAssetId: assets[index].id,
        translations: { create: locales.map((locale) => ({
          locale, eyebrow: "E2E fixture", title: `E2E test slide ${index + 1}`,
          summary: "Test fixture only; not company or product information.", primaryLabel: "Products",
          primaryHref: "/products", imageAlt: "Neutral E2E test image",
        })) },
      } });
    }
    for (const type of ["solutions", "industries", "cases", "news"] as const) {
      const entries = getDemoEditorial("en", type).slice(0, type === "industries" ? 2 : 1);
      for (const [index, entry] of entries.entries()) {
        const key = `e2e-${type}-${index}`;
        const translations = { create: locales.map((locale) => {
          const localized = getDemoEditorial(locale, type)[index];
          return { locale, slug: localized.slug, title: localized.title, summary: localized.summary,
            body: localized.body, seoTitle: localized.title, seoDescription: localized.summary, published: true };
        }) };
        if (type === "solutions") await db.solution.create({ data: { key, status: "PUBLISHED", sortOrder: index, translations } });
        if (type === "industries") await db.industry.create({ data: { key: entry.key ?? key, status: "PUBLISHED", sortOrder: index, translations } });
        if (type === "cases") await db.caseStudy.create({ data: { key, status: "PUBLISHED", translations } });
        if (type === "news") await db.newsArticle.create({ data: { key, status: "PUBLISHED", authorName: "E2E fixture", translations } });
      }
    }
    console.log("Disposable CMS fixtures ready: seven locales, six shelves, series media, two Hero slides and gallery images");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
