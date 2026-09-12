import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { productTaxonomy, retiredDefaultCategoryKeys, type CatalogLocale } from "../src/content/product-taxonomy";

const db = new PrismaClient();
const locales = ["zh", "en", "ru"] as const;

// Explicit one-time catalogue migration. Back up PostgreSQL before running it:
// known default keys are updated, while unrelated admin-created categories are untouched.

type CategoryPathSource = {
  id: string;
  key: string;
  parentId: string | null;
  translations: Array<{ locale: CatalogLocale; slug: string }>;
};

function localizedPaths(categories: CategoryPathSource[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const paths = new Map<string, string>();
  for (const category of categories) {
    for (const locale of locales) {
      const parts: string[] = [];
      const visited = new Set<string>();
      let current: CategoryPathSource | undefined = category;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        const translation = current.translations.find((item) => item.locale === locale);
        if (!translation) break;
        parts.unshift(translation.slug);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      if (parts.length) paths.set(`${category.key}:${locale}`, `/products/category/${parts.join("/")}`);
    }
  }
  return paths;
}

async function main() {
  await db.$transaction(async (tx) => {
    const before = await tx.category.findMany({ include: { translations: true } });
    const oldPaths = localizedPaths(before);
    const savedCategories = new Map<string, string>();

    for (const item of productTaxonomy) {
      const parentId = item.parentKey ? savedCategories.get(item.parentKey) : null;
      if (item.parentKey && !parentId) throw new Error(`Missing parent category: ${item.parentKey}`);
      const fields = { parentId, level: item.level, sortOrder: item.sortOrder, status: "PUBLISHED" as const };
      const category = await tx.category.upsert({
        where: { key: item.key },
        update: fields,
        create: { key: item.key, ...fields },
      });
      savedCategories.set(item.key, category.id);

      for (const locale of locales) {
        const translation = item.translations[locale];
        const fields = { slug: item.slug, name: translation.name, description: translation.description, seoTitle: translation.name, seoDescription: translation.description };
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: category.id, locale } },
          update: fields,
          create: { categoryId: category.id, locale, ...fields },
        });
      }
    }

    for (const key of retiredDefaultCategoryKeys) {
      const category = await tx.category.findUnique({
        where: { key },
        include: { _count: { select: { products: true, children: { where: { status: "PUBLISHED" } } } } },
      });
      if (category && category._count.products === 0 && category._count.children === 0) {
        await tx.category.update({ where: { id: category.id }, data: { status: "ARCHIVED" } });
      }
    }

    const after = await tx.category.findMany({ include: { translations: true } });
    const newPaths = localizedPaths(after);
    for (const item of productTaxonomy) {
      for (const locale of locales) {
        const fromPath = oldPaths.get(`${item.key}:${locale}`);
        const toPath = newPaths.get(`${item.key}:${locale}`);
        if (!fromPath || !toPath || fromPath === toPath) continue;
        await tx.slugRedirect.deleteMany({ where: { locale, fromPath: toPath } });
        await tx.slugRedirect.updateMany({ where: { locale, toPath: fromPath }, data: { toPath } });
        await tx.slugRedirect.upsert({
          where: { locale_fromPath: { locale, fromPath } },
          create: { locale, fromPath, toPath },
          update: { toPath },
        });
      }
    }

    const previousUpsHref = "/products/category/ups-systems/ups";
    const currentUpsHref = "/products/category/power/ups";
    await tx.homeHeroSlideTranslation.updateMany({ where: { primaryHref: previousUpsHref }, data: { primaryHref: currentUpsHref } });
    await tx.homeHeroSlideTranslation.updateMany({ where: { secondaryHref: previousUpsHref }, data: { secondaryHref: currentUpsHref } });
    await tx.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "REFERENCE_PRODUCT_TAXONOMY_SYNC",
        entityType: "Category",
        details: { activeKeys: productTaxonomy.map((item) => item.key), retiredKeys: retiredDefaultCategoryKeys },
      },
    });
  }, { timeout: 30000 });
}

main()
  .then(() => console.log(`Synced ${productTaxonomy.length} active product categories.`))
  .finally(() => db.$disconnect());
