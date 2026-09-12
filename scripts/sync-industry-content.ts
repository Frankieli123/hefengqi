import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { industryContent } from "../src/content/industry-content";

const db = new PrismaClient();

function richText(paragraphs: string[]): Prisma.InputJsonValue {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };
}

async function main() {
  for (const definition of industryContent) {
    await db.$transaction(async (tx) => {
      const industry = await tx.industry.upsert({
        where: { key: definition.key },
        update: { sortOrder: definition.sortOrder, status: "PUBLISHED" },
        create: { key: definition.key, sortOrder: definition.sortOrder, status: "PUBLISHED" },
      });

      for (const [locale, translation] of Object.entries(definition.translations) as Array<["zh" | "en" | "ru", (typeof definition.translations)["zh"]]>) {
        await tx.industryTranslation.upsert({
          where: { industryId_locale: { industryId: industry.id, locale } },
          update: { slug: translation.slug, title: translation.title, summary: translation.summary, body: richText(translation.body), seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, published: true },
          create: { industryId: industry.id, locale, slug: translation.slug, title: translation.title, summary: translation.summary, body: richText(translation.body), seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, published: true },
        });
      }

      await tx.auditLog.create({
        data: { actorType: "SYSTEM", action: "INDUSTRY_CONTENT_SYNC", entityType: "Industry", entityId: industry.id, details: { key: definition.key, source: "editorially adapted from public industry-solution references" } },
      });
    });
  }

  console.log(`Synchronized ${industryContent.length} published industries.`);
}

main().finally(() => db.$disconnect());
