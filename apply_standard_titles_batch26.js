const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const LOCALES = ["zh", "en", "ru", "fr", "de", "es", "ar"];

async function run() {
  const titlesData = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch26_titles_7lang.json", "utf8"));
  console.log("=== 开始严格按工业出海规范更新 Batch 26 的 7 语标准标题 ===\n");

  for (const [model, locTitles] of Object.entries(titlesData)) {
    const product = await prisma.product.findFirst({
      where: { model: model },
      include: { translations: true }
    });

    if (!product) {
      console.log(`❌ 未找到产品: ${model}`);
      continue;
    }

    for (const loc of LOCALES) {
      const newTitle = locTitles[loc];
      if (!newTitle) continue;

      const suffix = loc === "zh" 
        ? "禾风起" 
        : loc === "ar" 
          ? "رايس ويند" 
          : "RICEWIND";
      
      const seoTitle = `${newTitle} | ${suffix}`;

      await prisma.productTranslation.updateMany({
        where: {
          productId: product.id,
          locale: loc
        },
        data: {
          name: newTitle,
          seoTitle: seoTitle
        }
      });
    }

    console.log(`✅ [${model}] 7 语标题完全对齐工业规范！`);
    console.log(`    zh: ${locTitles["zh"]}`);
    console.log(`    en: ${locTitles["en"]}`);
  }

  console.log("\n🎉 Batch 26 全部 10 款硬件的 7 语标题更新优化完成！");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
