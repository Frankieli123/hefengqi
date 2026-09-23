const { PrismaClient } = require("/mnt/vscode/hefengqi/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function showArticles() {
  const articles = await prisma.newsArticle.findMany({
    where: { NOT: { key: "800g-coherent-pluggables-subsea-datacenter-interconnect-2026" } },
    select: {
      key: true,
      category: true,
      translations: {
        where: { locale: "zh" },
        select: { title: true, body: true }
      }
    }
  });

  for (const a of articles) {
    console.log("=========================================");
    console.log("KEY:", a.key, "[" + a.category + "]");
    const zh = a.translations[0];
    if (zh) {
      console.log("TITLE:", zh.title);
      if (zh.body && zh.body.content) {
        zh.body.content.forEach((block, idx) => {
          const t = block.content ? block.content.map(c => c.text).join("") : "";
          console.log("  P" + (idx + 1) + ": " + t.substring(0, 100) + "...");
        });
      }
    }
  }
}

showArticles().catch(console.error).finally(() => prisma.$disconnect());
