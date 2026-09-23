const { PrismaClient } = require('/mnt/vscode/hefengqi/node_modules/@prisma/client');
const sharp = require('/mnt/vscode/hefengqi/node_modules/sharp');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dotenv = require('/mnt/vscode/hefengqi/node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('/mnt/vscode/hefengqi/.env'));
const prisma = new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}});

const SOURCE = '/mnt/vscode/hefengqi/scene_dutch_grid_regional_dc_power_2026_fixed.png';
const PACKAGE = '/mnt/vscode/hefengqi/daily_dutch_grid_package.json';
const SIZES = [480, 800, 1200, 1600, 1920];
const FORMATS = ['webp', 'avif', 'jpeg'];
const locales = ['zh', 'en', 'ru', 'fr', 'de', 'es', 'ar'];

function ast(d) {
  const content = [];
  for (const s of d.sections) {
    content.push({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: s.heading }]
    });
    for (const p of s.paragraphs) {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: p }]
      });
    }
    content.push({
      type: 'bulletList',
      content: s.checklist.map(x => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: x }] }]
      }))
    });
  }
  return { type: 'doc', content };
}

(async () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
  const buf = fs.readFileSync(SOURCE);
  const meta = await sharp(buf).metadata();
  if (meta.width !== 1792 || meta.height !== 1024) {
    throw new Error(`source dimensions ${meta.width}x${meta.height}`);
  }

  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const prefix = hash.slice(0, 2);
  const globalDir = path.join('/data/media', prefix);
  const projectDir = path.join('/mnt/vscode/hefengqi/data/media', prefix);
  fs.mkdirSync(globalDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });

  const variants = {};
  for (const size of SIZES) {
    for (const fmt of FORMATS) {
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      const name = `${hash}-${size}.${ext}`;
      const rel = `${prefix}/${name}`;
      const out = path.join(globalDir, name);
      let q = sharp(buf).resize(size, null, { withoutEnlargement: true });
      if (fmt === 'webp') q = q.webp({ quality: 85 });
      else if (fmt === 'avif') q = q.avif({ quality: 78 });
      else q = q.jpeg({ quality: 86 });
      await q.toFile(out);
      fs.copyFileSync(out, path.join(projectDir, name));
      variants[`${size}-${fmt}`] = rel;
    }
  }

  let media = await prisma.mediaAsset.findFirst({ where: { contentHash: hash } });
  if (!media) {
    media = await prisma.mediaAsset.create({
      data: {
        kind: 'IMAGE',
        originalName: path.basename(SOURCE),
        storageKey: `${prefix}/${hash}-800.webp`,
        contentHash: hash,
        mimeType: 'image/png',
        bytes: BigInt(buf.length),
        width: meta.width,
        height: meta.height,
        variants,
        scanStatus: 'CLEAN',
        rightsApproved: true,
        rightsNote: 'Original AI-generated industrial documentary image by RICEWIND studio'
      }
    });
  }

  let article = await prisma.newsArticle.findUnique({ where: { key: pkg.slug } });
  const data = {
    category: 'INDUSTRY_INSIGHTS',
    status: 'PUBLISHED',
    authorName: 'RICEWIND Infrastructure Research Institute',
    publishedAt: new Date(),
    coverImageId: media.id
  };
  article = article ? await prisma.newsArticle.update({ where: { id: article.id }, data })
                    : await prisma.newsArticle.create({ data: { key: pkg.slug, ...data } });

  for (const loc of locales) {
    const d = pkg.translations[loc];
    const td = {
      slug: pkg.slug,
      title: d.title,
      summary: d.summary,
      body: ast(d),
      imageAlt: d.imageAlt,
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
      published: true
    };
    await prisma.newsArticleTranslation.upsert({
      where: { articleId_locale: { articleId: article.id, locale: loc } },
      create: { articleId: article.id, locale: loc, ...td },
      update: td
    });
  }

  const check = await prisma.newsArticle.findUnique({
    where: { id: article.id },
    include: { translations: true, coverImage: true }
  });

  console.log(JSON.stringify({
    articleId: article.id,
    key: article.key,
    mediaId: media.id,
    contentHash: hash,
    dimensions: `${meta.width}x${meta.height}`,
    variants: Object.keys(variants).length,
    translations: check.translations.map(t => ({
      locale: t.locale,
      published: t.published,
      nodes: t.body.content.length,
      headings: t.body.content.filter(n => n.type === 'heading').length,
      lists: t.body.content.filter(n => n.type === 'bulletList').length,
      cjk: t.locale === 'zh' ? 0 : ((JSON.stringify(t.body) + t.title + (t.summary || '')).match(/[\u3400-\u9fff]/g) || []).length
    })).sort((a, b) => locales.indexOf(a.locale) - locales.indexOf(b.locale))
  }, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
