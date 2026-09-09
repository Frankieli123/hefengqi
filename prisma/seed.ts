import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { productTaxonomy } from "../src/content/product-taxonomy";

const db = new PrismaClient();

async function main() {
  await db.brand.upsert({ where: { slug: "hefengqi" }, update: {}, create: { name: "HEFENGQI", slug: "hefengqi", rightsConfirmed: false } });
  const savedCategories = new Map<string, string>();
  for (const item of productTaxonomy) {
    const parentId = item.parentKey ? savedCategories.get(item.parentKey) : undefined;
    if (item.parentKey && !parentId) throw new Error(`Missing parent category: ${item.parentKey}`);
    const category = await db.category.upsert({
      where: { key: item.key },
      update: {},
      create: { key: item.key, parentId, level: item.level, sortOrder: item.sortOrder, status: "PUBLISHED" },
    });
    savedCategories.set(item.key, category.id);
    for (const locale of ["zh", "en", "ru"] as const) {
      const translation = item.translations[locale];
      await db.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        update: {},
        create: { categoryId: category.id, locale, slug: item.slug, name: translation.name, description: translation.description, seoTitle: translation.name, seoDescription: translation.description },
      });
    }
  }
  await db.siteSetting.upsert({ where: { key: "automation" }, update: {}, create: { key: "automation", value: { autoPublish: false } } });
}

main().finally(() => db.$disconnect());
