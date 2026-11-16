
const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const prisma = new PrismaClient();

function convertToHeadings(nodes, patterns) {
  return nodes.map(node => {
    if (node.type === "paragraph" && node.content && node.content.length > 0) {
      const text = node.content.map(c => c.text || "").join("").trim();
      const isMatch = patterns.some(p => p.test(text));
      if (isMatch) {
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: text }]
        };
      }
    }
    return node;
  });
}

async function run() {
  console.log('--- Fixing Article 7, 8, 10 heading semantics ---');

  // Article 7 (cmu2qbzcu00017ih3c933ojmh)
  const art7 = await prisma.newsArticle.findUnique({
    where: { id: 'cmu2qbzcu00017ih3c933ojmh' },
    include: { translations: true }
  });
  const patterns7 = [
    /^(I|II|III|IV)\./i,
    /^(1|2|3|4)\./,
    /^(一|二|三|四)、/
  ];
  for (const t of art7.translations) {
    if (t.body && Array.isArray(t.body.content)) {
      const updatedNodes = convertToHeadings(t.body.content, patterns7);
      const hCount = updatedNodes.filter(n => n.type === 'heading').length;
      console.log();
      await prisma.newsArticleTranslation.updateMany({
        where: { articleId: art7.id, locale: t.locale },
        data: { body: { type: 'doc', content: updatedNodes } }
      });
    }
  }

  // Article 8 (cmu2p3eqz00017iwxjwhjdw3f)
  const art8 = await prisma.newsArticle.findUnique({
    where: { id: 'cmu2p3eqz00017iwxjwhjdw3f' },
    include: { translations: true }
  });
  for (const t of art8.translations) {
    if (t.body && Array.isArray(t.body.content)) {
      const updatedNodes = convertToHeadings(t.body.content, patterns7);
      const hCount = updatedNodes.filter(n => n.type === 'heading').length;
      console.log();
      await prisma.newsArticleTranslation.updateMany({
        where: { articleId: art8.id, locale: t.locale },
        data: { body: { type: 'doc', content: updatedNodes } }
      });
    }
  }

  // Article 10 (cmtyd1tc700017i7amzv5lo1s) EN and RU
  const art10 = await prisma.newsArticle.findUnique({
    where: { id: 'cmtyd1tc700017i7amzv5lo1s' },
    include: { translations: true }
  });
  const patterns10 = [
    /^\[(Step|Шаг)\s+\d+/i,
    /^(Step|Шаг)\s+\d+/i
  ];
  for (const loc of ['en', 'ru']) {
    const t = art10.translations.find(x => x.locale === loc);
    if (t && t.body && Array.isArray(t.body.content)) {
      const updatedNodes = convertToHeadings(t.body.content, patterns10);
      const hCount = updatedNodes.filter(n => n.type === 'heading').length;
      console.log();
      await prisma.newsArticleTranslation.updateMany({
        where: { articleId: art10.id, locale: loc },
        data: { body: { type: 'doc', content: updatedNodes } }
      });
    }
  }

  console.log('--- All heading adjustments done! ---');
}

run().catch(console.error).finally(() => {
  return prisma[""]();
});
