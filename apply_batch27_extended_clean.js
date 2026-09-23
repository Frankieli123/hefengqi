const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const LOCALES = ["zh", "en", "ru", "fr", "de", "es", "ar"];

async function run() {
  const extendedSpecs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch27_extended_specs.json", "utf8"));
  const pureFaqs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/pure_technical_faqs.json", "utf8"));

  console.log("=== 开始执行 Batch 27 深度重构与清洗流水线 ===\n");

  for (const [model, attrs] of Object.entries(extendedSpecs)) {
    const product = await prisma.product.findFirst({
      where: { model: model },
      include: { category: true, translations: true }
    });

    if (!product) {
      console.log(`❌ 未找到型号: ${model}`);
      continue;
    }

    console.log(`\n🚀 [处理中] ${model}...`);

    // 1. 全量清空并重写 10~11 项属性 (前 6 项 featured: true，后 4~5 项 featured: false)
    await prisma.productAttribute.deleteMany({ where: { productId: product.id } });

    for (let idx = 0; idx < attrs.length; idx++) {
      const a = attrs[idx];
      let def = await prisma.attributeDefinition.findFirst({
        where: { key: a.key }
      });

      const defLabels = {
        zh: a.zh,
        en: a.en,
        ru: a.en,
        fr: a.en,
        de: a.en,
        es: a.en,
        ar: a.en
      };

      if (!def) {
        def = await prisma.attributeDefinition.create({
          data: {
            key: a.key,
            type: "TEXT",
            categoryId: product.categoryId,
            labels: defLabels,
            sortOrder: idx,
            comparable: true
          }
        });
      } else {
        // 更新 Definition 的 Label 为精简工业命名
        await prisma.attributeDefinition.update({
          where: { id: def.id },
          data: { labels: defLabels }
        });
      }

      const dispLabels = {
        zh: a.val_zh,
        en: a.val_en,
        ru: a.val_ru || a.val_en,
        fr: a.val_fr || a.val_en,
        de: a.val_de || a.val_en,
        es: a.val_es || a.val_en,
        ar: a.val_ar || a.val_en
      };

      await prisma.productAttribute.create({
        data: {
          productId: product.id,
          definitionId: def.id,
          textValue: a.val_zh,
          displayLabels: dispLabels,
          featured: a.featured,
          featureOrder: a.featured ? idx : null
        }
      });
    }
    console.log(`  ✅ 重构并写入 ${attrs.length} 条规格属性 (6项精简黑块 + ${attrs.length - 6}项完整规格表)`);

    // 2. 深度清洗 7 语 ProductTranslation 中的问题描述与场景字段（消除英文残留）
    const localizedTexts = {
      zh: {
        problem: "有效解决配电支路监测延迟、工业电网谐波畸变、直流备电蓄电池早期劣化以及无人值守机房动环集中管控难题。",
        suitable: "广泛适用于企业级云计算数据中心、电力特高压及变电站、5G通信核心机房、基站动力机房及工业自动化控制中心。"
      },
      en: {
        problem: "Resolves power grid instability, branch circuit metering latency, battery bank premature aging, and unattended facility management challenges.",
        suitable: "Ideal for enterprise cloud data centers, high-voltage utility substations, telecommunications central offices, and industrial automation."
      },
      ru: {
        problem: "Устраняет задержки мониторинга распределения, гармонические искажения, деградацию АКБ и задачи автоматизации необслуживаемых объектов.",
        suitable: "Центры обработки данных (ЦОД), подстанции высокого напряжения, узлы связи операторов и шкафы промышленной автоматики."
      },
      fr: {
        problem: "Résout la latence de comptage des départs, la distorsion harmonique, la dégradation précoce des batteries et la supervision de sites isolés.",
        suitable: "Centres de données cloud, postes électriques haute tension, centraux télécoms et armoires d'automatisation industrielle."
      },
      de: {
        problem: "Löst Verzögerungen bei der Stromkreismessung, Netzoberwellen, vorzeitige Batteriealterung und Leittechnik-Herausforderungen unbemannter Stationen.",
        suitable: "Enterprise-Rechenzentren, Hochspannungsumspannwerke, Telekommunikations-Zentralen und industrielle Steuerungsanlagen."
      },
      es: {
        problem: "Resuelve retardos de telemetría de distribución, distorsión armónica, degradación de baterías y gestión remota de salas críticas.",
        suitable: "Centros de datos en la nube, subestaciones eléctricas, centrales de telecomunicaciones y automatización industrial."
      },
      ar: {
        problem: "يعالج تأخر قياس الدوائر الفرعية، والتشوه التوافقي للشبكة، والتدهور المبكر للبطاريات، وتحديات المراقبة المركزية للمرافق غير المأهولة.",
        suitable: "مراكز البيانات السحابية، محطات التحويل الكهربائي، مراكز الاتصالات الرئيسية، وخزائن الأتمتة الصناعية."
      }
    };

    for (const t of product.translations) {
      const loc = t.locale;
      const texts = localizedTexts[loc] || localizedTexts["en"];

      await prisma.productTranslation.update({
        where: { id: t.id },
        data: {
          problemSolved: texts.problem,
          suitableFor: texts.suitable
        }
      });
    }
    console.log(`  ✅ 7 语 problemSolved 与 suitableFor 本土化清洗完成`);

    // 3. 覆盖纯技术、纯排障的 7 语真实 FAQ（彻底剔除采购发运营销话术）
    const modelFaqs = pureFaqs[model];
    if (modelFaqs) {
      for (const t of product.translations) {
        const loc = t.locale;
        await prisma.fAQ.deleteMany({ where: { productTranslationId: t.id } });

        for (let fIdx = 0; fIdx < modelFaqs.length; fIdx++) {
          const f = modelFaqs[fIdx];
          const qText = f.q[loc] || f.q["en"];
          const aText = f.a[loc] || f.a["en"];

          await prisma.fAQ.create({
            data: {
              productTranslationId: t.id,
              question: qText,
              answer: aText,
              sortOrder: fIdx
            }
          });
        }
      }
      console.log(`  ✅ 7 语真实纯技术排障 FAQ 写入完成 (每语言各 3 条纯技术问答)`);
    }
  }

  console.log("\n🎉 Batch 27 深度精简与全维参数扩展全部落地完成！");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
