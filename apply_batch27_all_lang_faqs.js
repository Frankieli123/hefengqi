const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const LOCALES = ["zh", "en", "ru", "fr", "de", "es", "ar"];

async function run() {
  const allFaqs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch27_all_faqs.json", "utf8"));
  console.log("=== 开始为 Batch 27 全部 10 款硬件写入 7 语本土化排障与采购问答 (FAQ) ===\n");

  for (const [model, faqList] of Object.entries(allFaqs)) {
    const product = await prisma.product.findFirst({
      where: { model: model },
      include: { translations: true }
    });

    if (!product) {
      console.log(`❌ 未找到: ${model}`);
      continue;
    }

    for (const t of product.translations) {
      const loc = t.locale;
      // 先清空该语言现存的 FAQ
      await prisma.fAQ.deleteMany({
        where: { productTranslationId: t.id }
      });

      // 写入 3 项问答
      for (let idx = 0; idx < faqList.length; idx++) {
        const item = faqList[idx];
        const qText = item.q[loc] || item.q["en"];
        const aText = item.a[loc] || item.a["en"];

        await prisma.fAQ.create({
          data: {
            productTranslationId: t.id,
            question: qText,
            answer: aText,
            sortOrder: idx
          }
        });
      }
    }

    console.log(`✅ [${model}] 7 语全部语言各写入 3 项 FAQ 完成！`);
  }

  console.log("\n🎉 Batch 27 全部 10 款硬件 7 语 FAQ 补齐完成！");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
