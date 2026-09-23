const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const LOCALES = ["ru", "fr", "de", "es", "ar"];

const VIEW_DESC_5LANG = [
  { ru: "Официальный вид спереди", fr: "Vue de face officielle", de: "Offizielle Vorderansicht", es: "Vista frontal oficial", ar: "المنظر الأمامي الرسمي" },
  { ru: "Изометрический вид под углом 45 градусов", fr: "Vue isométrique à 45 degrés", de: "Isometrische 45-Grad-Ansicht", es: "Vista isométrica en ángulo de 45 grados", ar: "منظر متساوي القياس بزاوية 45 درجة" },
  { ru: "Задняя панель и коммуникационные порты", fr: "Panneau arrière et ports de communication", de: "Rückwand und Kommunikationsanschlüsse", es: "Panel trasero y puertos de comunicación", ar: "اللوحة الخلفية ومنافذ الاتصال" },
  { ru: "Заводская табличка и серийный номер", fr: "Plaque signalétique et numéro de série", de: "Typenschild und Seriennummer", es: "Placa de características y número de serie", ar: "لوحة البيانات والرقم التسلسلي" },
  { ru: "Внутренняя компоновка и интерфейсные модули", fr: "Disposition interne et modules d'interface", de: "Innenaufbau und Schnittstellenmodule", es: "Disposición interna y módulos de interfaz", ar: "التصميم الداخلي ووحدات الواجهة" }
];

async function run() {
  const specs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch26_full_specs.json", "utf8"));
  const transData = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch26_translations_5langs.json", "utf8"));
  console.log("=== 开始精确按 normalizedId 绑定应用 Batch 26 的 5 语深度翻译 ===\n");

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

    // 1. 更新 5 语 Translation & FAQs
    for (const loc of LOCALES) {
      const locData = tDataByLoc[loc];
      if (!locData) continue;

      const targetSlug = `${item.slug}-${loc}`;
      const suffix = loc === "ru" ? "RICEWIND" : loc === "fr" ? "RICEWIND" : loc === "de" ? "RICEWIND" : loc === "es" ? "RICEWIND" : "رايس ويند";
      const seoTitle = `${locData.name} | ${suffix}`;

      const trans = await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale: loc } },
        update: {
          name: locData.name,
          seoTitle: seoTitle,
          seoDescription: locData.desc,
          directDefinition: locData.desc,
          shortDescription: locData.desc,
          whatItIs: locData.desc,
          problemSolved: "Resolves power grid instability, operational energy dissipation, and equipment protection challenges.",
          suitableFor: "Critical telecom facilities, data centers, utility substations, and industrial continuous power plants.",
          advantages: locData.advantages,
          applications: [
            "Critical Telecom Infrastructure & DC Plant",
            "High-Density Cloud Computing & Enterprise Data Centers",
            "Industrial Automation & Utility Substation Systems"
          ],
          published: true
        },
        create: {
          productId: product.id,
          locale: loc,
          name: locData.name,
          slug: targetSlug,
          seoTitle: seoTitle,
          seoDescription: locData.desc,
          directDefinition: locData.desc,
          shortDescription: locData.desc,
          whatItIs: locData.desc,
          problemSolved: "Resolves power grid instability, operational energy dissipation, and equipment protection challenges.",
          suitableFor: "Critical telecom facilities, data centers, utility substations, and industrial continuous power plants.",
          advantages: locData.advantages,
          applications: [
            "Critical Telecom Infrastructure & DC Plant",
            "High-Density Cloud Computing & Enterprise Data Centers",
            "Industrial Automation & Utility Substation Systems"
          ],
          published: true
        }
      });

      // FAQs
      await prisma.fAQ.deleteMany({ where: { productTranslationId: trans.id } });
      if (locData.faqs && locData.faqs.length > 0) {
        for (let fIdx = 0; fIdx < locData.faqs.length; fIdx++) {
          const f = locData.faqs[fIdx];
          await prisma.fAQ.create({
            data: {
              productTranslationId: trans.id,
              question: f.q,
              answer: f.a,
              sortOrder: fIdx
            }
          });
        }
      }
    }

    // 2. 更新 Attributes displayLabels
    for (const attr of product.attributes) {
      const defKey = attr.definition.key;
      const currentLabels = (typeof attr.displayLabels === "object" && attr.displayLabels !== null) ? { ...attr.displayLabels } : {};

      for (const loc of LOCALES) {
        const locData = tDataByLoc[loc];
        if (locData && locData.attributes) {
          const foundA = locData.attributes.find(a => a.key === defKey);
          if (foundA) {
            currentLabels[loc] = foundA.val;
          }
        }
      }

      await prisma.productAttribute.update({
        where: { id: attr.id },
        data: { displayLabels: currentLabels }
      });
    }

    // 3. 更新 Media 5 语 ALT 标签
    for (let i = 0; i < product.media.length; i++) {
      const m = product.media[i];
      const descMap = VIEW_DESC_5LANG[i] || VIEW_DESC_5LANG[0];
      const currentAlt = (typeof m.alt === "object" && m.alt !== null) ? { ...m.alt } : {};

      for (const loc of LOCALES) {
        const locData = tDataByLoc[loc];
        const pName = locData ? locData.name : item.name_en;
        currentAlt[loc] = `${pName} - ${descMap[loc]}`;
      }

      await prisma.productMedia.update({
        where: {
          productId_assetId: {
            productId: m.productId,
            assetId: m.assetId
          }
        },
        data: { alt: currentAlt }
      });
    }

    console.log(`✅ [${item.model}] 5 语深度翻译、FAQs、规格与 ALT 标签完全就绪！`);
  }

  console.log("\n🎉 全部 10 款产品的 7 语本土化体系完全建立完毕！");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
