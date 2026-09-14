import { formatAttributeValue } from "@/lib/attribute-format";
import type { Metadata } from "next";
import { locales, type EditorialItem, type Locale, type ProductView } from "@/types/domain";
import { env } from "@/lib/env";

const siteUrl = env.SITE_URL;

export function localizedMetadata(locale: Locale, path: string, title: string, description: string, noIndex = false, alternatePaths?: Partial<Record<Locale, string>>): Metadata {
  const canonical = `${siteUrl}/${locale}${path}`;
  // Explicit CMS alternates are authoritative: do not invent missing translations.
  const languageAlternates = Object.fromEntries(locales.flatMap((item) => {
    const translatedPath = alternatePaths === undefined ? path : alternatePaths[item];
    return translatedPath !== undefined ? [[item, `${siteUrl}/${item}${translatedPath}`]] : [];
  }));
  const defaultUrl = languageAlternates.en ?? languageAlternates.zh ?? languageAlternates.ru;
  return {
    title,
    description,
    alternates: { canonical, languages: { ...languageAlternates, ...(defaultUrl ? { "x-default": defaultUrl } : {}) } },
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
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HEFENGQI",
    alternateName: ["RICEWIND", "禾风起"],
    url: `${siteUrl}/${locale}`,
    logo: `${siteUrl}/brand/hefengqi-mark.png`,
    description:
      locale === "zh"
        ? "通信与能源设备代理及方案集成服务，专注于华为、维谛、中兴、易达等电信级整流器、室外电源柜与温控系统。"
        : locale === "ru"
        ? "Поставка и интеграция телекоммуникационного и энергетического оборудования: выпрямители, уличные шкафы питания, ИБП и прецизионное охлаждение."
        : "Communications and energy equipment distributor and solution integrator specializing in Huawei, Vertiv, ZTE, and Eltek power systems.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+86 17621197907",
      contactType: "sales",
      email: "lee@ricewind.com",
      availableLanguage: ["Chinese", "English", "Russian"]
    },
    sameAs: [
      "https://www.facebook.com/1308792735648486",
      "https://wa.me/8617621197907"
    ]
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${siteUrl}${item.path}` })) };
}

export function productSchema(locale: Locale, product: ProductView) {
  const images = product.images?.length
    ? product.images.map((img) => new URL(img.src, siteUrl).href)
    : product.image?.src
    ? [new URL(product.image.src, siteUrl).href]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.directDefinition,
    sku: product.sku,
    mpn: product.model,
    brand: { "@type": "Brand", name: product.brand },
    category: product.categoryName,
    url: `${siteUrl}/${locale}/products/${product.slug}`,
    ...(images?.length ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceType: "https://schema.org/InvoicePrice",
        priceCurrency: "USD",
        description: "Official wholesale & project quotation upon inquiry."
      },
      seller: {
        "@type": "Organization",
        name: "HEFENGQI",
        url: siteUrl
      }
    },
    additionalProperty: product.attributes.map((attribute) => ({
      "@type": "PropertyValue",
      name: attribute.label,
      value: formatAttributeValue(attribute.value, attribute.unit)
    }))
  };
}

/**
 * 结构化问答标记（Google 2023+ 规范严苛收缩）：
 * 限制仅提取前 2~3 组最高优先级的核心差异化工程问答注入 FAQPage，
 * 避免单品页结构化数据过长触发 Google Spam Structured Data 滥用惩罚。
 */
export function faqSchema(faqs: ProductView["faqs"]) {
  const curatedFaqs = (faqs || []).slice(0, 3);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: curatedFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
}

export function newsArticleMetadata(locale: Locale, item: EditorialItem, alternatePaths: Partial<Record<Locale, string>>): Metadata {
  const metadata = localizedMetadata(locale, `/news/${item.slug}`, item.seoTitle || item.title, item.seoDescription || item.summary, false, alternatePaths);
  const image = item.coverImage ? { ...item.coverImage, url: new URL(item.coverImage.src, siteUrl).href } : undefined;
  return {
    ...metadata,
    authors: item.authorName?.trim() ? [{ name: item.authorName.trim() }] : undefined,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt,
      ...(image ? { images: [{ url: image.url, alt: image.alt, width: image.width, height: image.height }] } : {}),
    },
    twitter: { ...metadata.twitter, ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}) },
  };
}

export function newsArticleSchema(locale: Locale, item: EditorialItem) {
  const url = `${siteUrl}/${locale}/news/${item.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": item.newsCategory === "TUTORIAL_GUIDE" ? "TechArticle" : "Article",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: item.title,
    description: item.summary,
    inLanguage: locale,
    ...(item.publishedAt ? { datePublished: item.publishedAt } : {}),
    dateModified: item.updatedAt,
    ...(item.coverImage ? { image: [new URL(item.coverImage.src, siteUrl).href] } : {}),
    // The CMS byline identifies the actual editorial team, not an invented expert.
    ...(item.authorName?.trim() ? { author: { "@type": "Organization", name: item.authorName.trim() } } : {}),
    publisher: { "@type": "Organization", name: "HEFENGQI", url: siteUrl },
  };
}
