const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

const NON_ZH = ["en", "ru", "fr", "de", "es", "ar"];
const CHINESE_REGEX = /[\u4e00-\u9fff]/;

async function run() {
  const specs = JSON.parse(fs.readFileSync("/mnt/vscode/hefengqi/batch24_full_specs.json", "utf8"));
  console.log("=== 开始对 Batch 24 的 20 款产品进行全面文字质量审查 ===\n");

  let totalChineseLeaks = 0;
  let totalUntranslatedEnglish = 0;
  let totalMissingFields = 0;
  let titleIssues = 0;

  for (let idx = 0; idx < specs.length; idx++) {
    const spec = specs[idx];
    const normId = `${spec.brand_en.toLowerCase()}:${spec.model.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    
    const p = await prisma.product.findFirst({
      where: {
        OR: [
          { normalizedId: normId },
          { model: spec.model }
        ]
      },
      include: {
        brand: true,
        translations: { include: { faqs: true } },
        attributes: { include: { definition: true } },
        alarms: true
      }
    });

    if (!p) {
      console.log(`❌ 未找到产品: ${spec.model}`);
      continue;
    }

    // 1. 中文标题审查: [中文品牌] [英文品牌] [型号] [核心品类] [关键参数] (参数)
    const zhTrans = p.translations.find(t => t.locale === "zh");
    if (!zhTrans) {
      console.log(`[${spec.model}] 缺失中文翻译`);
      totalMissingFields++;
    } else {
      const zhName = zhTrans.name;
      const titleOk = /^\[(.+?)\]\s+([A-Za-z0-9\-\+]+)\s+(.+?)\s+(.+?)\s+\((.+?)\)$/.test(zhName);
      if (!titleOk) {
        console.log(`[${spec.model}] 中文标题格式异常: ${zhName}`);
        titleIssues++;
      }
    }

    // 2. 检查 6 种外文端：是否有中文字符泄漏
    for (const loc of NON_ZH) {
      const t = p.translations.find(tr => tr.locale === loc);
      if (!t) {
        console.log(`[${spec.model}][${loc}] 缺失语言翻译`);
        totalMissingFields++;
        continue;
      }

      const textFields = [
        { name: "name", text: t.name },
        { name: "seoTitle", text: t.seoTitle },
        { name: "seoDescription", text: t.seoDescription },
        { name: "shortDescription", text: t.shortDescription },
        { name: "directDefinition", text: t.directDefinition },
        { name: "whatItIs", text: t.whatItIs },
        { name: "problemSolved", text: t.problemSolved },
        { name: "suitableFor", text: t.suitableFor }
      ];

      for (const f of textFields) {
        if (f.text && CHINESE_REGEX.test(f.text)) {
          console.log(`[${spec.model}][${loc}] ${f.name} 中发现汉字泄漏: ${f.text.slice(0, 40)}...`);
          totalChineseLeaks++;
        }
      }

      for (const adv of (t.advantages || [])) {
        if (CHINESE_REGEX.test(adv)) {
          console.log(`[${spec.model}][${loc}] advantage 汉字泄漏: ${adv.slice(0, 40)}...`);
          totalChineseLeaks++;
        }
      }

      for (const faq of t.faqs) {
        if (CHINESE_REGEX.test(faq.question)) {
          console.log(`[${spec.model}][${loc}] FAQ 问题汉字泄漏: ${faq.question}`);
          totalChineseLeaks++;
        }
        if (CHINESE_REGEX.test(faq.answer)) {
          console.log(`[${spec.model}][${loc}] FAQ 答案汉字泄漏: ${faq.answer.slice(0, 40)}...`);
          totalChineseLeaks++;
        }
      }
    }

    // 3. 检查小语种 (ru, fr, de, es, ar) 是否存在未翻译的英文标题或描述
    const enTrans = p.translations.find(t => t.locale === "en");
    for (const loc of ["ru", "fr", "de", "es", "ar"]) {
      const t = p.translations.find(tr => tr.locale === loc);
      if (t && enTrans) {
        if (t.name.trim() === enTrans.name.trim()) {
          console.log(`[${spec.model}][${loc}] 标题未翻译 (仍为纯英文): ${t.name}`);
          totalUntranslatedEnglish++;
        }
      }
    }

    // 4. 检查属性定义及显示值的文字质量
    for (const attr of p.attributes) {
      const labels = attr.definition?.labels || {};
      const disp = attr.displayLabels || {};
      for (const loc of NON_ZH) {
        if (labels[loc] && CHINESE_REGEX.test(labels[loc])) {
          console.log(`[${spec.model}][${loc}] 属性 Label 汉字泄漏: ${labels[loc]}`);
          totalChineseLeaks++;
        }
        if (disp[loc] && CHINESE_REGEX.test(disp[loc])) {
          console.log(`[${spec.model}][${loc}] 属性 Value 汉字泄漏: ${disp[loc]}`);
          totalChineseLeaks++;
        }
      }
    }

    // 5. 检查 ProductAlarm 文字质量
    for (const a of p.alarms) {
      for (const loc of NON_ZH) {
        if (a.alarmCode?.[loc] && CHINESE_REGEX.test(a.alarmCode[loc])) totalChineseLeaks++;
        if (a.ledStatus?.[loc] && CHINESE_REGEX.test(a.ledStatus[loc])) totalChineseLeaks++;
        if (a.cause?.[loc] && CHINESE_REGEX.test(a.cause[loc])) totalChineseLeaks++;
        if (a.procedure?.[loc] && CHINESE_REGEX.test(a.procedure[loc])) totalChineseLeaks++;
      }
    }
  }

  console.log("\n=== 审查结果汇总 ===");
  console.log(`1. 中文标题格式不规范: ${titleIssues} 项`);
  console.log(`2. 外文端中文字符泄漏: ${totalChineseLeaks} 处`);
  console.log(`3. 小语种未翻译残留纯英文: ${totalUntranslatedEnglish} 处`);
  console.log(`4. 缺失语言版本: ${totalMissingFields} 处`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
