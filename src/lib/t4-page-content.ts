import type { Locale, ProductView } from "@/types/domain";
import { aboutData } from "@/content/about";

const faqQuestions: Record<Locale, [string, string, string]> = {
  en: ["What is the MCA0300 cabinet air conditioner?", "How is the MCA0300 installed?", "Which applications is the MCA0300 suitable for?"],
  zh: ["MCA0300 是什么设备？", "MCA0300 如何安装？", "MCA0300 适用于哪些应用？"],
  ru: ["Что представляет собой кондиционер MCA0300?", "Как устанавливается MCA0300?", "Для каких применений подходит MCA0300?"],
  fr: ["Qu'est-ce que le climatiseur MCA0300 pour armoire ?", "Comment le MCA0300 s'installe-t-il ?", "À quelles applications le MCA0300 convient-il ?"],
  de: ["Was ist das Schaltschrank-Klimagerät MCA0300?", "Wie wird der MCA0300 installiert?", "Für welche Anwendungen ist der MCA0300 geeignet?"],
  es: ["¿Qué es el climatizador para armario MCA0300?", "¿Cómo se instala el MCA0300?", "¿Para qué aplicaciones es adecuado el MCA0300?"],
  ar: ["ما هو مكيف الخزانة MCA0300؟", "كيف يتم تركيب MCA0300؟", "ما التطبيقات المناسبة لـ MCA0300؟"],
};

export const mcaSectionLabels: Record<Locale, { nav: string; overview: string; specs: string; faq: string; related: string }> = {
  en: { nav: "MCA0300 product sections", overview: "Overview", specs: "Specifications", faq: "FAQ", related: "Related products" },
  zh: { nav: "MCA0300 产品章节", overview: "产品概览", specs: "规格参数", faq: "常见问题", related: "相关产品" },
  ru: { nav: "Разделы продукта MCA0300", overview: "Обзор", specs: "Характеристики", faq: "Вопросы и ответы", related: "Похожие продукты" },
  fr: { nav: "Sections du produit MCA0300", overview: "Présentation", specs: "Caractéristiques", faq: "FAQ", related: "Produits associés" },
  de: { nav: "MCA0300-Produktbereiche", overview: "Übersicht", specs: "Spezifikationen", faq: "FAQ", related: "Verwandte Produkte" },
  es: { nav: "Secciones del producto MCA0300", overview: "Descripción", specs: "Especificaciones", faq: "Preguntas frecuentes", related: "Productos relacionados" },
  ar: { nav: "أقسام منتج MCA0300", overview: "نظرة عامة", specs: "المواصفات", faq: "الأسئلة الشائعة", related: "منتجات ذات صلة" },
};

export function optimizeMca0300(locale: Locale, product: ProductView): ProductView {
  if (product.model !== "MCA0300" || product.slug !== `ricewind-mca0300-${locale}`) return product;
  const questions = faqQuestions[locale];
  const answers = [product.directDefinition, product.whatItIs, product.suitableFor];
  const existing = new Set(product.faqs.map(item => item.question));
  const localizedFaqs = answers.map((answer, index) => ({ question: questions[index], answer })).filter(item => item.answer.trim() && !existing.has(item.question));
  if (locale === "en") {
    return { ...product, name: "MCA0300 300W Outdoor Cabinet Air Conditioner", seoTitle: "MCA0300 300W Cabinet Air Conditioner, 220VAC | RICEWIND", seoDescription: product.directDefinition, faqs: [...product.faqs, ...localizedFaqs] };
  }
  return { ...product, seoTitle: product.seoTitle?.trim() ? product.seoTitle : product.name, seoDescription: product.seoDescription?.trim() ? product.seoDescription : product.directDefinition, faqs: [...product.faqs, ...localizedFaqs] };
}

export function aboutPageCopy(locale: Locale) {
  const content = aboutData[locale];
  if (locale !== "en") return { ...content, metaTitle: content.title, metaDescription: content.lead.length > 155 ? `${content.lead.slice(0, 152).trimEnd()}...` : content.lead };
  return { ...content, metaTitle: "About RICEWIND | Telecom Power & Cooling Supplier", metaDescription: "RICEWIND is a Hangzhou-based supplier of telecom power, precision cooling and infrastructure equipment for international B2B procurement teams.", lead: "RICEWIND is a communications and energy equipment supplier and solution integrator based in Hangzhou, China. We supply telecom power, precision cooling and infrastructure equipment for international B2B procurement teams and contractors." };
}
