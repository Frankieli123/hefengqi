import type { Metadata } from "next";
import type { Locale, ProductView } from "@/types/domain";
import { env } from "@/lib/env";

const siteUrl = env.SITE_URL;

export function localizedMetadata(locale: Locale, path: string, title: string, description: string, noIndex = false, alternatePaths?: Partial<Record<Locale, string>>): Metadata {
  const canonical = `${siteUrl}/${locale}${path}`;
  const languageAlternates = Object.fromEntries((["zh", "en", "ru"] as const).map((item) => [item, `${siteUrl}/${item}${alternatePaths?.[item] ?? path}`]));
  return {
    title,
    description,
    alternates: { canonical, languages: { ...languageAlternates, "x-default": `${siteUrl}/en${path}` } },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title, description, type: "website", url: canonical, siteName: "HEFENGQI", locale },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function webPageSchema(locale: Locale, path: string, name: string, description: string, type = "WebPage") {
  return { "@context": "https://schema.org", "@type": type, name, description, url: `${siteUrl}/${locale}${path}`, inLanguage: locale };
}

export function collectionPageSchema(locale: Locale, path: string, name: string, description: string, items: Array<{ name: string; path: string }> = []) {
  return {
    ...webPageSchema(locale, path, name, description, "CollectionPage"),
    mainEntity: items.length ? { "@type": "ItemList", numberOfItems: items.length, itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: `${siteUrl}/${locale}${item.path}` })) } : undefined,
  };
}

export function organizationSchema(locale: Locale) {
  return { "@context": "https://schema.org", "@type": "Organization", name: "HEFENGQI", url: `${siteUrl}/${locale}`, description: locale === "zh" ? "通信与能源设备代理及方案集成服务。" : locale === "ru" ? "Поставка и интеграция телекоммуникационного и энергетического оборудования." : "Communications and energy equipment distribution and integration services." };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${siteUrl}${item.path}` })) };
}

export function productSchema(locale: Locale, product: ProductView) {
  return { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.directDefinition, sku: product.sku, mpn: product.model, brand: { "@type": "Brand", name: product.brand }, category: product.categoryName, url: `${siteUrl}/${locale}/products/${product.slug}`, additionalProperty: product.attributes.map((attribute) => ({ "@type": "PropertyValue", name: attribute.label, value: `${attribute.value}${attribute.unit ? ` ${attribute.unit}` : ""}` })) };
}

export function faqSchema(faqs: ProductView["faqs"]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };
}
