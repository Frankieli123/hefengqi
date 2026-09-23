
const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const prisma = new PrismaClient();

const arKeywords = ['أولاً', 'ثانياً', 'ثالثاً', 'رابعاً'];

async function fixArabic() {
  const ids = ['cmu2qbzcu00017ih3c933ojmh', 'cmu2p3eqz00017iwxjwhjdw3f'];
  for (const id of ids) {
    const art = await prisma.newsArticle.findUnique({
      where: { id },
      include: { translations: true }
    });
    const t = art.translations.find(x => x.locale === 'ar');
    if (t && t.body && Array.isArray(t.body.content)) {
      const updatedNodes = t.body.content.map(node => {
        if (node.type === 'paragraph' && node.content && node.content.length > 0) {
          const txt = node.content.map(c => c.text || '').join('').trim();
          if (arKeywords.some(k => txt.startsWith(k))) {
            return {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: txt }]
            };
          }
        }
        return node;
      });
      const hCount = updatedNodes.filter(n => n.type === 'heading').length;
      console.log();
      await prisma.newsArticleTranslation.updateMany({
        where: { articleId: id, locale: 'ar' },
        data: { body: { type: 'doc', content: updatedNodes } }
      });
    }
  }
}

fixArabic().catch(console.error).finally(() => prisma['']());
