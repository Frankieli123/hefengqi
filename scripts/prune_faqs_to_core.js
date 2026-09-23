const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting full-database FAQ optimization per product...");
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    include: {
      translations: {
        include: {
          faqs: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });

  const marketingPattern = /禾风起|ricewind|采购商从|从禾风起|通过禾风起|品质保障|交付保障|正品保障|出海交付|出库带电|跨国物流|跨国交付|Why buy from|guarantee|warranty from us|authentic modules/i;

  let totalDeleted = 0;
  let totalRetained = 0;

  for (const product of products) {
    const isSystem = /system|cabinet|机柜|系统|outdoor|shelf|subrack/i.test(product.model);
    const targetLimit = isSystem ? 4 : 3;

    for (const translation of product.translations) {
      const existingFaqs = translation.faqs;
      
      // 1. 过滤垃圾营销问答
      const coreFaqs = existingFaqs.filter(f => {
        const isMarketing = marketingPattern.test(f.question) || marketingPattern.test(f.answer);
        return !isMarketing;
      });

      // 2. 精确保留核心问答
      const keepFaqs = coreFaqs.slice(0, targetLimit);
      const keepIds = new Set(keepFaqs.map(f => f.id));

      // 3. 找出需要删除的 FAQ
      const toDelete = existingFaqs.filter(f => !keepIds.has(f.id));

      if (toDelete.length > 0) {
        await prisma.fAQ.deleteMany({
          where: { id: { in: toDelete.map(f => f.id) } }
        });
        totalDeleted += toDelete.length;
      }

      // 4. 重置剩余核心 FAQ 的 sortOrder
      for (let i = 0; i < keepFaqs.length; i++) {
        await prisma.fAQ.update({
          where: { id: keepFaqs[i].id },
          data: { sortOrder: i }
        });
      }
      totalRetained += keepFaqs.length;
    }
  }

  console.log({
    status: "SUCCESS",
    totalProductsProcessed: products.length,
    totalFaqsDeleted: totalDeleted,
    totalCoreFaqsRetained: totalRetained,
    averageFaqsPerTranslation: (totalRetained / (products.length * 3)).toFixed(2)
  });
}

main()
  .catch(err => {
    console.error("Prune error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
