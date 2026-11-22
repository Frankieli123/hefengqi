import type { Locale, ProductView } from "@/types/domain";
import { aboutData } from "@/content/about";

/** T3-01: English-first presentation only; CMS remains authoritative and unchanged. */
export function optimizeMca0300(locale: Locale, product: ProductView): ProductView {
  if (locale !== "en" || product.model !== "MCA0300" || product.slug !== "ricewind-mca0300-en") return product;
  const questions = [
    { question: "What is the MCA0300 cabinet air conditioner?", answer: product.directDefinition },
    { question: "How is the MCA0300 installed?", answer: product.whatItIs },
    { question: "Which applications is the MCA0300 suitable for?", answer: product.suitableFor },
  ].filter(item => item.answer.trim());
  const existing = new Set(product.faqs.map(item => item.question));
  return {
    ...product,
    name: "MCA0300 300W Outdoor Cabinet Air Conditioner",
    seoTitle: "MCA0300 300W Cabinet Air Conditioner, 220VAC | RICEWIND",
    // Reuse the actual published definition, without adding qualification claims.
    seoDescription: product.directDefinition,
    faqs: [...product.faqs, ...questions.filter(item => !existing.has(item.question))],
  };
}

/** T3-02: no new manufacturer, authorization, delivery or legal-entity claims. */
export function aboutPageCopy(locale: Locale) {
  const content = aboutData[locale];
  if (locale !== "en") return { ...content, metaTitle: content.title, metaDescription: content.lead };
  return {
    ...content,
    metaTitle: "About RICEWIND | Telecom Power & Cooling Supplier",
    metaDescription: "RICEWIND is a Hangzhou-based supplier of telecom power, precision cooling and infrastructure equipment for international B2B procurement teams.",
    lead: "RICEWIND is a communications and energy equipment supplier and solution integrator based in Hangzhou, China. We supply telecom power, precision cooling and infrastructure equipment for international B2B procurement teams and contractors.",
  };
}
