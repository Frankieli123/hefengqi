const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const LOCALES = ["ru", "fr", "de", "es", "ar"];

const VIEW_DESC_5LANG = [
  { ru: "Официальный вид спереди", fr: "Vue de face officielle", de: "Offizielle Vorderansicht", es: "Vista frontal oficial", ar: "المنظر الأمامي الرسمي" },
  { ru: "Изометрический вид под углом 45 градусов", fr: "Vue isométrique à 45 degrés", de: "Isometrische 45-Grad-Ansicht", es: "Vista isométrica en ángulo de 45 grados", ar: "منظر متساوي القياس بزاوية 45 درجة" },
  { ru: "Задняя панель и электрические клеммы", fr: "Panneau arrière et bornes électriques", de: "Rückwand und elektrische Anschlussklemmen", es: "Panel trasero y terminales de conexión eléctrica", ar: "اللوحة الخلفية وأطراف التوصيل الكهربائي" },
  { ru: "Заводская табличка и паспортные характеристики", fr: "Plaque signalétique et spécifications électriques", de: "Typenschild und elektrische Nennwerte", es: "Placa de características y especificaciones eléctricas", ar: "لوحة البيانات والمواصفات الفنية الكهربائية" },
  { ru: "Внутренняя компоновка и монтажные узлы", fr: "Disposition interne et sous-ensembles", de: "Innenaufbau und Baugruppenanordnung", es: "Disposición interna y subconjuntos", ar: "التصميم الداخلي والوحدات المجمعة" }
];

async function run() {
  const specs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch24_full_specs.json", "utf8"));
  const transData = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch24_translations_5langs.json", "utf8"));
  console.log("=== 开始精确按 normalizedId 绑定应用 Batch 24 的 5 语深度翻译 ===\n");

  for (const item of specs) {
    const normId = `${item.brand_en.toLowerCase()}:${item.model.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const tDataByLoc = transData[item.model];

    if (!tDataByLoc) {
      console.log(`⚠️ 未找到翻译数据: ${item.model}`);
      continue;
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { normalizedId: normId },
          { model: item.model }
        ]
      },
      include: {
        translations: { include: { faqs: true } },
        attributes: { include: { definition: true } },
        media: { orderBy: { sortOrder: "asc" } }
      }
    });

    if (!product) {
      console.log(`❌ 未找到产品: ${item.model}`);
      continue;
    }

    console.log(`Updating: [${product.brandId}] ${product.model} (ID: ${product.id})`);

    // 1. Update Translations
    for (const loc of LOCALES) {
      const tData = tDataByLoc[loc];
      if (!tData) continue;

      const existingTrans = product.translations.find(t => t.locale === loc);
      if (existingTrans) {
        await prisma.productTranslation.update({
          where: { id: existingTrans.id },
          data: {
            name: tData.name,
            seoTitle: `${tData.name} | RICEWIND`,
            seoDescription: tData.desc,
            directDefinition: tData.desc,
            shortDescription: tData.desc,
            whatItIs: tData.desc,
            advantages: tData.advantages,
            published: true
          }
        });

        // Update FAQs
        if (tData.faqs && tData.faqs.length > 0) {
          await prisma.fAQ.deleteMany({ where: { productTranslationId: existingTrans.id } });
          for (let fIdx = 0; fIdx < tData.faqs.length; fIdx++) {
            await prisma.fAQ.create({
              data: {
                productTranslationId: existingTrans.id,
                question: tData.faqs[fIdx].q,
                answer: tData.faqs[fIdx].a,
                sortOrder: fIdx
              }
            });
          }
        }
      }
    }

    // 2. Update Attributes definition labels & displayLabels
    for (const attr of product.attributes) {
      const def = attr.definition;
      const defLabels = def.labels || {};
      const dispLabels = attr.displayLabels || {};

      for (const loc of LOCALES) {
        const tData = tDataByLoc[loc];
        if (tData && tData.attributes) {
          const matchAttr = tData.attributes.find(a => a.key === def.key);
          if (matchAttr) {
            defLabels[loc] = matchAttr.label;
            dispLabels[loc] = matchAttr.val;
          }
        }
      }

      await prisma.attributeDefinition.update({
        where: { id: def.id },
        data: { labels: defLabels }
      });

      await prisma.productAttribute.update({
        where: { id: attr.id },
        data: { displayLabels: dispLabels }
      });
    }

    // 3. Update Media Alt in 5 languages
    for (let i = 0; i < product.media.length; i++) {
      const m = product.media[i];
      const altObj = m.alt || {};
      const descObj = VIEW_DESC_5LANG[i] || VIEW_DESC_5LANG[0];

      for (const loc of LOCALES) {
        const tData = tDataByLoc[loc];
        if (tData) {
          altObj[loc] = `${tData.name} - ${descObj[loc]}`;
        }
      }

      await prisma.productMedia.update({
        where: {
          productId_assetId: {
            productId: product.id,
            assetId: m.assetId
          }
        },
        data: { alt: altObj }
      });
    }

    console.log(`  🟢 [${item.model}] 5 语本地化已精准对齐！`);
  }

  console.log("\n🎉 全部 20 款产品的 5 语深度本地化翻译绑定完成！");
}

run().catch(console.error).finally(() => prisma.$disconnect());
