import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ViewTransition } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { ProductDetail } from "@/components/products/product-detail";
import { getProductAlternatePaths, getProducts, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, faqSchema, localizedMetadata, productSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale); const product = (await getProducts(locale)).find((item) => item.slug === slug); if (!product) return {}; const alternates = await getProductAlternatePaths(product.id); return localizedMetadata(locale, `/products/${slug}`, product.seoTitle ?? product.name, product.seoDescription ?? product.directDefinition, false, alternates); }

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params; assertLocale(locale); setRequestLocale(locale);
  const [products, t, common] = await Promise.all([getProducts(locale), getTranslations("products"), getTranslations("common")]);
  const product = products.find((item) => item.slug === slug); if (!product) { const moved = await getSlugRedirect(locale, `/products/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); }
  const labels = { home: common("home"), products: common("products"), inquiry: common("inquiry"), compare: common("compare"), model: t("model"), keySpecs: t("keySpecs"), what: t("what"), problem: t("problem"), who: t("who"), advantages: t("advantages"), specs: t("specs"), applications: t("applications"), faq: t("faq"), related: t("related"), updated: t("updated"), source: t("source"), noPrice: t("noPrice") };
  const schemas: Array<Record<string, unknown>> = [productSchema(locale, product), breadcrumbSchema([{ name: common("home"), path: `/${locale}` }, { name: common("products"), path: `/${locale}/products` }, { name: product.name, path: `/${locale}/products/${slug}` }])]; if (product.faqs.length) schemas.push(faqSchema(product.faqs));
  return <ViewTransition enter={{ "nav-forward": "fade-in", default: "none" }} exit={{ "nav-back": "fade-out", default: "none" }} default="none"><main id="main-content"><JsonLd data={schemas} /><ProductDetail product={product} locale={locale} labels={labels} /></main></ViewTransition>;
}
