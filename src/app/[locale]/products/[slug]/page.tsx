import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductViewTracker } from "@/components/products/product-view-tracker";
import { getProductAlternatePaths, getProductBySlug, getProductRecommendations, getSlugRedirect } from "@/lib/content-repository";
import { assertLocale } from "@/lib/locale";
import { breadcrumbSchema, faqSchema, localizedMetadata, productSchema } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; assertLocale(locale); const product = await getProductBySlug(locale, slug); if (!product) return {}; const alternates = await getProductAlternatePaths(product.id); return localizedMetadata(locale, `/products/${slug}`, product.seoTitle ?? product.name, product.seoDescription ?? product.directDefinition, false, alternates); }

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params; assertLocale(locale); setRequestLocale(locale);
  const [product, t, common] = await Promise.all([getProductBySlug(locale, slug), getTranslations("products"), getTranslations("common")]);
  if (!product) { const moved = await getSlugRedirect(locale, `/products/${slug}`); if (moved) redirect(`/${locale}${moved}`); notFound(); }
  const labels = { home: common("home"), products: common("products"), inquiry: common("inquiry"), details: common("details"), model: t("model"), keySpecs: t("keySpecs"), specValue: t("specValue"), what: t("what"), problem: t("problem"), who: t("who"), advantages: t("advantages"), specs: t("specs"), applications: t("applications"), faq: t("faq"), related: t("related"), continueExploring: t("continueExploring"), updated: t("updated"), noPrice: t("noPrice"), contactTitle: t("contactTitle"), contactDescription: t("contactDescription"), whatsappLabel: t("whatsappLabel"), emailLabel: t("emailLabel"), phoneLabel: common("phoneLabel"), serviceCommitmentTitle: t("serviceCommitmentTitle"), serviceCommitmentShort: t("serviceCommitmentShort"), shippingSteps: t("shippingSteps"), customerSatisfaction: t("customerSatisfaction"), technicalSupport: t("technicalSupport"), modelConfirmation: t("modelConfirmation"), globalCoordination: t("globalCoordination"), projectFollowUp: t("projectFollowUp") };
  const recommendations = await getProductRecommendations(locale, product);
  const breadcrumbItems = [
    { name: common("home"), path: `/${locale}` },
    { name: common("products"), path: `/${locale}/products` },
    ...(product.categoryTrail ?? []).map((category) => ({ name: category.name, path: `/${locale}/products/category/${category.path}` })),
    { name: product.name, path: `/${locale}/products/${slug}` },
  ];
  const schemas: Array<Record<string, unknown>> = [productSchema(locale, product), breadcrumbSchema(breadcrumbItems)]; if (product.faqs.length) schemas.push(faqSchema(product.faqs));
  return <main id="main-content"><JsonLd data={schemas} /><ProductViewTracker productId={product.id} /><ProductDetail product={product} locale={locale} labels={labels} recommendations={recommendations} /></main>;
}
